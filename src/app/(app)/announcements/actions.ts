"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, guardedAction, ok } from "@/lib/action";
import { people } from "@/lib/format";
import { AUDIENCES, audienceWhere, countAudience, draftEventAnnouncement, draftFromBrief, type Audience } from "@/lib/announcements";
import { aiConfigured } from "@/lib/ai/claude";
import {
  draftAnnouncementSchema,
  eventAnnouncementSchema,
  publishAnnouncementSchema,
  returnAnnouncementSchema,
  saveAnnouncementSchema,
  submitAnnouncementSchema,
} from "@/lib/validation/schemas";

/** Drafts and announcements waiting for approval can still be edited; sent ones can't. */
const EDITABLE = ["DRAFT", "PENDING"];

const refresh = (a: { id: string; eventId: string | null }) => {
  revalidatePath("/announcements");
  revalidatePath(`/announcements/${a.id}`);
  if (a.eventId) revalidatePath(`/events/${a.eventId}`);
};

/** ANALYZE → PROPOSE: create a draft. Nothing is sent. */
export const draftAnnouncement = guardedAction(
  { permission: "announcements.create", schema: draftAnnouncementSchema },
  async (input, actor) => {
    const org = await db.organization.findFirst({ select: { name: true } });
    const d =
      input.title && input.body
        ? { title: input.title, body: input.body, source: "template" as const }
        : await draftFromBrief(input.brief, org?.name ?? "the committee", input.useAi && aiConfigured());
    const a = await db.$transaction(async (tx) => {
      const a = await tx.announcement.create({
        data: { title: d.title, body: d.body, audience: input.audience, source: d.source, createdById: actor.id },
      });
      await audit(tx, {
        actor,
        action: d.source === "ai" ? "announcement.ai_draft" : "announcement.draft",
        entityType: "Announcement",
        entityId: a.id,
        summary: `${d.source === "ai" ? "AI drafted" : "Drafted"} announcement "${a.title}" (not sent)`,
      });
      return a;
    });
    revalidatePath("/announcements");
    return ok({ id: a.id }, d.source === "ai" ? "AI wrote a draft — review it before sending" : "Draft created — edit it before sending");
  },
);

/**
 * An event's announcement, written in the official template from the event's
 * own facts plus the organizer's prompt. Re-running it replaces the unsent draft.
 */
export const draftEventAnnouncementAction = guardedAction(
  { permission: "announcements.create", schema: eventAnnouncementSchema },
  async ({ eventId, prompt, useAi }, actor) => {
    const [event, org] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          category: true,
          startsAt: true,
          endsAt: true,
          venue: true,
          description: true,
          salesOpenAt: true,
          status: true,
          organizer: { select: { name: true } },
          ticketTypes: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: { name: true, memberPricePaise: true, publicPricePaise: true },
          },
        },
      }),
      db.organization.findFirst({ select: { name: true } }),
    ]);
    if (!event) return fail("Event not found.");
    if (event.status === "CANCELLED") return fail("This event was cancelled.");
    const d = await draftEventAnnouncement(
      { ...event, organizer: event.organizer?.name ?? null },
      prompt,
      org?.name ?? "the committee",
      useAi && aiConfigured(),
    );
    // Before anyone has a ticket, invite all members; afterwards, tell the participants.
    const audience: Audience = (await countAudience("EVENT", event.id)) > 1 ? "EVENT" : "MEMBERS";
    const existing = await db.announcement.findFirst({
      where: { eventId, status: { in: EDITABLE } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const a = await db.$transaction(async (tx) => {
      const data = { title: d.title, body: d.body, source: d.source, status: "DRAFT", reviewNote: null, submittedAt: null };
      const a = existing
        ? await tx.announcement.update({ where: { id: existing.id }, data })
        : await tx.announcement.create({ data: { ...data, audience, eventId, createdById: actor.id } });
      await audit(tx, {
        actor,
        action: d.source === "ai" ? "announcement.ai_draft" : "announcement.draft",
        entityType: "Announcement",
        entityId: a.id,
        summary: `Drafted the announcement for ${event.title} from the official template (not sent)`,
      });
      return a;
    });
    refresh(a);
    return ok(
      { id: a.id, title: a.title, body: a.body, audience: a.audience },
      "Announcement drafted — check it, then send it for approval",
    );
  },
);

/** HUMAN REVIEWS: edit the draft (the author, or the approver while it waits). */
export const saveAnnouncement = guardedAction(
  { permission: "announcements.create", schema: saveAnnouncementSchema },
  async (input, actor) => {
    const a = await db.announcement.findUnique({ where: { id: input.announcementId } });
    if (!a) return fail("Announcement not found.");
    if (!EDITABLE.includes(a.status)) return fail("Sent announcements can't be edited.");
    if (input.audience === "EVENT" && !a.eventId) return fail("Only an event's announcement can go to its participants.");
    await db.$transaction(async (tx) => {
      await tx.announcement.update({ where: { id: a.id }, data: { title: input.title, body: input.body, audience: input.audience } });
      await audit(tx, {
        actor,
        action: "announcement.edit",
        entityType: "Announcement",
        entityId: a.id,
        summary: `Edited ${a.status === "PENDING" ? "announcement waiting for approval" : "draft"} "${input.title}"`,
      });
    });
    refresh(a);
    return ok(undefined, a.status === "PENDING" ? "Changes saved" : "Draft saved");
  },
);

/** The author is happy with it: hand it to someone who can approve and send. */
export const submitAnnouncement = guardedAction(
  { permission: "announcements.create", schema: submitAnnouncementSchema },
  async ({ announcementId }, actor) => {
    const a = await db.announcement.findUnique({ where: { id: announcementId } });
    if (!a) return fail("Announcement not found.");
    if (a.status !== "DRAFT") return fail(a.status === "PENDING" ? "It's already waiting for approval." : "This was already sent.");
    if (/\[add[^\]]*\]/i.test(a.body)) return fail("Fill in the [add …] placeholders first.");
    const approvers = await db.user.findMany({
      where: {
        status: "ACTIVE",
        id: { not: actor.id },
        OR: [{ isMasterAdmin: true }, { roles: { some: { role: { permissions: { some: { permissionKey: "announcements.publish" } } } } } }],
      },
      select: { id: true },
    });
    await db.$transaction(async (tx) => {
      await tx.announcement.update({ where: { id: a.id }, data: { status: "PENDING", submittedAt: new Date(), reviewNote: null } });
      await tx.notification.createMany({
        data: approvers.map((u) => ({
          userId: u.id,
          type: "announcement_approval",
          title: `Approval needed: ${a.title}`,
          body: `${actor.name} sent an announcement for approval.`,
          link: `/announcements/${a.id}`,
          dedupeKey: `announcement-approval:${a.id}:${u.id}:${Date.now()}`,
        })),
      });
      await audit(tx, {
        actor,
        action: "announcement.submit",
        entityType: "Announcement",
        entityId: a.id,
        summary: `Sent "${a.title}" for approval`,
      });
    });
    refresh(a);
    return ok(undefined, "Sent to the admins for approval");
  },
);

