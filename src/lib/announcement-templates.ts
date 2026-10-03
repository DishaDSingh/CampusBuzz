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
