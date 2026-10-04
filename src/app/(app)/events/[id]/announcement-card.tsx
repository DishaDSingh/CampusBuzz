"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClockIcon, Loader2Icon, MegaphoneIcon, MessageSquareWarningIcon, SendIcon, SparklesIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/form/field";
import { draftEventAnnouncementAction, saveAnnouncement, submitAnnouncement } from "@/app/(app)/announcements/actions";

type Draft = { id: string; title: string; body: string; audience: string; status: string; reviewNote: string | null; source: string };

const EXAMPLES = [
  "Grand cultural night with live music, food stalls and a dress code of ethnic wear",
  "Hands-on workshop for beginners — bring your laptop, certificates for everyone",
  "Friendly sports tournament, register as a team of 5, prizes for the winners",
];

/** Highlights “[add …]” placeholders so the organizer sees what's missing. */
function Preview({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-background rounded-xl border p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 whitespace-pre-line">
        {body.split(/(\[add[^\]]*\])/gi).map((part, i) =>
          /^\[add/i.test(part) ? (
            <mark key={i} className="rounded bg-amber-200 px-0.5 dark:bg-amber-700/60">
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </p>
    </div>
  );
}

export function EventAnnouncementCard({
  eventId,
  draft,
  counts,
  canPublish,
  ai,
  sentBefore = false,
}: {
  eventId: string;
  draft: Draft | null;
  counts: { EVENT: number; MEMBERS: number };
  canPublish: boolean;
  ai: boolean;
  /** An announcement already went out: the next one is an update. */
  sentBefore?: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(!draft);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [audience, setAudience] = useState(draft?.audience ?? "MEMBERS");
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const placeholders = (body.match(/\[add[^\]]*\]/gi) ?? []).length;
  const waiting = draft?.status === "PENDING";

  const generate = () =>
    startTransition(async () => {
      const res = await draftEventAnnouncementAction({ eventId, prompt, useAi: true });
      if (!res.ok) return void toast.error(res.fieldErrors ? Object.values(res.fieldErrors)[0]?.[0] : res.error);
      setTitle(res.data.title);
      setBody(res.data.body);
      setAudience(res.data.audience);
      setDirty(false);
      setShowPrompt(false);
      toast.success(res.message);
      router.refresh();
    });

  const save = (then?: () => Promise<void>) =>
    startTransition(async () => {
      if (!draft) return;
      if (dirty) {
        const res = await saveAnnouncement({ announcementId: draft.id, title, body, audience: audience as "EVENT" | "MEMBERS" });
        if (!res.ok) return void toast.error(res.fieldErrors ? Object.values(res.fieldErrors)[0]?.[0] : res.error);
        setDirty(false);
        if (!then) toast.success(res.message);
      }
      await then?.();
      router.refresh();
    });

  const submit = () =>
    save(async () => {
      const res = await submitAnnouncement({ announcementId: draft!.id });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
    });

  return (
    <section
      id="announcement"
      className="overflow-hidden rounded-2xl border bg-linear-to-br from-[color-mix(in_oklch,var(--page-accent)_10%,var(--card))] to-[var(--card)] shadow-sm"
    >
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-5">
        <MegaphoneIcon className="size-4 text-[var(--page-accent)]" />
        <h2 className="font-semibold">{sentBefore && !draft ? "Post an update" : "Event announcement"}</h2>
        {waiting ? (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <ClockIcon className="size-3" /> Waiting for approval
          </span>
        ) : draft ? (
          <span className="text-muted-foreground ml-auto text-xs">Draft · not sent</span>
        ) : null}
      </header>

      <div className="grid gap-4 p-4 sm:p-5">
        {draft?.reviewNote && !waiting && (
          <p className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-200">
            <MessageSquareWarningIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Changes requested:</strong> {draft.reviewNote}
            </span>
          </p>
        )}

        {showPrompt && !waiting && (
          <div className="grid gap-2">
            <Field
              id="ev-prompt"
              label={sentBefore ? "What do you want to tell people?" : "Describe the event in a line or two"}
              hint="Date, venue and ticket prices are filled in from the event automatically, in the official format."
            >
              <Textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Grand cultural night with live music, food stalls and a dress code of ethnic wear"
                maxLength={1000}
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="hover:bg-muted rounded-full border px-2.5 py-1 text-left text-xs transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={generate} disabled={pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : <WandSparklesIcon />}
                {draft ? "Rewrite announcement" : sentBefore ? "Write an update" : "Write announcement"}
              </Button>
              {draft && (
                <Button variant="ghost" onClick={() => setShowPrompt(false)}>
                  Cancel
                </Button>
              )}
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <SparklesIcon className="size-3" />{" "}
                {ai ? "AI polishes your words; facts come from the event." : "Uses the official template."}
              </span>
            </div>
          </div>
        )}

        {draft && !showPrompt && (
          <>
            {waiting ? (
              <Preview title={title} body={body} />
            ) : (
              <div className="grid gap-3">
                <Field id="ev-a-title" label="Title">
                  <Input value={title} onChange={(e) => (setTitle(e.target.value), setDirty(true))} />
                </Field>
                <Field
                  id="ev-a-body"
                  label="Message"
                  hint={
                    placeholders
                      ? `${placeholders} “[add …]” placeholder${placeholders > 1 ? "s" : ""} to fill in`
                      : "Edit anything you like."
                  }
                >
                  <Textarea rows={12} value={body} onChange={(e) => (setBody(e.target.value), setDirty(true))} />
                </Field>
                <Field id="ev-a-aud" label="Who should get it">
                  <NativeSelect value={audience} onChange={(e) => (setAudience(e.target.value), setDirty(true))}>
                    <option value="EVENT">Everyone taking part — ticket holders, volunteers, organizer ({counts.EVENT})</option>
                    <option value="MEMBERS">All active members — invite everyone ({counts.MEMBERS})</option>
                  </NativeSelect>
                </Field>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {waiting ? (
                canPublish ? (
                  <Button asChild>
                    <Link href={`/announcements/${draft.id}`}>Review & approve</Link>
                  </Button>
                ) : (
                  <p className="text-muted-foreground text-sm">An admin is reviewing it. You&apos;ll be notified when it&apos;s sent.</p>
                )
              ) : (
                <>
                  {canPublish ? (
                    // Publishers approve their own: straight to the send screen (after saving).
                    <Button
                      disabled={pending || placeholders > 0}
                      onClick={() => save(async () => router.push(`/announcements/${draft.id}`))}
                    >
                      <SendIcon /> Review & send
                    </Button>
                  ) : (
                    <Button onClick={submit} disabled={pending || placeholders > 0}>
                      {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                      Send for approval
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => save()} disabled={pending || !dirty}>
                    Save changes
                  </Button>
                  <Button variant="ghost" onClick={() => setShowPrompt(true)} disabled={pending}>
                    <WandSparklesIcon /> Rewrite from a prompt
                  </Button>
                </>
              )}
            </div>
            {placeholders > 0 && !waiting && <p className="text-muted-foreground text-xs">Fill in the highlighted placeholders first.</p>}
          </>
        )}
      </div>
    </section>
  );
}
