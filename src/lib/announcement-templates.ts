/**
 * Ready-made announcement messages. Picking an audience suggests the right
 * one ("membership ends today" → fees-due reminder), so admins rarely start
 * from a blank page. Every template is a normal draft: edit before sending.
 * `[add …]` placeholders must be filled in before it can be sent.
 */

export const AUDIENCE_KEYS = ["MEMBERS", "TODAY", "EXPIRING", "VOLUNTEERS", "ALL"] as const;
export type AudienceKey = (typeof AUDIENCE_KEYS)[number];

export const AUDIENCE_LABEL: Record<AudienceKey, string> = {
  MEMBERS: "Active members",
  TODAY: "Membership ends today",
  EXPIRING: "Membership ends this week",
  VOLUNTEERS: "Volunteers",
  ALL: "Everyone with an account",
};

export type Template = { key: string; label: string; title: string; body: string; audience: AudienceKey };

export function templates(org: string): Template[] {
  return [
    {
      key: "fees-today",
      label: "Fees due today",
      audience: "TODAY",
      title: "Your membership fee is due today",
      body: `Hi,\n\nYour ${org} membership ends today. Renew now to keep your member pass, member ticket prices and merch discounts without a break.\n\nHow to renew: open CampusBuzz → My membership → Renew, then pay by UPI (or cash at the help desk).\n\nRenewal fee: [add amount]\n\nThank you for being part of ${org}!`,
    },
    {
      key: "fees-week",
      label: "Renewal reminder (this week)",
      audience: "EXPIRING",
      title: "Your membership ends this week — renew in two minutes",
      body: `Hi,\n\nA quick reminder that your ${org} membership ends this week. Renew before it lapses to keep your digital pass and member prices.\n\nRenew from CampusBuzz → My membership → Renew (UPI or cash at the help desk).\n\nRenewal fee: [add amount]\nLast day: [add date]\n\nSee you at the next event!`,
    },
    {
      key: "event",
      label: "Event reminder",
      audience: "MEMBERS",
      title: "Reminder: [add event name] is coming up",
      body: `Hi everyone,\n\n[add event name] is on [add date] at [add time], [add venue].\n\nMembers get special ticket prices — book from the Events page and keep your QR ticket ready at the door.\n\nSee you there!\n— ${org}`,
    },
    {
      key: "volunteer",
      label: "Volunteer call",
      audience: "VOLUNTEERS",
      title: "Volunteers needed for [add event name]",
      body: `Hi volunteers,\n\nWe need help with set-up, check-in and the stalls for [add event name] on [add date].\n\nPick the tasks and times that suit you from the Volunteering page — even two hours makes a difference.\n\nThank you!\n— ${org}`,
    },
    {
      key: "welcome",
      label: "Welcome new members",
      audience: "MEMBERS",
      title: `Welcome to ${org}! 🎉`,
      body: `Hi and welcome!\n\nYour digital member pass is ready in CampusBuzz → My membership. Show it at events for member prices and entry.\n\nCheck the calendar for what's coming up, and say hi to the committee at the next event.\n\n— ${org}`,
    },
    {
      key: "general",
      label: "General update",
      audience: "ALL",
      title: "[add a short headline]",
      body: `Hi everyone,\n\n[add your message]\n\nQuestions? Reply to the committee or ask at the help desk.\n\n— ${org}`,
    },
  ];
}

/** The template suggested when an audience is picked. */
export const suggestedTemplate: Record<AudienceKey, string> = {
  TODAY: "fees-today",
  EXPIRING: "fees-week",
  VOLUNTEERS: "volunteer",
  MEMBERS: "event",
  ALL: "general",
};

// ─── Event announcements ─────────────────────────────────────────────────────

export type EventFacts = {
  title: string;
  category?: string | null;
  startsAt: Date;
  endsAt: Date;
  venue: string;
  description: string | null;
  salesOpenAt: Date | null;
  organizer: string | null;
  ticketTypes: { name: string; memberPricePaise: number; publicPricePaise: number }[];
};

const rupees = (p: number) => (p === 0 ? "Free" : `₹${(p / 100).toLocaleString("en-IN")}`);
const when = (d: Date) =>
  d.toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

