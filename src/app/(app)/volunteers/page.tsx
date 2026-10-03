import type { Metadata } from "next";
import Link from "next/link";
import { ClockIcon, HandHeartIcon, SearchIcon, StarIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { EmptyState, PageHeader } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/form/field";
import { cn } from "@/lib/utils";
import { param } from "@/lib/format";
import { SKILLS, SLOTS } from "@/lib/volunteers/rules";
import { volunteerHours } from "@/lib/volunteers/load";

export const metadata: Metadata = { title: "Volunteers" };

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "free", label: "Free to help" },
  { key: "busy", label: "Busy" },
  { key: "over", label: "Overloaded" },
] as const;
type Load = "free" | "busy" | "over";

const LOAD: Record<Load, { label: string; pill: string; bar: string }> = {
  free: { label: "Free to help", pill: "bg-success/15 text-success", bar: "bg-success" },
  busy: { label: "Busy", pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300", bar: "bg-sky-500" },
  over: { label: "Overloaded", pill: "bg-destructive/10 text-destructive", bar: "bg-destructive" },
};

const AVATAR = [
  "from-indigo-400 to-violet-600",
  "from-pink-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-fuchsia-400 to-purple-600",
];
const initials = (n: string) =>
  n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const slotShort = (k: string) =>
  SLOTS.find((s) => s.key === k)
    ?.label.replace("Weekday", "Wkday")
    .replace("Weekend", "Wkend") ?? k;

export default async function VolunteersPage(props: PageProps<"/volunteers">) {
  await requirePermission("volunteers.view");
  const sp = await props.searchParams;
  const filter = FILTERS.find((f) => f.key === param(sp.show))?.key ?? "all";
  const skill = SKILLS.find((s) => s === param(sp.skill));
  const q = (param(sp.q) ?? "").trim().toLowerCase();

  const profiles = await db.volunteerProfile.findMany({
    where: { isActive: true },
    orderBy: { user: { name: "asc" } },
    select: {
      userId: true,
      skills: true,
      availability: true,
      maxHoursPerWeek: true,
      user: { select: { name: true, tasksAssigned: { select: { status: true, estimatedHours: true } } } },
    },
  });
  const hours = await volunteerHours(profiles.map((p) => p.userId));

  const people = profiles.map((p, i) => {
    const open = p.user.tasksAssigned.filter((t) => t.status !== "DONE");
    const openHours = open.reduce((s, t) => s + (t.estimatedHours ?? 2), 0);
    const load: Load = openHours > p.maxHoursPerWeek ? "over" : open.length ? "busy" : "free";
    return {
      ...p,
      name: p.user.name,
      open: open.length,
      openHours,
      done: p.user.tasksAssigned.length - open.length,
      hours: Math.round(hours.get(p.userId) ?? 0),
      load,
      avatar: AVATAR[i % AVATAR.length],
    };
  });
  const counts = { free: 0, busy: 0, over: 0 } as Record<Load, number>;
  for (const p of people) counts[p.load]++;
  const totalHours = people.reduce((s, p) => s + p.hours, 0);
  const shown = people.filter(
    (p) => (filter === "all" || p.load === filter) && (!skill || p.skills.includes(skill)) && (!q || p.name.toLowerCase().includes(q)),
  );
  const href = (show: string) => {
    const u = new URLSearchParams();
    if (show !== "all") u.set("show", show);
    if (skill) u.set("skill", skill);
    if (q) u.set("q", q);
    const s = u.toString();
    return s ? `/volunteers?${s}` : "/volunteers";
  };

  return (
    <>
      <PageHeader title="Volunteers" description="Who's helping, who's free, and who has too much on their plate." />

      <div className="stat-grid bg-border mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border lg:grid-cols-5">
        {[
          ["Signed up", people.length, "all"],
          ["Free to help", counts.free, "free"],
          ["Busy", counts.busy, "busy"],
          ["Overloaded", counts.over, "over"],
          ["Hours given", totalHours.toLocaleString("en-IN"), null],
        ].map(([label, value, show]) => {
          const inner = (
            <>
              <p className="text-muted-foreground text-sm">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </>
          );
          return show ? (
            <Link key={label as string} href={href(show as string)} className="bg-card hover:bg-muted/60 p-4 transition-colors sm:p-5">
              {inner}
            </Link>
          ) : (
            <div key={label as string} className="bg-card p-4 sm:p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1.5" aria-label="Filter">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href(f.key)}
              aria-current={filter === f.key ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                filter === f.key ? "border-transparent bg-[var(--page-accent)] text-white" : "hover:bg-muted",
              )}
            >
              {f.label}
              {f.key !== "all" && <span className="ml-1 opacity-75">{counts[f.key]}</span>}
            </Link>
          ))}
        </nav>
        <form action="/volunteers" className="ml-auto flex flex-wrap gap-2">
          {filter !== "all" && <input type="hidden" name="show" value={filter} />}
          <NativeSelect name="skill" defaultValue={skill ?? ""} aria-label="Skill" className="w-44">
            <option value="">Any skill</option>
            {SKILLS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
          <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={q} placeholder="Search a name" className="w-48 pl-8" aria-label="Search volunteers" />
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={HandHeartIcon} title={people.length ? "Nobody matches" : "No volunteers yet"}>
          {people.length ? "Try another filter." : "Members can sign up from their Volunteering page."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const pct = Math.min(100, Math.round((p.openHours / Math.max(1, p.maxHoursPerWeek)) * 100));
            return (
              <li key={p.userId} className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-semibold text-white shadow",
                      p.avatar,
                    )}
                  >
                    {initials(p.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                      <StarIcon className="size-3" /> {p.done} tasks done · {p.hours}h given
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", LOAD[p.load].pill)}>
                    {LOAD[p.load].label}
                  </span>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                    <span>This week</span>
                    <span className="tabular-nums">
                      {p.openHours}h of {p.maxHoursPerWeek}h · {p.open} open task{p.open === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div
                    className="bg-muted h-2 overflow-hidden rounded-full"
                    role="meter"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Workload"
                  >
                    <div className={cn("h-full rounded-full", LOAD[p.load].bar)} style={{ width: `${Math.max(pct, p.open ? 6 : 0)}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {p.skills.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-[color-mix(in_oklch,var(--page-accent)_12%,transparent)] px-2 py-0.5 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {p.skills.length > 4 && <span className="text-muted-foreground px-1 text-xs">+{p.skills.length - 4}</span>}
                </div>

                <p className="text-muted-foreground mt-auto flex items-center gap-1.5 text-xs">
                  <ClockIcon className="size-3.5 shrink-0" /> Free: {p.availability.slice(0, 3).map(slotShort).join(" · ") || "—"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
