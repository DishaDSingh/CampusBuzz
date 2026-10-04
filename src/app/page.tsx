import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowRightIcon, CalendarDaysIcon, CheckIcon, MapPinIcon, MegaphoneIcon, ShirtIcon, TicketIcon, UsersIcon } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Logo } from "@/components/shell/logo";
import { PhotoMockup } from "@/components/merch/mockup";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { mockupProps } from "@/lib/merch/art";
import { formatINR } from "@/lib/membership/rules";
import { fmtDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const org = await db.organization.findFirst({ select: { name: true, description: true } });
  return { title: org?.name ?? "CampusBuzz", description: org?.description ?? undefined };
}

const priceRange = (prices: number[]) => {
  if (!prices.length) return null;
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  if (hi === 0) return "Free";
  return lo === hi ? formatINR(lo) : `${formatINR(lo)} – ${formatINR(hi)}`;
};

/**
 * The club's public website: what's coming up, how to join, the latest news
 * and a mailing list. Signed-in people go straight to their dashboard.
 */
export default async function Home() {
  await connection();
  const org = await db.organization.findFirst();
  if (!org) redirect("/setup");
  if (await getCurrentUser()) redirect("/dashboard");

  const now = new Date();
  const [events, plans, news, products, members] = await Promise.all([
    db.event.findMany({
      where: { status: "PUBLISHED", endsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        category: true,
        startsAt: true,
        venue: true,
        capacity: true,
        allocated: true,
        ticketTypes: { where: { isActive: true }, select: { memberPricePaise: true, publicPricePaise: true, membersOnly: true } },
      },
    }),
    db.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        durationMonths: true,
        pricePaise: true,
        benefits: { select: { benefit: { select: { title: true } } }, take: 4 },
      },
    }),
    // Only announcements addressed to everyone are public.
    db.announcement.findMany({
      where: { status: "PUBLISHED", audience: "ALL" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, title: true, body: true, publishedAt: true },
    }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      take: 4,
      include: {
        design: {
          select: {
            productType: true,
            baseColor: true,
            inkColor: true,
            artworkSvg: true,
            logoUploadId: true,
            frontText: true,
            backText: true,
          },
        },
        variants: { where: { isActive: true }, select: { colorHex: true }, take: 1 },
      },
    }),
    db.membership.count({ where: { status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } } }),
  ]);

  return (
    <div className="min-h-svh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden gap-5 text-sm text-slate-600 md:flex dark:text-slate-300">
            <a href="#events" className="hover:text-slate-900 dark:hover:text-white">
              Events
            </a>
            <a href="#membership" className="hover:text-slate-900 dark:hover:text-white">
              Membership
            </a>
            <a href="#merch" className="hover:text-slate-900 dark:hover:text-white">
              Merch
            </a>
            <a href="#news" className="hover:text-slate-900 dark:hover:text-white">
              News
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/10">
              Sign in
            </Link>
            <Link
              href="/join"
              className="rounded-full bg-linear-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/25"
            >
              Join the club
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-700/25" />
        <div aria-hidden className="absolute top-10 -right-24 size-[24rem] rounded-full bg-amber-200/60 blur-3xl dark:bg-amber-500/10" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              <UsersIcon className="size-3.5" /> {members.toLocaleString("en-IN")} active members
              {org.institution ? ` · ${org.institution}` : ""}
            </p>
            <h1 className="font-heading mt-5 text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">{org.name}</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
              {org.description ??
                "Events, friendships and a community that makes campus feel like home. Join us, get member prices, and never miss what's on."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/join"
                className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/30"
              >
                Become a member <ArrowRightIcon className="size-4" />
              </Link>
              <a
                href="#events"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 font-semibold hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <TicketIcon className="size-4" /> Get event tickets
              </a>
            </div>
          </div>
          {events[0] && (
            <Link
              href={`/login?next=/events/${events[0].id}`}
              className="group relative self-center overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-white shadow-2xl shadow-violet-500/30"
            >
              <p className="text-xs font-semibold tracking-wide text-amber-200 uppercase">Next up</p>
              <p className="font-heading mt-2 text-3xl font-semibold">{events[0].title}</p>
              <p className="mt-3 flex items-center gap-2 text-white/85">
                <CalendarDaysIcon className="size-4" /> {fmtDate(events[0].startsAt)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-white/85">
                <MapPinIcon className="size-4" /> {events[0].venue}
              </p>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/30 transition group-hover:bg-white/25">
                Get tickets <ArrowRightIcon className="size-4" />
              </p>
            </Link>
          )}
        </div>
      </section>

      {/* ── Events ── */}
      <section id="events" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <h2 className="font-heading text-3xl font-semibold">Upcoming events</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Members pay less. Book online, check in with a QR code at the door.</p>
        {events.length ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => {
              const member = priceRange(e.ticketTypes.map((t) => t.memberPricePaise));
              const others = priceRange(e.ticketTypes.filter((t) => !t.membersOnly).map((t) => t.publicPricePaise));
              const left = Math.max(0, e.capacity - e.allocated);
              return (
                <li key={e.id}>
                  <Link
                    href={`/login?next=/events/${e.id}`}
                    className="flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="text-xs font-semibold tracking-wide text-violet-600 uppercase dark:text-violet-300">{e.category}</p>
                    <p className="mt-1 text-lg font-semibold">{e.title}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <CalendarDaysIcon className="size-4" /> {fmtDate(e.startsAt)}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <MapPinIcon className="size-4" /> {e.venue}
                    </p>
                    <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1 border-t pt-3 text-sm dark:border-white/10">
                      {member && (
                        <span>
                          <span className="block text-xs text-slate-500">Members</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">{member}</span>
                        </span>
                      )}
                      {others && (
                        <span>
                          <span className="block text-xs text-slate-500">Others</span>
                          <span className="font-semibold">{others}</span>
                        </span>
                      )}
                      <span className={`ml-auto text-xs font-medium ${left < 25 ? "text-rose-600" : "text-slate-500"}`}>
                        {left ? `${left} seats left` : "Sold out"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 text-slate-500">New events are announced soon — join the mailing list below.</p>
        )}
      </section>

      {/* ── Membership ── */}
      <section id="membership" className="scroll-mt-20 bg-slate-50 py-14 dark:bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-semibold">Membership</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            A digital member pass, member prices on tickets and merch, and first access to events.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p, i) => (
              <li
                key={p.id}
                className={`flex flex-col rounded-2xl border bg-white p-5 dark:border-white/10 dark:bg-slate-900 ${i === 1 ? "ring-2 ring-violet-500" : ""}`}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{formatINR(p.pricePaise)}</p>
                <p className="text-sm text-slate-500">
                  {p.durationMonths >= 12
                    ? `${p.durationMonths / 12} year${p.durationMonths > 12 ? "s" : ""}`
                    : `${p.durationMonths} months`}
                </p>
                <ul className="mt-4 grid gap-1.5 text-sm">
                  {p.benefits.map((b) => (
                    <li key={b.benefit.title} className="flex gap-2">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {b.benefit.title}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/join"
                  className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
                >
                  Join with {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Merch ── */}
      {products.length > 0 && (
        <section id="merch" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="font-heading text-3xl font-semibold">Official merch</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Order from your phone, pay by UPI, collect at the desk. Members save 15%.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((p) => {
              // Uploaded logos need a sign-in to view; the public site shows designed artwork only.
              const art = mockupProps({ ...p, design: p.design && { ...p.design, logoUploadId: null } });
              return (
                <li key={p.id}>
                  <Link href={`/login?next=/merch/${p.id}`} className="group block overflow-hidden rounded-2xl border dark:border-white/10">
                    <PhotoMockup type={art.type} color={art.color} {...art.front} crop="square" className="rounded-none" />
                    <div className="flex items-baseline justify-between gap-2 p-3">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatINR(p.publicPricePaise)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── News + mailing list ── */}
      <section id="news" className="scroll-mt-20 bg-slate-50 py-14 dark:bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-heading flex items-center gap-2 text-3xl font-semibold">
              <MegaphoneIcon className="size-6 text-violet-600" /> Latest news
            </h2>
            {news.length ? (
              <ol className="mt-6 grid gap-4">
                {news.map((n) => (
                  <li key={n.id} className="rounded-2xl border bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                    <p className="text-xs text-slate-500">{fmtDate(n.publishedAt)}</p>
                    <p className="mt-1 font-semibold">{n.title}</p>
                    <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">{n.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 text-slate-500">No public announcements yet.</p>
            )}
          </div>
          <div className="self-start rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-white shadow-xl shadow-violet-500/20">
            <p className="font-heading text-2xl font-semibold">Never miss an update</p>
            <p className="mt-2 text-white/85">
              One email when there&apos;s news — events, deadlines, changes of plan. No more hunting through WhatsApp groups.
            </p>
            <div className="mt-5">
              <SubscribeForm />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-sm text-slate-500 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 sm:px-6">
          <span className="flex items-center gap-1.5">
            <ShirtIcon className="size-4" /> {org.name}
          </span>
          {org.email && <a href={`mailto:${org.email}`}>{org.email}</a>}
          {org.phone && <span>{org.phone}</span>}
          {org.address && <span>{org.address}</span>}
          <span className="ml-auto">Powered by CampusBuzz</span>
        </div>
      </footer>
    </div>
  );
}