/** An opening line that suits the kind of event. */
const OPENERS: Record<string, (t: string) => string> = {
  Gala: (t) => `Get ready for a night to remember — ${t} is almost here!`,
  Cultural: (t) => `Celebrate with us at ${t}, a showcase of music, colour and culture.`,
  Workshop: (t) => `Learn something new at ${t}, a hands-on session for everyone.`,
  Tech: (t) => `Calling all builders and curious minds — ${t} is coming up!`,
  Sports: (t) => `Lace up and get ready to compete — ${t} is on!`,
  Social: (t) => `Take a break and come hang out with us at ${t}.`,
  Talk: (t) => `Don't miss ${t}, an inspiring session you won't want to skip.`,
  Fundraiser: (t) => `Join us at ${t} and help raise funds for a great cause.`,
};

/** Things people look for, picked out of the organizer's notes into a highlights list. */
const HIGHLIGHTS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/teams? of (\d+)/i, (m) => `👥 Register as a team of ${m[1]}`],
  [/prizes?|trophy|trophies|rewards?|goodies/i, () => "🏆 Exciting prizes for the winners"],
  [/certificates?/i, () => "📜 Certificates for all participants"],
  [/dress ?code[:\s-]*(?:is\s+)?([a-z][a-z\s-]{2,30})/i, (m) => `👗 Dress code: ${m[1].trim().replace(/\s+(and|with|plus)$/i, "")}`],
  [/food|snacks?|dinner|lunch|refreshments?|stalls?/i, () => "🍲 Food and refreshments"],
  [/live (music|band|performances?)|dj\b|concert/i, () => "🎶 Live music and performances"],
  [/laptops?/i, () => "💻 Bring your laptop"],
  [/free (entry|for members)/i, () => "🎟 Free entry for members"],
  [/(guest|chief|keynote) (speaker|guest)/i, () => "🎤 Special guest speaker"],
  [/limited (seats|spots|entries)/i, () => "⏳ Limited seats — book early"],
];

const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const capped = t[0].toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
};

/**
 * Turns the organizer's rough notes ("cricket football relay, teams of 5,
 * prizes") into a proper paragraph plus a highlights list. Works offline;
 * nothing is invented beyond the notes and the event's own category.
 */
export function writeEventCopy(e: Pick<EventFacts, "title" | "category" | "description">, notes: string) {
  const raw = (notes.trim() || e.description?.trim() || "").replace(/\s+/g, " ");
  const opener = (OPENERS[e.category ?? ""] ?? ((t: string) => `We're excited to announce ${t}!`))(e.title);
  if (!raw) return { intro: opener, details: "[add what makes this event special]", highlights: [] as string[] };
  const details = raw
    .split(/(?<=[.!?])\s+|\n+|;\s*/)
    .map(sentence)
    .filter(Boolean)
    .join(" ");
  const highlights = [...new Set(HIGHLIGHTS.map(([re, f]) => raw.match(re) && f(raw.match(re)!)).filter((h): h is string => !!h))];
  return { intro: opener, details, highlights };
}

/**
 * The official event announcement: every fact (date, venue, prices, how to
 * book) comes from the event itself; the organizer's notes become the
 * description and highlights. AI may polish the wording but never the facts.
 */
export function eventTemplate(e: EventFacts, prompt: string, orgName: string, polished?: string) {
  const sameDay = e.startsAt.toDateString() === e.endsAt.toDateString();
  const time = sameDay
    ? `${when(e.startsAt)} – ${e.endsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
    : `${when(e.startsAt)} to ${when(e.endsAt)}`;
  const tickets = e.ticketTypes.length
    ? e.ticketTypes
        .map((t) =>
          t.memberPricePaise === t.publicPricePaise
            ? `• ${t.name}: ${rupees(t.publicPricePaise)}`
            : `• ${t.name}: ${rupees(t.memberPricePaise)} for members, ${rupees(t.publicPricePaise)} for others`,
        )
        .join("\n")
    : "• [add ticket prices]";
  const copy = writeEventCopy(e, prompt);
  return {
    title: `📣 ${e.title} — ${e.startsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`.slice(0, 120),
    body: [
      "Hi everyone,",
      copy.intro,
      polished?.trim() || copy.details,
      ...(copy.highlights.length ? [`✨ Highlights\n${copy.highlights.map((h) => `• ${h}`).join("\n")}`] : []),
      `🗓 When: ${time}\n📍 Where: ${e.venue}`,
      `🎟 Tickets\n${tickets}${e.salesOpenAt && e.salesOpenAt > new Date() ? `\nSales open ${when(e.salesOpenAt)}.` : ""}`,
      `🎫 Book your seat on CampusBuzz: open Events → ${e.title}.`,
      `See you there!\n— ${e.organizer ? `${e.organizer}, on behalf of ` : ""}${orgName}`,
    ].join("\n\n"),
  };
}
