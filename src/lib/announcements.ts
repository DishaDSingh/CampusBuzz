import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { structured } from "@/lib/ai/claude";
import type { Prisma } from "@/generated/prisma/client";
import { AUDIENCE_LABEL, eventTemplate, type AudienceKey, type EventFacts } from "@/lib/announcement-templates";

/**
 * Announcements (Phase 22) — and the clearest example of the AI principle
 * (Phase 24): AI may *draft*, a person edits, and only someone with
 * announcements.publish can send, after seeing exactly how many people
 * will be notified.
 */

/** EVENT = everyone taking part in one event; only for announcements linked to an event. */
export const AUDIENCES = { ...AUDIENCE_LABEL, EVENT: "Everyone taking part in the event" } as const;
export type Audience = AudienceKey | "EVENT";

/** People taking part in an event: ticket buyers, its volunteers and its organizer. */
export function participantWhere(eventId: string): Prisma.UserWhereInput {
  return {
    status: "ACTIVE",
    OR: [
      { ticketOrders: { some: { eventId, status: { in: ["PAID", "PENDING_PAYMENT"] } } } },
      { tasksAssigned: { some: { eventId } } },
      { eventsOrganized: { some: { id: eventId } } },
    ],
  };
}

/** Who an announcement reaches — the same query is used to count and to send. */
export function audienceWhere(a: Audience, now = new Date(), eventId?: string | null): Prisma.UserWhereInput {
  const active: Prisma.UserWhereInput = { status: "ACTIVE" };
  // Without an event, nobody: an EVENT announcement must be linked to one.
  if (a === "EVENT") return eventId ? participantWhere(eventId) : { id: { in: [] } };
  if (a === "MEMBERS") return { ...active, memberships: { some: { status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } } } };
  if (a === "TODAY") {
    // Ends before midnight tonight and not already renewed.
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return {
      ...active,
      AND: [
        { memberships: { some: { status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now, lt: midnight } } } },
        { memberships: { none: { status: "ACTIVE", startDate: { gt: now } } } },
      ],
    };
  }
  if (a === "EXPIRING") {
    // Same rule as the renewal insight: ends within 7 days and not already renewed.
    const week = new Date(now.getTime() + 7 * 86_400_000);
    return {
      ...active,
      AND: [
        { memberships: { some: { status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now, lte: week } } } },
        { memberships: { none: { status: "ACTIVE", startDate: { gt: now } } } },
      ],
    };
  }
  if (a === "VOLUNTEERS") return { ...active, volunteerProfile: { isActive: true } };
  return active;
}

export const countAudience = (a: Audience, eventId?: string | null) => db.user.count({ where: audienceWhere(a, new Date(), eventId) });

const Draft = z.object({
  title: z.string().describe("Short, specific headline (max 80 characters)."),
  body: z.string().describe("Friendly announcement, 2–5 short paragraphs or a short list. Plain text, no markdown headings."),
});

/** AI drafts from a brief; without AI, a tidy template built from the brief. Always a draft. */
export async function draftFromBrief(brief: string, orgName: string, useAi = true) {
  const ai = useAi
    ? await structured({
        schema: Draft,
        system: `You write announcements for ${orgName}, a student organisation in India. Warm, clear, short. Use only facts in the brief — never invent dates, prices, venues or names. If something important is missing, write [add …] as a placeholder.`,
        content: `Brief: ${brief}`,
        effort: "low",
        maxTokens: 1500,
      })
    : null;
  if (ai?.ok) return { ...ai.data, title: ai.data.title.slice(0, 120), source: "ai" as const };
  const first = brief.split(/[.!?\n]/)[0].trim();
  return {
    title: (first.charAt(0).toUpperCase() + first.slice(1)).slice(0, 80),
    body: `Hi everyone,\n\n${brief.trim()}\n\nQuestions? Reply to the committee or ask at the help desk.\n\n— ${orgName}`,
    source: "template" as const,
  };
}

/** Published announcements this person may read: their audiences, plus events they take part in. */
export async function visibleAnnouncementsWhere(userId: string): Promise<Prisma.AnnouncementWhereInput> {
  const audiences = await audiencesFor(userId);
  return {
    status: "PUBLISHED",
    OR: [
      { audience: { in: audiences } },
      {
        audience: "EVENT",
        event: {
          OR: [
            { orders: { some: { buyerId: userId, status: { in: ["PAID", "PENDING_PAYMENT"] } } } },
            { tasks: { some: { assigneeId: userId } } },
            { organizerId: userId },
          ],
        },
      },
    ],
  };
}

const Polish = z.object({ highlight: z.string().describe("2–3 warm sentences about the event, using only the organizer's notes.") });

/** Official template + (optionally) an AI-polished highlight paragraph from the organizer's prompt. */
export async function draftEventAnnouncement(e: EventFacts, prompt: string, orgName: string, useAi: boolean) {
  let highlight = prompt;
  let source: "ai" | "template" = "template";
  if (useAi && prompt.trim()) {
    const ai = await structured({
      schema: Polish,
      system: `You write the highlight paragraph of an official event announcement for ${orgName}, a student organisation in India. Warm and short. Use only the organizer's notes and the event title — never invent dates, prices, venues, names or guests.`,
      content: `Event: ${e.title}\nOrganizer's notes: ${prompt}`,
      effort: "low",
      maxTokens: 600,
    });
    if (ai.ok) {
      highlight = ai.data.highlight;
      source = "ai";
    }
  }
  return { ...eventTemplate(e, highlight, orgName), source };
}

/** Which audiences a person is in — they only see announcements addressed to them. */
export async function audiencesFor(userId: string): Promise<Audience[]> {
  const groups: Audience[] = ["MEMBERS", "EXPIRING", "VOLUNTEERS"];
  const inGroup = await Promise.all(groups.map((a) => db.user.count({ where: { id: userId, ...audienceWhere(a) } })));
  return ["ALL", ...groups.filter((_, i) => inGroup[i] > 0)];
}
