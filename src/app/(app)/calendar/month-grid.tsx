"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { KIND_LABEL, type CalItem } from "@/lib/calendar/grid";

export const KIND_DOT: Record<CalItem["kind"], string> = {
  event: "bg-primary",
  sales: "bg-info",
  meeting: "bg-violet-500",
  deadline: "bg-warning",
  expiry: "bg-destructive",
  fundraiser: "bg-success",
  task: "bg-amber-600",
  payment: "bg-rose-500",
};

/** Items cross the server→client boundary with ISO dates. */
export type GridItem = Omit<CalItem, "date"> & { date: string };
type Day = { iso: string; date: number; inMonth: boolean; isToday: boolean; items: GridItem[] };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

/**
 * Month grid where every day is clickable: the cell shows a short preview,
 * and clicking opens a pop-up with everything on that date.
 */
export function MonthGrid({ days }: { days: Day[] }) {
  const [open, setOpen] = useState<Day | null>(null);

  return (
    <>
      <div className="bg-border grid grid-cols-7 gap-px overflow-hidden rounded-2xl border shadow-sm">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-muted/60 text-muted-foreground px-2 py-1.5 text-center text-[11px] font-semibold tracking-wide uppercase sm:text-left"
          >
            {d}
          </div>
        ))}
        {days.map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => setOpen(d)}
            aria-label={`${new Date(d.iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}: ${d.items.length} item${d.items.length === 1 ? "" : "s"}`}
            className={cn(
              "group bg-card relative flex min-h-16 flex-col p-1.5 text-left transition-colors hover:bg-[color-mix(in_oklch,var(--page-accent)_8%,var(--card))] focus-visible:z-10 sm:min-h-28",
              !d.inMonth && "bg-muted/30 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors",
                d.isToday ? "bg-[var(--page-accent)] font-semibold text-white" : "group-hover:bg-muted",
              )}
            >
              {d.date}
            </span>
            {/* Phones: just dots. Larger screens: short titles. */}
            <span className="flex flex-wrap gap-0.5 sm:hidden">
              {d.items.slice(0, 4).map((i) => (
                <span key={i.id} className={cn("size-1.5 rounded-full", KIND_DOT[i.kind])} />
              ))}
            </span>
            <span className="hidden w-full gap-0.5 sm:grid">
              {d.items.slice(0, 3).map((i) => (
                <span key={i.id} className="flex min-w-0 items-center gap-1 text-[11px] leading-tight">
                  <span className={cn("size-1.5 shrink-0 rounded-full", KIND_DOT[i.kind])} />
                  <span className="truncate">{i.title}</span>
                </span>
              ))}
              {d.items.length > 3 && (
                <span className="text-muted-foreground px-0.5 text-[11px] font-medium">+{d.items.length - 3} more</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">
                  {new Date(open.iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </DialogTitle>
                <DialogDescription>
                  {open.items.length ? `${open.items.length} thing${open.items.length === 1 ? "" : "s"} on this day` : "Nothing scheduled."}
                </DialogDescription>
              </DialogHeader>
              {open.items.length ? (
                <ul className="-mx-2 grid max-h-[60vh] gap-1 overflow-y-auto">
                  {[...open.items]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((i) => {
                      const inner = (
                        <>
                          <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", KIND_DOT[i.kind])} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{i.title}</span>
                            <span className="text-muted-foreground block text-xs">
                              {[KIND_LABEL[i.kind], i.kind === "expiry" ? null : time(i.date), i.detail].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </>
                      );
                      return (
                        <li key={i.id}>
                          {i.href ? (
                            <Link href={i.href} className="hover:bg-muted flex gap-3 rounded-lg px-2 py-2 text-sm transition-colors">
                              {inner}
                            </Link>
                          ) : (
                            <div className="flex gap-3 px-2 py-2 text-sm">{inner}</div>
                          )}
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <CalendarDaysIcon className="size-4" /> A free day.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
