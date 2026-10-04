"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { isLocked, recordFailure } from "@/lib/auth/rate-limit";

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  name: z.string().trim().max(80).optional(),
  // Hidden field real people never fill in; bots usually do.
  website: z.string().max(0).optional(),
});

export type SubscribeResult = { ok: true; message: string } | { ok: false; error: string };

/** Public website: join the club's mailing list. No account needed. */
export async function subscribeToNews(input: z.input<typeof subscribeSchema>): Promise<SubscribeResult> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  if (parsed.data.website) return { ok: true, message: "You're on the list!" };

  // A few sign-ups per visitor per 15 minutes is plenty; stops form spam.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  const key = `subscribe|${ip}`;
  if (isLocked(key)) return { ok: false, error: "Too many sign-ups from here. Try again later." };
  recordFailure(key);

  const { email, name } = parsed.data;
  await db.mailingListSubscriber.upsert({
    where: { email },
    create: { email, name: name || null },
    update: { unsubscribedAt: null, ...(name ? { name } : {}) },
  });
  return { ok: true, message: "You're on the list! Club news will reach your inbox." };
}
