import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { PermissionKey } from "@/lib/rbac/catalog";
import { fmtDate, people, plural } from "@/lib/format";
import { formatINR } from "@/lib/membership/rules";
import { membershipCounts } from "@/lib/membership/load";
import { raisedByFundraiser } from "@/lib/fundraisers";
import { SPENT_STATUSES } from "@/lib/finance/rules";
import { loadInsights } from "@/lib/insights/engine";
import { searchMemory } from "@/lib/memory/search";
import { NAV, type NavItem } from "@/components/shell/nav";
import { INTENT_HELP, INTENTS, PERIOD_LABEL, matchScore, periodStart, type Intent, type Route } from "./router";

/**
 * Every copilot answer is computed here from live data. Each answer lists its
 * sources (the records and pages behind the number) so people can check it.
 */

export type Answer = {
  text: string;
  table?: { columns: string[]; rows: string[][] };
  sources: { label: string; href: string }[];
};

const DAY = 86_400_000;

/** Who may ask what — the copilot never shows data you can't see elsewhere. */
const NEEDS: Record<Intent, PermissionKey[] | null> = {
  attention: null,
  active_members: ["members.view"],
  expiring_memberships: ["members.view"],
  pending_reimbursements: ["finance.view", "finance.approve_expense"],
  top_attendance: ["events.view"],
  event_money: ["events.view", "finance.view"],
  stock_left: ["merchandise.view"],
  fundraiser_progress: ["fundraisers.view"],
  finance_summary: ["finance.view"],
  upcoming_events: null,
  my_tasks: null,
  my_membership: null,
  my_tickets: null,
  my_orders: null,
  my_access: null,
  navigate: null,
  memory: ["reports.view"],
  help: null,
};

/** What a refused question is about, and who usually looks after it. */
const AREA: Partial<Record<Intent, [area: string, owner: string]>> = {
  active_members: ["membership records", "Secretary"],
  expiring_memberships: ["membership records", "Secretary"],
  pending_reimbursements: ["finance", "Treasurer"],
  event_money: ["event finances", "Treasurer"],
  finance_summary: ["finance", "Treasurer"],
  top_attendance: ["event attendance", "Event Head"],
  stock_left: ["merch inventory", "Merchandise Manager"],
  fundraiser_progress: ["fundraiser", "Volunteer Head"],
  memory: ["the organization's internal records", "council"],
};

export function allowed(user: CurrentUser, intent: Intent) {
  const need = NEEDS[intent];
  return !need || need.some((p) => user.permissions.has(p));
}

const roleList = (user: CurrentUser) => (user.isMasterAdmin ? "Master Admin" : user.roles.map((r) => r.name).join(", ") || "member");

