"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, guardedAction, ok } from "@/lib/action";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSession, readSession } from "@/lib/auth/session";
import { id } from "@/lib/validation/common";

/**
 * "Log in as" for Master Admins — to check what someone sees and fix things
 * for them. No password needed, but: Master Admin only, never another Master
 * Admin, a banner is shown the whole time, and every action is audited under
 * the admin's own name ("Prisha (as Bhamini)").
 */
export const startImpersonation = guardedAction({ schema: z.object({ userId: id }) }, async ({ userId }, actor) => {
  if (!actor.isMasterAdmin || actor.impersonator) return fail("Only a Master Admin can do this.");
  if (userId === actor.id) return fail("That's you.");
  const [target, admin] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, status: true, isMasterAdmin: true, sessionVersion: true },
    }),
    db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { sessionVersion: true } }),
  ]);
  if (!target) return fail("User not found.");
  if (target.isMasterAdmin) return fail("You can't log in as another Master Admin.");
  if (target.status !== "ACTIVE") return fail("Only active accounts can be opened.");

  await db.$transaction((tx) =>
    audit(tx, {
      actor,
      action: "auth.impersonate_start",
      entityType: "User",
      entityId: target.id,
      summary: `${actor.name} started viewing the app as ${target.name}`,
    }),
  );
  await createSession(target.id, target.sessionVersion, { id: actor.id, ver: admin.sessionVersion });
  // The button does a full page load to /dashboard so the whole app switches to their view.
  return ok(undefined, `Now viewing as ${target.name}`);
});

/** Back to the Master Admin's own account. */
export async function stopImpersonation() {
  const [user, session] = await Promise.all([getCurrentUser(), readSession()]);
  if (!user?.impersonator || !session?.imp || session.iver === undefined) redirect("/dashboard");
  await db.$transaction((tx) =>
    audit(tx, {
      actor: user,
      action: "auth.impersonate_stop",
      entityType: "User",
      entityId: user.id,
      summary: `${user.impersonator!.name} stopped viewing the app as ${user.name}`,
    }),
  );
  await createSession(session.imp, session.iver);
  redirect(`/admin/users/${user.id}`);
}
