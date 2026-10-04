"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, Loader2Icon, MailIcon } from "lucide-react";
import { subscribeToNews } from "@/app/site-actions";

/** Public mailing-list sign-up: one email, no account needed. */
export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [trap, setTrap] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done)
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 font-medium text-white ring-1 ring-white/30">
        <CheckCircle2Icon className="size-5 shrink-0" /> {done}
      </p>
    );

  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await subscribeToNews({ email, name, website: trap });
          if (res.ok) setDone(res.message);
          else setError(res.error);
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        aria-label="Your name"
        maxLength={80}
        className="h-11 rounded-xl border-0 bg-white px-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@college.edu"
        aria-label="Email address"
        className="h-11 rounded-xl border-0 bg-white px-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300"
      />
      {/* Honeypot: hidden from people, tempting for bots. */}
      <input value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 font-semibold text-slate-900 transition-colors hover:bg-amber-200 disabled:opacity-60"
      >
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <MailIcon className="size-4" />} Get club news
      </button>
      {error && <p className="text-sm text-amber-100 sm:col-span-3">{error}</p>}
    </form>
  );
}
