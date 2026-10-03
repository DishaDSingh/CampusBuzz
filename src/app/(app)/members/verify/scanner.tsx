"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon, KeyboardIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { QrScanner, tokenAfter } from "@/components/qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberStateBadge } from "@/components/membership";
import type { MemberState } from "@/lib/membership/rules";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { lookupMembers, recordManualVerification } from "../actions";

/** Member pass QR → the permission-gated result page. */
export function PassScanner() {
  const router = useRouter();
  return (
    <QrScanner
      extract={tokenAfter("verify")}
      onToken={(token) => router.push(`/verify/${token}`)}
      hint="Point the camera at a member's pass QR."
    />
  );
}

type Result = {
  id: string;
  name: string;
  memberNumber: string | null;
  studentId: string | null;
  state: MemberState;
  validUntil: string | null;
};

export function ManualLookup() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  // A pass link (from a USB scanner or pasted) opens the verification page directly.
  const passToken = (v: string) => tokenAfter("verify")(v);

  // Results as you type.
  useEffect(() => {
    const v = query.trim();
    if (v.length < 2 || passToken(v)) return;
    const t = setTimeout(async () => {
      const res = await lookupMembers({ query: v });
      if (res.ok) setResults(res.data);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const token = passToken(query);
    if (token) return router.push(`/verify/${token}`);
    startTransition(async () => {
      const res = await lookupMembers({ query });
      if (!res.ok) return void toast.error(res.fieldErrors?.query?.[0] ?? res.error);
      setResults(res.data);
    });
  };

  return (
    <div className="grid gap-3">
      <form onSubmit={search} className="flex gap-2" role="search">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            ref={input}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 2) setResults(null);
            }}
            placeholder="Name, member no., roll no. — or scan with a USB scanner"
            className="h-11 pl-8 text-base"
            aria-label="Look up a member"
          />
        </div>
        <Button type="submit" disabled={pending} className="h-11">
          {pending && <Loader2Icon className="animate-spin" />}
          Check
        </Button>
      </form>
      {results && (
        <ul className="divide-y rounded-lg border">
          {results.length === 0 && <li className="text-muted-foreground p-3 text-sm">Nobody found.</li>}
          {results.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{r.name}</p>
                <p className="text-muted-foreground text-xs">
                  {r.memberNumber ?? "—"} · {r.studentId ?? "—"}
                  {r.validUntil && ` · until ${fmtDate(r.validUntil)}`}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  r.state === "ACTIVE" || r.state === "EXPIRING" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {r.state === "ACTIVE" || r.state === "EXPIRING" ? "✓ Valid" : "✕ Not valid"}
              </span>
              <MemberStateBadge state={r.state} />
              <Button
                size="sm"
                variant="outline"
                disabled={checked[r.id]}
                onClick={() =>
                  startTransition(async () => {
                    const res = await recordManualVerification({ userId: r.id });
                    if (!res.ok) return void toast.error(res.error);
                    setChecked((c) => ({ ...c, [r.id]: true }));
                    toast.success(res.data.result === "VALID" ? `${r.name} verified ✓` : `Recorded: ${r.name} is not valid`);
                  })
                }
              >
                {checked[r.id] ? "Checked ✓" : "Mark checked"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Laptop-first: typing / USB scanner by default, camera one click away. */
export function VerifyStation() {
  const [tab, setTab] = useState<"type" | "camera">("type");
  return (
    <div className="grid gap-3">
      <div className="bg-muted inline-flex justify-self-start rounded-lg p-0.5 text-sm" role="tablist">
        {(
          [
            ["type", "Type or search", KeyboardIcon],
            ["camera", "Camera", CameraIcon],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1",
              tab === k ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {tab === "type" ? (
        <div className="grid gap-2">
          <ManualLookup />
          <p className="text-muted-foreground text-xs">
            Tip: a USB/handheld QR scanner types the pass link and presses Enter — keep this box focused.
          </p>
        </div>
      ) : (
        <PassScanner />
      )}
    </div>
  );
}