/** The approver wants changes: back to the author with a note. */
export const returnAnnouncement = guardedAction(
  { permission: "announcements.publish", schema: returnAnnouncementSchema },
  async ({ announcementId, note }, actor) => {
    const a = await db.announcement.findUnique({ where: { id: announcementId } });
    if (!a) return fail("Announcement not found.");
    if (a.status !== "PENDING") return fail("It isn't waiting for approval.");
    await db.$transaction(async (tx) => {
      await tx.announcement.update({ where: { id: a.id }, data: { status: "DRAFT", reviewNote: note } });
      if (a.createdById && a.createdById !== actor.id)
        await tx.notification.create({
          data: {
            userId: a.createdById,
            type: "announcement_returned",
            title: `Changes requested: ${a.title}`,
            body: note,
            link: a.eventId ? `/events/${a.eventId}` : `/announcements/${a.id}`,
          },
        });
      await audit(tx, {
        actor,
        action: "announcement.return",
        entityType: "Announcement",
        entityId: a.id,
        summary: `Asked for changes to "${a.title}": ${note}`,
      });
    });
    refresh(a);
    return ok(undefined, "Sent back with your note");
  },
);

/**
 * CONFIRM → EXECUTE (= approve): only a publisher, only after confirming the
 * exact recipient count they were shown. If the audience changed meanwhile, ask again.
 */
export const publishAnnouncement = guardedAction(
  { permission: "announcements.publish", schema: publishAnnouncementSchema },
  async (input, actor) => {
    const a = await db.announcement.findUnique({ where: { id: input.announcementId } });
    if (!a) return fail("Announcement not found.");
    if (!EDITABLE.includes(a.status)) return fail("This was already sent.");
    if (a.eventId) {
      const ev = await db.event.findUnique({ where: { id: a.eventId }, select: { status: true } });
      if (ev?.status !== "PUBLISHED") return fail("Publish the event first, so people can open it from the announcement.");
    }
    const where = audienceWhere(a.audience as Audience, new Date(), a.eventId);
    const users = await db.user.findMany({ where, select: { id: true } });
    if (users.length !== input.confirmRecipients)
      return fail(`The audience changed — it's now ${people(users.length)}. Please confirm again.`);

    const sent = await db.$transaction(async (tx) => {
      const { count } = await tx.announcement.updateMany({
        where: { id: a.id, status: { in: EDITABLE } },
        data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actor.id, recipients: users.length, reviewNote: null },
      });
      if (!count) return false;
      await tx.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: "announcement",
          title: a.title,
          body: a.body.slice(0, 180) + (a.body.length > 180 ? "…" : ""),
          link: a.eventId ? `/events/${a.eventId}` : "/announcements",
          dedupeKey: `announcement:${a.id}:${u.id}`,
        })),
        skipDuplicates: true,
      });
      if (a.createdById && a.createdById !== actor.id)
        await tx.notification.create({
          data: {
            userId: a.createdById,
            type: "announcement_approved",
            title: `Approved and sent: ${a.title}`,
            body: `${actor.name} approved it; ${people(users.length)} notified.`,
            link: a.eventId ? `/events/${a.eventId}` : "/announcements",
          },
        });
      await audit(tx, {
        actor,
        action: "announcement.publish",
        entityType: "Announcement",
        entityId: a.id,
        summary: `${a.status === "PENDING" ? "Approved and sent" : "Sent"} "${a.title}" to ${people(users.length)} (${AUDIENCES[a.audience as Audience].toLowerCase()})${a.source === "ai" ? " — AI-drafted, human-approved" : ""}`,
      });
      return true;
    });
    if (!sent) return fail("This was already sent.");
    refresh(a);
    revalidatePath("/dashboard");
    return ok(undefined, `Sent to ${people(users.length)}`);
  },
);
