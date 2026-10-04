"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpIcon, BotIcon, Loader2Icon, RotateCcwIcon, ShieldCheckIcon, SparklesIcon, XIcon } from "lucide-react";
import type { Answer } from "@/lib/copilot/answers";
import type { Intent } from "@/lib/copilot/router";
import { askAssistant } from "@/lib/copilot/actions";

type Message = { id: number; question: string; answer?: Answer & { routedBy: "ai" | "rules" } };

/** Suggested questions; the ones for the current page come first. */
const SUGGESTIONS: { q: string; intent: Intent; paths: string[] }[] = [
  { q: "What needs my attention today?", intent: "attention", paths: ["/dashboard", "/insights"] },
  { q: "Is my membership active?", intent: "my_membership", paths: ["/me", "/dashboard"] },
  { q: "Which tickets do I have?", intent: "my_tickets", paths: ["/events"] },
  { q: "What's the status of my merch orders?", intent: "my_orders", paths: ["/merch"] },
  { q: "What tasks are assigned to me?", intent: "my_tasks", paths: ["/me/volunteering", "/volunteers"] },
  { q: "What events are coming up?", intent: "upcoming_events", paths: ["/events", "/calendar"] },
  { q: "How many active members do we have?", intent: "active_members", paths: ["/members"] },
  { q: "Which memberships expire this month?", intent: "expiring_memberships", paths: ["/members", "/announcements"] },
  { q: "Show pending reimbursements", intent: "pending_reimbursements", paths: ["/finance"] },
  { q: "How much came in this month?", intent: "finance_summary", paths: ["/finance"] },
  { q: "How much money did the Diwali Gala make?", intent: "event_money", paths: ["/events", "/finance"] },
  { q: "How many hoodies are left?", intent: "stock_left", paths: ["/merch"] },
  { q: "How are the fundraisers doing?", intent: "fundraiser_progress", paths: ["/fundraisers"] },
  { q: "Which event had the highest attendance?", intent: "top_attendance", paths: ["/analytics", "/events"] },
  { q: "What happened at last year's Gala?", intent: "memory", paths: ["/memory", "/meetings"] },
  { q: "What can I do here?", intent: "my_access", paths: ["/profile"] },
];

export function Assistant({
  firstName,
  roleLabel,
  isMasterAdmin,
  intents,
}: {
  firstName: string;
  roleLabel: string;
  isMasterAdmin: boolean;
  /** Intents this person may ask about — suggestions never tease locked data. */
  intents: Intent[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const can = new Set(intents);
  const onPage = (paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const suggestions = SUGGESTIONS.filter((s) => can.has(s.intent))
    .sort((a, b) => Number(onPage(b.paths)) - Number(onPage(a.paths)))
    .slice(0, 4);

  const ask = (question: string) => {
    const q = question.trim();
    if (q.length < 2 || pending) return;
    const id = ++nextId.current;
    setMessages((m) => [...m, { id, question: q }]);
    setText("");
    startTransition(async () => {
      const res = await askAssistant({ question: q });
      if (!res.ok) {
        toast.error(res.fieldErrors?.question?.[0] ?? res.error);
        return setMessages((m) => m.filter((x) => x.id !== id));
      }
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, answer: res.data } : x)));
    });
  };

  return (
    <div className="print:hidden">
      {open && (
        <section
          role="dialog"
          aria-label="Buzz assistant"
          className="bg-card fixed right-3 bottom-20 z-50 flex h-[min(34rem,calc(100svh-7rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border shadow-2xl shadow-violet-500/20 sm:right-6 sm:bottom-24"
          style={{ animation: "cb-pop 260ms cubic-bezier(0.2,0.7,0.2,1) both" }}
        >
          <header className="relative flex items-center gap-3 bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-white">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
              <BotIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Buzz</p>
              <p className="flex items-center gap-1 truncate text-xs text-white/80">
                <ShieldCheckIcon className="size-3 shrink-0" />
                {isMasterAdmin ? "Master Admin · full access" : `${roleLabel} · answers only what you can see`}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="rounded-full p-1.5 hover:bg-white/15"
                aria-label="Start a new chat"
                title="New chat"
              >
                <RotateCcwIcon className="size-4" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Close">
              <XIcon className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm" aria-live="polite">
            <div className="bg-muted/60 max-w-[90%] rounded-2xl rounded-tl-sm p-3">
              <p>
                Hi {firstName} 👋 I&apos;m Buzz.{" "}
                {isMasterAdmin
                  ? "You have full access, so ask me anything about the organization."
                  : "Ask me about anything your role covers. I'll keep everything else private."}
              </p>
            </div>
            {messages.length === 0 && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.q}
                    type="button"
                    onClick={() => ask(s.q)}
                    className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-left text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200"
                  >
                    {s.q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="grid gap-2">
                <p className="max-w-[85%] justify-self-end rounded-2xl rounded-br-sm bg-linear-to-r from-indigo-600 to-violet-600 px-3 py-2 text-white">
                  {m.question}
                </p>
                {m.answer ? (
                  <div className="bg-muted/60 max-w-[95%] justify-self-start rounded-2xl rounded-tl-sm p-3">
                    <p>{m.answer.text}</p>
                    {m.answer.table && m.answer.table.rows.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          {m.answer.table.columns.some(Boolean) && (
                            <thead className="text-muted-foreground text-left">
                              <tr className="border-b">
                                {m.answer.table.columns.map((c, i) => (
                                  <th key={i} className="py-1 pr-2 font-medium">
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          )}
                          <tbody className="divide-y">
                            {m.answer.table.rows.slice(0, 10).map((r, ri) => (
                              <tr key={ri}>
                                {r.map((cell, ci) => (
                                  <td key={ci} className="py-1 pr-2 align-top">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {m.answer.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.answer.sources.map((s) => (
                          <Link
                            key={s.href + s.label}
                            href={s.href}
                            className="bg-background rounded-full border px-2.5 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950"
                          >
                            {s.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Loader2Icon className="size-4 animate-spin" /> Looking it up…
                  </p>
                )}
              </div>
            ))}
            <div ref={bottom} />
          </div>

          <form
            className="flex items-center gap-2 border-t p-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask Buzz anything…"
              aria-label="Your question"
              maxLength={300}
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={pending || text.trim().length < 2}
              aria-label="Send"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-indigo-600 to-fuchsia-600 text-white transition-opacity disabled:opacity-40"
            >
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : <ArrowUpIcon className="size-4" />}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close Buzz assistant" : "Open Buzz assistant"}
        className="group fixed right-3 bottom-3 z-50 flex items-center gap-2 rounded-full bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-3.5 text-white shadow-xl shadow-violet-500/40 transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
      >
        {!open && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-violet-500/30 [animation-duration:2.5s]" />}
        {open ? <XIcon className="size-6" /> : <SparklesIcon className="size-6" />}
        {!open && messages.length === 0 && <span className="hidden pr-1 text-sm font-semibold sm:inline">Ask Buzz</span>}
      </button>
    </div>
  );
}
