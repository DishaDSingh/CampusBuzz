"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { guardedAction, ok } from "@/lib/action";
import { structured } from "@/lib/ai/claude";
import { answer, type Answer } from "@/lib/copilot/answers";
import { INTENT_HELP, INTENTS, routeOffline, type Route } from "@/lib/copilot/router";

const askSchema = z.object({ question: z.string().trim().min(2, "Ask a question").max(300, "Keep it under 300 characters") });

const RouteSchema = z.object({
  intent: z.enum(INTENTS),
  subject: z
    .string()
    .nullable()
    .describe(
      "Event, product or fundraiser name the question is about, or for navigate/help the key words of what they're looking for — words only, e.g. 'Diwali Gala' or 'hoodie'.",
    ),
  period: z.enum(["today", "week", "month", "year"]).nullable(),
});

const SYSTEM = `You route questions for a student organisation's assistant. You never answer the question yourself.
Pick the single intent that best matches. Questions about the asker's own membership, tickets, orders, tasks or access use the my_* intents.
Use "navigate" when they ask where or how to do something in the app. Use "help" if none fits.
Intents:
${INTENTS.map((i) => `- ${i}: ${INTENT_HELP[i]}`).join("\n")}`;

/**
 * The assistant every signed-in person sees. The model only chooses *which*
 * question was asked; answers and numbers are computed from the database and
 * filtered by the asker's permissions, so a member never sees finance data.
 */
export const askAssistant = guardedAction({ schema: askSchema }, async ({ question }, actor) => {
  const ai = actor.permissions.has("ai.use")
    ? await structured({ schema: RouteSchema, system: SYSTEM, content: question, effort: "low", maxTokens: 1000 })
    : ({ ok: false } as const);
  const routed: Route = ai.ok ? ai.data : routeOffline(question);
  const route = routed.intent === "memory" ? { ...routed, subject: question } : routed;
  const result = await answer(route, actor);
  await db.$transaction((tx) =>
    audit(tx, {
      actor,
      action: "copilot.ask",
      entityType: "Copilot",
      summary: `Asked the assistant: "${question.slice(0, 120)}" → ${route.intent}`,
    }),
  );
  return ok<Answer & { routedBy: "ai" | "rules" }>({ ...result, routedBy: ai.ok ? "ai" : "rules" });
});