/** Pages the person can open that match the words in their question. */
function findPages(user: CurrentUser, words: string) {
  const terms = words
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9-]/g, "").replace(/s$/, ""))
    .filter((w) => w.length > 2 && !["where", "find", "page", "can", "how", "see", "open", "take", "add", "new"].includes(w));
  const score = (i: NavItem) => {
    const hay = `${i.label} ${i.keywords ?? ""} ${i.href.replaceAll("/", " ")}`.toLowerCase();
    return terms.filter((t) => hay.includes(t)).length;
  };
  const all = NAV.flatMap((g) => g.items);
  const canOpen = (i: NavItem) => !i.anyOf || i.anyOf.some((p) => user.permissions.has(p));
  const hits = all
    .map((i) => ({ i, s: score(i) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return { open: hits.filter((x) => canOpen(x.i)).map((x) => x.i), locked: hits.filter((x) => !canOpen(x.i)).map((x) => x.i) };
}

export async function answer(route: Route, user: CurrentUser): Promise<Answer> {
  if (!allowed(user, route.intent)) {
    const [area, owner] = AREA[route.intent] ?? ["that", "council"];
    return {
      text: `Sorry, I can't share ${area} information. Your role (${roleList(user)}) doesn't include access to it. If you need it, please ask the ${owner}.`,
      sources: [{ label: "What I can access", href: "/profile" }],
    };
  }
  const now = new Date();
  switch (route.intent) {
    case "my_membership": {
      const [me, terms] = await Promise.all([
        db.user.findUnique({ where: { id: user.id }, select: { memberNumber: true } }),
        db.membership.findMany({
          where: { userId: user.id, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
          orderBy: { createdAt: "desc" },
          select: { status: true, startDate: true, endDate: true, pricePaise: true, plan: { select: { name: true } } },
        }),
      ]);
      const current = terms.find((t) => t.status === "ACTIVE" && t.startDate && t.endDate && t.startDate <= now && t.endDate >= now);
      const next = terms.find((t) => t.status === "ACTIVE" && t.startDate && t.startDate > now);
      const pending = terms.find((t) => t.status === "PENDING_PAYMENT");
      const days = current?.endDate ? Math.ceil((current.endDate.getTime() - now.getTime()) / DAY) : null;
      const text = current
        ? `Your ${current.plan.name} membership is active until ${fmtDate(current.endDate)}` +
          (next
            ? ", and your renewal is already paid."
            : days !== null && days <= 30
              ? ` — that's ${plural(days, "day")} away, so your renewal fee is due soon.`
              : ".")
        : pending
          ? `Your ${pending.plan.name} membership is waiting for payment: ${formatINR(pending.pricePaise)} is due. Once the treasurer confirms it, your pass activates.`
          : "You don't have an active membership right now. You can join or renew from My membership.";
      return {
        text,
        table: me?.memberNumber ? { columns: ["", ""], rows: [["Member number", me.memberNumber]] } : undefined,
        sources: [{ label: "My membership", href: "/me" }],
      };
    }

    case "my_tickets": {
      const tickets = await db.ticket.findMany({
        where: { order: { buyerId: user.id }, status: { in: ["VALID", "RESERVED"] }, event: { endsAt: { gte: now } } },
        orderBy: { event: { startsAt: "asc" } },
        take: 10,
        select: { holderName: true, status: true, event: { select: { title: true, startsAt: true, venue: true } } },
      });
      return {
        text: tickets.length
          ? `You have ${plural(tickets.length, "ticket")} for upcoming events.`
          : "You don't have tickets for any upcoming event.",
        table: tickets.length
          ? {
              columns: ["Event", "When", "Holder", "Status"],
              rows: tickets.map((t) => [
                t.event.title,
                fmtDate(t.event.startsAt),
                t.holderName,
                t.status === "VALID" ? "Ready" : "Awaiting payment",
              ]),
            }
          : undefined,
        sources: [
          { label: "My tickets", href: "/me/tickets" },
          { label: "Events", href: "/events" },
        ],
      };
    }

    case "my_orders": {
      const orders = await db.merchOrder.findMany({
        where: { buyerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { orderNumber: true, status: true, totalPaise: true, createdAt: true, _count: { select: { items: true } } },
      });
      const STATUS = {
        PENDING_PAYMENT: "Awaiting payment",
        PAID: "Paid — ready soon",
        FULFILLED: "Collected",
        CANCELLED: "Cancelled",
        REFUNDED: "Refunded",
      } as const;
      return {
        text: orders.length ? `Your ${plural(orders.length, "merch order")}, newest first:` : "You haven't ordered any merch yet.",
        table: orders.length
          ? {
              columns: ["Order", "Placed", "Total", "Status"],
              rows: orders.map((o) => [o.orderNumber, fmtDate(o.createdAt), formatINR(o.totalPaise), STATUS[o.status]]),
            }
          : undefined,
        sources: [
          { label: "My orders", href: "/me/orders" },
          { label: "Merch store", href: "/merch" },
        ],
      };
    }

    case "my_access": {
      const areas = NAV.map((g) => ({
        g: g.label,
        items: g.items.filter((i) => !i.anyOf || i.anyOf.some((p) => user.permissions.has(p))).map((i) => i.label),
      })).filter((g) => g.items.length);
      return {
        text: user.isMasterAdmin
          ? `You're signed in as ${user.name}, a Master Admin — you have full access to everything, and I can answer any question about the organization.`
          : `You're signed in as ${user.name} (${roleList(user)}). You have ${plural(user.permissions.size, "permission")}; I only answer from what those let you see.`,
        table: { columns: ["Area", "What you can open"], rows: areas.map((a) => [a.g, a.items.join(", ")]) },
        sources: [{ label: "My profile & access", href: "/profile" }],
      };
    }

    case "navigate": {
      const { open, locked } = findPages(user, route.subject ?? "");
      if (open.length)
        return {
          text: open.length === 1 ? `That's on the ${open[0].label} page.` : `These pages should help — the first is the best match:`,
          sources: open.slice(0, 4).map((i) => ({ label: i.label, href: i.href })),
        };
      return {
        text: locked.length
          ? `That's on the ${locked[0].label} page, which isn't part of your access (${roleList(user)}).`
          : "I couldn't find a page for that. Try a word like events, merch, calendar or membership.",
        sources: [],
      };
    }

    case "active_members": {
      const [c, byPlan] = await Promise.all([
        membershipCounts(now),
        db.membership.groupBy({
          by: ["planId"],
          where: { status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } },
          _count: true,
        }),
      ]);
      const plans = await db.membershipPlan.findMany({
        where: { id: { in: byPlan.map((b) => b.planId) } },
        select: { id: true, name: true },
      });
      const name = new Map(plans.map((p) => [p.id, p.name]));
      return {
        text: `We have ${c.active.toLocaleString("en-IN")} active members. ${c.expiringThisWeek} expire this week and ${c.pending} sign-ups are waiting for payment confirmation.`,
        table: {
          columns: ["Plan", "Active terms"],
          rows: byPlan.sort((a, b) => b._count - a._count).map((b) => [name.get(b.planId) ?? "—", String(b._count)]),
        },
        sources: [{ label: "Active members list", href: "/members?state=active" }],
      };
    }

    case "expiring_memberships": {
      const until =
        route.period === "week" || route.period === "today"
          ? new Date(now.getTime() + 7 * DAY)
          : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const rows = await db.membership.findMany({
        where: {
          status: "ACTIVE",
          startDate: { lte: now },
          endDate: { gte: now, lt: until },
          user: { memberships: { none: { status: "ACTIVE", startDate: { gt: now } } } },
        },
        orderBy: { endDate: "asc" },
        select: { endDate: true, user: { select: { name: true, memberNumber: true } }, plan: { select: { name: true } } },
      });
      const label = route.period === "week" || route.period === "today" ? "in the next 7 days" : "before the end of this month";
      return {
        text: rows.length
          ? `${plural(rows.length, "membership")} expire ${label} and haven't been renewed.`
          : `No memberships expire ${label}.`,
        table: rows.length
          ? {
              columns: ["Member", "Plan", "Ends"],
              rows: rows.slice(0, 15).map((r) => [`${r.user.name} (${r.user.memberNumber ?? "—"})`, r.plan.name, fmtDate(r.endDate)]),
            }
          : undefined,
        sources: [{ label: "Expiring members", href: "/members?state=expiring" }],
      };
    }

    case "pending_reimbursements": {
      const [owed, waiting] = await Promise.all([
        db.expense.findMany({
          where: { status: "APPROVED", needsReimbursement: true },
          orderBy: { reviewedAt: "asc" },
          select: { description: true, amountPaise: true, reviewedAt: true, submittedBy: { select: { name: true } } },
        }),
        db.expense.aggregate({ where: { status: "PENDING" }, _count: true, _sum: { amountPaise: true } }),
      ]);
      const total = owed.reduce((s, e) => s + e.amountPaise, 0);
      return {
        text: `${people(owed.length)} ${owed.length === 1 ? "is" : "are"} waiting to be paid back, ${formatINR(total)} in total. Another ${plural(waiting._count, "claim")} (${formatINR(waiting._sum.amountPaise ?? 0)}) ${waiting._count === 1 ? "is" : "are"} waiting for approval.`,
        table: owed.length
          ? {
              columns: ["Person", "For", "Amount", "Approved"],
              rows: owed.map((e) => [e.submittedBy?.name ?? "—", e.description, formatINR(e.amountPaise), fmtDate(e.reviewedAt)]),
            }
          : undefined,
        sources: [
          { label: "To pay back", href: "/finance?tab=expenses&status=OWED" },
          { label: "Claims to review", href: "/finance?tab=expenses" },
        ],
      };
    }

    case "top_attendance": {
      const since = new Date(now.getTime() - 365 * DAY);
      const events = await db.event.findMany({
        where: { status: "PUBLISHED", endsAt: { lt: now, gte: since } },
        select: { id: true, title: true, startsAt: true, _count: { select: { tickets: { where: { checkedInAt: { not: null } } } } } },
      });
      const top = events.sort((a, b) => b._count.tickets - a._count.tickets).slice(0, 5);
      if (!top.length) return { text: "No events finished in the last 12 months.", sources: [{ label: "Events", href: "/events" }] };
      return {
        text: `${top[0].title} had the highest attendance in the last 12 months: ${top[0]._count.tickets.toLocaleString("en-IN")} people checked in.`,
        table: {
          columns: ["Event", "Date", "Checked in"],
          rows: top.map((e) => [e.title, fmtDate(e.startsAt), e._count.tickets.toLocaleString("en-IN")]),
        },
        sources: top.slice(0, 3).map((e) => ({ label: e.title, href: `/events/${e.id}` })),
      };
    }

    case "event_money": {
      const events = await db.event.findMany({ where: { status: { not: "DRAFT" } }, select: { id: true, title: true, startsAt: true } });
      const subject = route.subject ?? "";
      // Best title match; among equals prefer the most recent event that has already happened.
      const scored = events
        .map((e) => ({ ...e, score: matchScore(subject, e.title) }))
        .filter((e) => e.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score || Number(b.startsAt <= now) - Number(a.startsAt <= now) || b.startsAt.getTime() - a.startsAt.getTime(),
        );
      const e = scored[0];
      if (!e)
        return {
          text: `I couldn't find an event matching "${subject}". Try part of its name, e.g. "Diwali Gala".`,
          sources: [{ label: "Events", href: "/events" }],
        };
      const [tickets, donations, costs] = await Promise.all([
        db.payment.aggregate({
          where: { status: "PAID", purpose: "TICKET", ticketOrder: { eventId: e.id } },
          _sum: { amountPaise: true },
          _count: true,
        }),
        db.payment.aggregate({
          where: { status: "PAID", purpose: "DONATION", fundraiser: { eventId: e.id } },
          _sum: { amountPaise: true },
        }),
        user.permissions.has("finance.view")
          ? db.expense.aggregate({ where: { eventId: e.id, status: { in: [...SPENT_STATUSES] } }, _sum: { amountPaise: true } })
          : null,
      ]);
      const income = (tickets._sum.amountPaise ?? 0) + (donations._sum.amountPaise ?? 0);
      const spent = costs?._sum.amountPaise ?? null;
      const rows = [
        ["Ticket sales", formatINR(tickets._sum.amountPaise ?? 0)],
        ...(donations._sum.amountPaise ? [["Donations", formatINR(donations._sum.amountPaise)]] : []),
        ...(spent !== null
          ? [
              ["Approved costs", `− ${formatINR(spent)}`],
              ["Net", formatINR(income - spent)],
            ]
          : []),
      ];
      return {
        text:
          `${e.title} (${fmtDate(e.startsAt)}) brought in ${formatINR(income)} from ${plural(tickets._count, "ticket payment")}` +
          (spent !== null ? `. After ${formatINR(spent)} of approved costs, the net result is ${formatINR(income - spent)}.` : "."),
        table: { columns: ["", "Amount"], rows },
        sources: [
          { label: e.title, href: `/events/${e.id}` },
          ...(spent !== null ? [{ label: "Event expenses", href: "/finance?tab=expenses&status=ALL" }] : []),
        ],
      };
    }

    case "stock_left": {
      const variants = await db.productVariant.findMany({
        where: { isActive: true, product: { status: "ACTIVE" } },
        select: { size: true, color: true, stock: true, product: { select: { id: true, name: true, category: true } } },
      });
      const subject = route.subject ?? "";
      const hits = variants.filter((v) => matchScore(subject, `${v.product.name} ${v.product.category}`) >= 0.5);
      if (!hits.length)
        return {
          text: `I couldn't find merch matching "${subject}". Try "hoodies", "tees" or a product name.`,
          sources: [{ label: "Merch", href: "/merch" }],
        };
      const total = hits.reduce((s, v) => s + v.stock, 0);
      const bySize = new Map<string, number>();
      for (const v of hits) bySize.set(v.size, (bySize.get(v.size) ?? 0) + v.stock);
      const products = [...new Map(hits.map((v) => [v.product.id, v.product])).values()];
      return {
        text: `${total.toLocaleString("en-IN")} left across ${plural(products.length, "product")} (${products.map((p) => p.name).join(", ")}).`,
        table: { columns: ["Size", "In stock"], rows: [...bySize].map(([s, n]) => [s, String(n)]) },
        sources: [
          { label: "Inventory", href: "/merch/inventory" },
          ...products.slice(0, 3).map((p) => ({ label: p.name, href: `/merch/${p.id}` })),
        ],
      };
    }

    case "fundraiser_progress": {
      const list = await db.fundraiser.findMany({
        where: { status: { not: "CANCELLED" } },
        select: { id: true, title: true, goalPaise: true, endsAt: true, status: true },
      });
      const subject = route.subject ?? "";
      const pick = subject
        ? list
            .map((f) => ({ ...f, s: matchScore(subject, f.title) }))
            .filter((f) => f.s > 0)
            .sort((a, b) => b.s - a.s)
        : [];
      const chosen = pick.length ? [pick[0]] : list.filter((f) => f.status === "ACTIVE");
      const raised = await raisedByFundraiser(chosen.map((f) => f.id));
      if (!chosen.length) return { text: "There are no active fundraisers.", sources: [{ label: "Fundraisers", href: "/fundraisers" }] };
      const rows = chosen.map((f) => {
        const r = raised.get(f.id) ?? 0;
        return [f.title, formatINR(r), formatINR(f.goalPaise), `${Math.round((r / f.goalPaise) * 100)}%`, fmtDate(f.endsAt)];
      });
      const one = chosen.length === 1 ? chosen[0] : null;
      return {
        text: one
          ? `${one.title} has raised ${rows[0][1]} of its ${rows[0][2]} goal (${rows[0][3]}), ending ${rows[0][4]}.`
          : `${plural(chosen.length, "fundraiser")} ${chosen.length === 1 ? "is" : "are"} active:`,
        table: { columns: ["Fundraiser", "Raised", "Goal", "Progress", "Ends"], rows },
        sources: chosen.slice(0, 3).map((f) => ({ label: f.title, href: `/fundraisers/${f.id}` })),
      };
    }

    case "finance_summary": {
      const period = route.period ?? "month";
      const from = periodStart(period, now);
      const [inc, out, byPurpose] = await Promise.all([
        db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: from } }, _sum: { amountPaise: true } }),
        db.expense.aggregate({ where: { status: { in: [...SPENT_STATUSES] }, spentAt: { gte: from } }, _sum: { amountPaise: true } }),
        db.payment.groupBy({ by: ["purpose"], where: { status: "PAID", paidAt: { gte: from } }, _sum: { amountPaise: true } }),
      ]);
      const i = inc._sum.amountPaise ?? 0;
      const o = out._sum.amountPaise ?? 0;
      const LABEL = {
        MEMBERSHIP: "Membership dues",
        TICKET: "Ticket sales",
        MERCH: "Merch sales",
        DONATION: "Donations",
        OTHER: "Other",
      } as const;
      return {
        text: `${PERIOD_LABEL[period][0].toUpperCase()}${PERIOD_LABEL[period].slice(1)}: ${formatINR(i)} came in and ${formatINR(o)} went out, leaving ${formatINR(i - o)}.`,
        table: {
          columns: ["Income source", "Amount"],
          rows: byPurpose
            .sort((a, b) => (b._sum.amountPaise ?? 0) - (a._sum.amountPaise ?? 0))
            .map((p) => [LABEL[p.purpose], formatINR(p._sum.amountPaise ?? 0)]),
        },
        sources: [
          { label: "Income", href: "/finance?tab=income" },
          { label: "Expenses", href: "/finance?tab=expenses&status=APPROVED" },
        ],
      };
    }

    case "upcoming_events": {
      const events = await db.event.findMany({
        where: { status: "PUBLISHED", endsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 6,
        select: { id: true, title: true, startsAt: true, venue: true, capacity: true, allocated: true },
      });
      return {
        text: events.length ? `The next ${plural(events.length, "event")}:` : "No upcoming events are published yet.",
        table: events.length
          ? {
              columns: ["Event", "When", "Where", "Seats left"],
              rows: events.map((e) => [e.title, fmtDate(e.startsAt), e.venue, String(Math.max(0, e.capacity - e.allocated))]),
            }
          : undefined,
        sources: [{ label: "Events", href: "/events" }],
      };
    }

    case "my_tasks": {
      const tasks = await db.task.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" } },
        orderBy: [{ dueAt: "asc" }],
        select: { title: true, dueAt: true, status: true, fundraiser: { select: { title: true } }, event: { select: { title: true } } },
      });
      return {
        text: tasks.length ? `You have ${plural(tasks.length, "open task")}.` : "You have no open tasks.",
        table: tasks.length
          ? {
              columns: ["Task", "For", "Due"],
              rows: tasks.map((t) => [t.title, t.fundraiser?.title ?? t.event?.title ?? "—", t.dueAt ? fmtDate(t.dueAt) : "—"]),
            }
          : undefined,
        sources: [{ label: "My volunteering", href: "/me/volunteering" }],
      };
    }

    case "attention": {
      if (!user.permissions.has("analytics.view")) return answer({ ...route, intent: "my_tasks" }, user);
      const { insights } = await loadInsights(user, now);
      const urgent = insights.filter((i) => i.severity === "critical" || i.severity === "warning");
      return {
        text: urgent.length
          ? `${plural(urgent.length, "thing")} need${urgent.length === 1 ? "s" : ""} attention, most urgent first:`
          : "Nothing urgent — the checks found no problems.",
        table: urgent.length
          ? {
              columns: ["", "What", "Why"],
              rows: urgent.slice(0, 8).map((i) => [i.severity === "critical" ? "Urgent" : "Watch", i.title, i.why]),
            }
          : undefined,
        sources: [{ label: "All insights", href: "/insights" }],
      };
    }

    case "memory": {
      const { hits } = await searchMemory(route.subject ?? "", now);
      if (!hits.length)
        return {
          text: "I couldn't find anything about that in the organization's memory.",
          sources: [{ label: "Memory", href: "/memory" }],
        };
      return {
        text: "Here's what the organization's memory has, most relevant first:",
        table: { columns: ["", "What", "Details"], rows: hits.slice(0, 5).map((h) => [h.kind, h.title, h.text]) },
        sources: [
          { label: "Search memory", href: `/memory?q=${encodeURIComponent(route.subject ?? "")}` },
          ...hits
            .slice(0, 3)
            .filter((h) => h.href)
            .map((h) => ({ label: h.title, href: h.href! })),
        ],
      };
    }

    case "help":
    default: {
      // Maybe they named a page ("calendar", "volunteering") — point to it.
      const pages = findPages(user, route.subject ?? "").open;
      if (pages.length) return answer({ ...route, intent: "navigate" }, user);
      return {
        text: "I answer questions from the organization's own data, and show where each number comes from. Try one of these:",
        table: { columns: ["You can ask"], rows: INTENTS.filter((i) => i !== "help" && allowed(user, i)).map((i) => [INTENT_HELP[i]]) },
        sources: [],
      };
    }
  }
}
