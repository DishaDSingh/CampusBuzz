import bcrypt from "bcryptjs";
import type { Db } from "./shared";

/**
 * Named team accounts from the local .env, so real emails and passwords never
 * live in the repository:
 *
 *   NAMED_ACCOUNTS="someone@example.com|member|Name;other@example.com|president|Name"
 *   NAMED_ACCOUNTS_PASSWORD=…
 *
 * The role is a role key (member, president, secretary, treasurer, …). Everyone
 * also gets General Member and an active annual membership with a member pass.
 * Runs at the end of `npm run db:seed`, or on its own with `npm run admin:accounts`.
 */
export async function ensureNamedAccounts(db: Db) {
  const spec = process.env.NAMED_ACCOUNTS?.trim();
  const password = process.env.NAMED_ACCOUNTS_PASSWORD;
  if (!spec || !password) return { namedAccounts: "skipped (NAMED_ACCOUNTS / NAMED_ACCOUNTS_PASSWORD not set)" };
  if (password.length < 8) throw new Error("NAMED_ACCOUNTS_PASSWORD must be at least 8 characters.");

  const passwordHash = await bcrypt.hash(password, 10);
  const org = await db.organization.findFirst({ select: { shortName: true } });
  const prefix = `${(org?.shortName ?? "MEM").toUpperCase().replace(/[^A-Z0-9]/g, "")}-`;
  const plan = await db.membershipPlan.findFirst({
    where: { isActive: true },
    orderBy: [{ durationMonths: "desc" }],
    select: { id: true, pricePaise: true, durationMonths: true },
  });
  const roles = new Map((await db.role.findMany({ select: { id: true, key: true } })).map((r) => [r.key, r.id]));
  const done: string[] = [];

  for (const entry of spec
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const [rawEmail, rawRole = "member", rawName] = entry.split("|").map((s) => s.trim());
    const email = rawEmail.toLowerCase();
    const roleKey = rawRole === "member" ? "general_member" : rawRole;
    if (!roles.has(roleKey)) throw new Error(`Unknown role "${rawRole}" for ${email}.`);
    const name =
      rawName ||
      email
        .split("@")[0]
        .replace(/\d+/g, "")
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const existing = await db.user.findUnique({ where: { email }, select: { id: true, memberNumber: true } });
    const user = existing
      ? await db.user.update({
          where: { email },
          // A new password signs out old sessions.
          data: { passwordHash, status: "ACTIVE", sessionVersion: { increment: 1 } },
        })
      : await db.user.create({ data: { email, name, passwordHash, status: "ACTIVE" } });

    for (const key of new Set([roleKey, "general_member"])) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roles.get(key)! } },
        create: { userId: user.id, roleId: roles.get(key)! },
        update: {},
      });
    }

    // An active membership, so the member pass, member prices and member-only features work.
    const now = new Date();
    const active = await db.membership.count({
      where: { userId: user.id, status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } },
    });
    if (plan && !active) {
      const end = new Date(now);
      end.setMonth(end.getMonth() + plan.durationMonths);
      await db.membership.create({
        data: { userId: user.id, planId: plan.id, status: "ACTIVE", startDate: now, endDate: end, pricePaise: plan.pricePaise },
      });
    }
    if (!existing?.memberNumber) {
      const last = await db.user.findFirst({
        where: { memberNumber: { startsWith: prefix } },
        orderBy: { memberNumber: "desc" },
        select: { memberNumber: true },
      });
      const n = last?.memberNumber ? Number.parseInt(last.memberNumber.slice(prefix.length), 10) + 1 : 1;
      await db.user.update({
        where: { id: user.id },
        data: { memberNumber: `${prefix}${String(n).padStart(5, "0")}`, passToken: crypto.randomUUID().replaceAll("-", "") },
      });
    }

    await db.auditLog.create({
      data: {
        actorName: "System (setup script)",
        action: existing ? "user.account_reset" : "user.account_create",
        entityType: "User",
        entityId: user.id,
        summary: `${existing ? "Reset the login for" : "Created"} ${user.name} (${rawRole})`,
      },
    });
    done.push(`${user.name} (${rawRole})`);
  }
  return { namedAccounts: done.join(", ") };
}
