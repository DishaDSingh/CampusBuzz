"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileTextIcon, Loader2Icon, SparklesIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/form/field";
import { cn } from "@/lib/utils";
import { AUDIENCE_KEYS, AUDIENCE_LABEL, suggestedTemplate, templates, type AudienceKey } from "@/lib/announcement-templates";
import { draftAnnouncement } from "../actions";

/**
 * Step 1: who is it for (with live counts). Step 2: a matching message is
 * filled in — edit it, swap template, or describe something else and let AI
 * draft it. Nothing is sent from here.
 */
export function DraftForm({
  ai,
  brief: initialBrief,
  audience: initialAudience,
  counts,
  org,
}: {
  ai: boolean;
  brief: string;
  audience: AudienceKey;
  counts: Record<string, number>;
  org: string;
}) {
  const router = useRouter();
  const all = templates(org);
  const [audience, setAudience] = useState<AudienceKey>(initialAudience);
  const [mode, setMode] = useState<"template" | "write">(initialBrief ? "write" : "template");
  const [templateKey, setTemplateKey] = useState(suggestedTemplate[initialAudience]);
  const tpl = all.find((t) => t.key === templateKey) ?? all[0];
  const [title, setTitle] = useState(tpl.title);
  const [body, setBody] = useState(tpl.body);
  const [brief, setBrief] = useState(initialBrief);
  const [useAi, setUseAi] = useState(ai);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const pickTemplate = (key: string) => {
    const t = all.find((x) => x.key === key)!;
    setTemplateKey(key);
    setTitle(t.title);
    setBody(t.body);
    setMode("template");
  };
  const pickAudience = (a: AudienceKey) => {
    setAudience(a);
    // Suggest the matching message (e.g. "ends today" → fees due today).
    if (mode === "template") pickTemplate(suggestedTemplate[a]);
  };

  return (
    <form
      className="grid max-w-4xl gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res =
            mode === "template"
              ? await draftAnnouncement({ audience, title, body, useAi: false })
              : await draftAnnouncement({ audience, brief, useAi });
          if (!res.ok) return void setError(res.fieldErrors?.brief?.[0] ?? res.error);
          toast.success(res.message);
          router.push(`/announcements/${res.data.id}`);
        });
      }}
    >
      {/* 1. Audience, with how many people each reaches */}
      <section className="bg-card rounded-2xl border p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <UsersIcon className="size-4 text-[var(--page-accent)]" /> 1. Who should get it?
        </h2>
        <div className="stat-grid bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-5">
          {AUDIENCE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={audience === k}
              onClick={() => pickAudience(k)}
              className={cn(
                "bg-card hover:bg-muted/60 p-3 text-left transition-colors",
                audience === k && "ring-2 ring-[var(--page-accent)] ring-inset",
              )}
            >
              <span className="text-2xl font-semibold tabular-nums">{counts[k] ?? 0}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">{AUDIENCE_LABEL[k]}</span>
            </button>
          ))}
        </div>
        {(counts[audience] ?? 0) === 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Nobody is in this group right now.</p>
        )}
      </section>

      {/* 2. Message */}
      <section className="bg-card grid gap-4 rounded-2xl border p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileTextIcon className="size-4 text-[var(--page-accent)]" /> 2. Message
          </h2>
          <div className="bg-muted inline-flex rounded-lg p-0.5 text-sm">
            {(
              [
                ["template", "Use a template"],
                ["write", ai ? "Describe it (AI drafts)" : "Write my own"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={cn("rounded-md px-3 py-1", mode === k ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {mode === "template" ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {all.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => pickTemplate(t.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    templateKey === t.key ? "border-transparent bg-[var(--page-accent)] text-white" : "hover:bg-muted",
                  )}
                >
                  {t.label}
                  {suggestedTemplate[audience] === t.key && templateKey !== t.key && (
                    <span className="text-muted-foreground"> · suggested</span>
                  )}
                </button>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid content-start gap-3">
                <Field id="t-title" label="Title">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field id="t-body" label="Message" hint="Fill in anything in [brackets] before sending.">
                  <Textarea rows={11} value={body} onChange={(e) => setBody(e.target.value)} />
                </Field>
              </div>
              {/* Live preview, as members will see it */}
              <div className="bg-muted/40 rounded-xl border p-4">
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Preview</p>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <p className="font-semibold">{title || "Title"}</p>
                  <p className="mt-2 text-sm whitespace-pre-line">
                    {body.split(/(\[add[^\]]*\])/g).map((part, i) =>
                      /^\[add/.test(part) ? (
                        <mark key={i} className="rounded bg-amber-200/70 px-0.5 dark:bg-amber-500/30">
                          {part}
                        </mark>
                      ) : (
                        part
                      ),
                    )}
                  </p>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Goes to {counts[audience] ?? 0} ({AUDIENCE_LABEL[audience].toLowerCase()}) once someone with publish rights sends it.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <Field
              id="brief"
              label="What's it about?"
              required
              error={error}
              hint="e.g. Diwali Gala tickets on sale, ₹800 for members, 7 Nov at Lakeside Banquets"
            >
              <Textarea rows={4} value={brief} onChange={(e) => (setBrief(e.target.value), setError(undefined))} />
            </Field>
            {ai && (
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox checked={useAi} onCheckedChange={(c) => setUseAi(c === true)} />
                <SparklesIcon className="text-primary size-4" /> Let AI write the first draft
              </Label>
            )}
          </>
        )}
        {error && mode === "template" && <p className="text-destructive text-sm">{error}</p>}
      </section>

      <Button type="submit" size="lg" disabled={pending} className="justify-self-start">
        {pending && <Loader2Icon className="animate-spin" />}
        Create draft
      </Button>
    </form>
  );
}
