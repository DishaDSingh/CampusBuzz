import bcrypt from "bcryptjs";
import type { Db } from "./shared";

/**
 * Creates (or updates) a Master Admin from the local .env — so personal
 * credentials never live in the repository:
 *
 *   MASTER_ADMIN_EMAIL=you@example.com
 *   MASTER_ADMIN_PASSWORD=…
 *   MASTER_ADMIN_NAME="Your Name"        (optional)
 *
 * Runs at the end of `npm run db:seed`, or on its own with `npm run admin:master`.
 */
export async function ensureMasterAdmin(db: Db) {
  const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD;
  if (!email || !password) return { masterAdmin: "skipped (MASTER_ADMIN_EMAIL / MASTER_ADMIN_PASSWORD not set)" };
  if (password.length < 8) throw new Error("MASTER_ADMIN_PASSWORD must be at least 8 characters.");

  const name =
    process.env.MASTER_ADMIN_NAME?.trim() ||
    email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

  const user = existing
    ? await db.user.update({
        where: { email },
        // Bumping the session version signs out any old sessions after a password reset.
        data: { passwordHash, isMasterAdmin: true, status: "ACTIVE", sessionVersion: { increment: 1 } },
      })
    : await db.user.create({ data: { email, name, passwordHash, isMasterAdmin: true, status: "ACTIVE" } });

  await db.auditLog.create({
    data: {
      actorName: "System (setup script)",
      action: existing ? "user.master_reset" : "user.master_create",
      entityType: "User",
      entityId: user.id,
      summary: existing ? `Reset the Master Admin login for ${user.name}` : `Created Master Admin ${user.name}`,
    },
  });
  return { masterAdmin: `${existing ? "updated" : "created"}: ${user.name}` };
}
