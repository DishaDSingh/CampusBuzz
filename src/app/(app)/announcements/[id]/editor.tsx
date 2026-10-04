"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { celebrate } from "@/lib/celebrate";
import { CheckCircle2Icon, ClockIcon, Loader2Icon, MessageSquareWarningIcon, SendIcon, SparklesIcon, UndoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field, NativeSelect } from "@/components/form/field";
import { publishAnnouncement, returnAnnouncement, saveAnnouncement, submitAnnouncement } from "../actions";

type Audience = "MEMBERS" | "TODAY" | "EXPIRING" | "VOLUNTEERS" | "ALL" | "EVENT";
const LABEL: Record<Audience, string> = {
  EVENT: "everyone taking part in the event",
  MEMBERS: "active members",
  TODAY: "members whose membership ends today",
  EXPIRING: "members whose membership ends this week",
  VOLUNTEERS: "volunteers",
  ALL: "everyone with an account",
};

export function AnnouncementEditor({
  announcement: a,
  counts,
  canEdit,
  canPublish,
}: {
  announcement: {
    id: string;
    title: string;
    body: string;
    audience: Audience;
    source: string;
    status: string;
    reviewNote: string | null;
  };
  counts: Partial<Record<Audience, number>>;
  canEdit: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(a.title);
  const [body, setBody] = useState(a.body);
  const [audience, setAudience] = useState<Audience>(a.audience);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const placeholders = (body.match(/\[add[^\]]*\]/gi) ?? []).length;
  const waiting = a.status === "PENDING";
  const recipients = counts[audience] ?? 0;
  const edit = canEdit || (canPublish && waiting);

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> }>,
    after?: () => void,
  ) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.fieldErrors ? Object.values(res.fieldErrors)[0]?.[0] : res.error);
      toast.success(res.message);
      after?.();
      router.refresh();
    });

  const save = () =>
    run(
      () => saveAnnouncement({ announcementId: a.id, title, body, audience }),
      () => setDirty(false),
    );
  const submit = () => run(() => submitAnnouncement({ announcementId: a.id }));
  const sendBack = () =>
    run(
      () => returnAnnouncement({ announcementId: a.id, note }),
      () => setNote(""),
    );
  const publish = () =>
    run(
      () => publishAnnouncement({ announcementId: a.id, confirmRecipients: recipients }),
      () => {
        celebrate();
        router.push("/announcements");
      },
    );

  return (
    <div className="grid max-w-2xl gap-4">
      {waiting && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          <ClockIcon className="size-4 shrink-0" /> Waiting for approval — not sent yet.
        </p>
      )}
      {a.reviewNote && !waiting && (
        <p className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-2.5 text-sm text-rose-900 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-200">
          <MessageSquareWarningIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Changes requested:</strong> {a.reviewNote}
          </span>
        </p>
      )}
      {a.source === "ai" && (
        <p className="text-primary flex items-center gap-1.5 text-sm">
          <SparklesIcon className="size-4" /> AI helped write this — check every detail before sending.
        </p>
      )}
      <div className="bg-card grid gap-4 rounded-xl border p-4 sm:p-6">
        <Field id="a-title" label="Title">
          <Input value={title} disabled={!edit} onChange={(e) => (setTitle(e.target.value), setDirty(true))} />
        </Field>
        <Field
          id="a-body"
          label="Message"
          hint={placeholders ? `${placeholders} “[add …]” placeholder${placeholders > 1 ? "s" : ""} still to fill in` : undefined}
        >
          <Textarea rows={12} value={body} disabled={!edit} onChange={(e) => (setBody(e.target.value), setDirty(true))} />
        </Field>
        <Field id="a-aud" label="Send to">
          <NativeSelect value={audience} disabled={!edit} onChange={(e) => (setAudience(e.target.value as Audience), setDirty(true))}>
            {(Object.keys(LABEL) as Audience[])
              .filter((k) => counts[k] !== undefined)
              .map((k) => (
                <option key={k} value={k}>
                  {LABEL[k][0].toUpperCase() + LABEL[k].slice(1)} ({counts[k]})
                </option>
              ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {edit && (
          <Button variant="outline" disabled={pending || !dirty} onClick={save}>
            Save changes
          </Button>
        )}
        {canPublish ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={pending || dirty || placeholders > 0}>
                {waiting ? <CheckCircle2Icon /> : <SendIcon />} {waiting ? "Approve & send…" : "Send…"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send to {recipients === 1 ? "1 person" : `${recipients} people`}?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{title}” will be posted and {recipients === 1 ? "they get" : `all ${recipients} get`} a notification ({LABEL[audience]}).
                  This can&apos;t be unsent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Not yet</AlertDialogCancel>
                <AlertDialogAction onClick={publish}>
                  {pending && <Loader2Icon className="animate-spin" />}
                  Yes, send it
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : waiting ? (
          <p className="text-muted-foreground text-sm">An admin will review it. You&apos;ll get a notification when it&apos;s sent.</p>
        ) : (
          canEdit && (
            <Button disabled={pending || dirty || placeholders > 0} onClick={submit}>
              <SendIcon /> Send for approval
            </Button>
          )
        )}
        {(dirty || placeholders > 0) && (
          <p className="text-muted-foreground text-xs">{dirty ? "Save your changes first." : "Fill in the placeholders first."}</p>
        )}
      </div>

      {canPublish && waiting && (
        <div className="bg-card grid gap-2 rounded-xl border p-4">
          <Field id="a-note" label="Not quite right? Send it back with a note">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please add the dress code." />
          </Field>
          <Button variant="outline" className="justify-self-start" disabled={pending || note.trim().length < 3} onClick={sendBack}>
            <UndoIcon /> Request changes
          </Button>
        </div>
      )}
    </div>
  );
}
