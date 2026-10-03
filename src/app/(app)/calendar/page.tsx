import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { can, requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { param } from "@/lib/format";
import { loadCalendar } from "@/lib/calendar/load";
import { KIND_LABEL, dayKey, groupByDay, monthGrid, monthKey, parseMonth, type CalItem } from "@/lib/calendar/grid";
import { AddEntryDialog } from "./add-entry";
import { KIND_DOT, MonthGrid } from "./month-grid";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage(props: PageProps<"/calendar">) {
  // Everyone signed in gets a calendar; each source inside is permission-filtered.
  const user = await requireUser();
  const sp = await props.searchParams;
  const { year, month } = parseMonth(param(sp.m));
  const { weeks, from, to } = monthGrid(year, month);
  const items = await loadCalendar(user, from, to);
  const byDay = groupByDay(items);
  const today = dayKey(new Date());
  const title = new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const inMonth = items
    .filter((i) => i.date.getMonth() === month && i.date.getFullYear() === year)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const kinds = [...new Set(items.map((i) => i.kind))];

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Events, meetings, deadlines, expiries and your tasks — all in one place."
        actions={can(user, "calendar.manage") && <AddEntryDialog />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href={`/calendar?m=${monthKey(year, month - 1)}`} aria-label="Previous month" scroll={false}>
            <ChevronLeftIcon />
          </Link>
        </Button>
        <h2 className="min-w-40 text-center text-lg font-semibold">{title}</h2>
        <Button variant="outline" size="icon-sm" asChild>
          <Link href={`/calendar?m=${monthKey(year, month + 1)}`} aria-label="Next month" scroll={false}>
            <ChevronRightIcon />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar" scroll={false}>
            Today
          </Link>
        </Button>
        <ul className="text-muted-foreground ml-auto hidden flex-wrap gap-3 text-xs md:flex">
          {kinds.map((k) => (
            <li key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", KIND_DOT[k])} /> {KIND_LABEL[k]}
            </li>
          ))}
        </ul>
      </div>

      {/* Month grid — every day opens a pop-up with all of its items */}
      <MonthGrid
        days={weeks.flat().map((d) => ({
          iso: d.toISOString(),
          date: d.getDate(),
          inMonth: d.getMonth() === month,
          isToday: dayKey(d) === today,
          items: (byDay.get(dayKey(d)) ?? []).map((i) => ({ ...i, date: i.date.toISOString() })),
        }))}
      />

      <h2 className="mt-8 mb-3 text-sm font-semibold">This month, in order</h2>
      {/* Agenda on phones */}
      <ol className="bg-card divide-y rounded-2xl border shadow-sm">
        {inMonth.length === 0 && <li className="text-muted-foreground p-4 text-sm">Nothing scheduled this month.</li>}
        {inMonth.map((i) => (
          <li key={i.id} className="flex gap-3 p-3">
            <div className="w-10 shrink-0 text-center">
              <p className="text-muted-foreground text-[11px] uppercase">{i.date.toLocaleString("en-IN", { weekday: "short" })}</p>
              <p className={cn("text-lg font-semibold tabular-nums", dayKey(i.date) === today && "text-primary")}>{i.date.getDate()}</p>
            </div>
            <Item item={i} />
          </li>
        ))}
      </ol>
    </>
  );
}

function Item({ item: i, compact }: { item: CalItem; compact?: boolean }) {
  const body = (
    <span className={cn("flex min-w-0 items-start gap-1.5", compact ? "text-[11px] leading-tight" : "text-sm")}>
      <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", KIND_DOT[i.kind])} aria-hidden />
      <span className="min-w-0">
        <span className={cn("block", compact && "truncate")} title={`${KIND_LABEL[i.kind]}: ${i.title}`}>
          {i.title}
        </span>
        {!compact && (
          <span className="text-muted-foreground block text-xs">{[KIND_LABEL[i.kind], i.detail].filter(Boolean).join(" · ")}</span>
        )}
      </span>
    </span>
  );
  return i.href ? (
    <Link href={i.href} className="hover:bg-muted block rounded px-1 py-0.5">
      {body}
    </Link>
  ) : (
    <span className="block px-1 py-0.5">{body}</span>
  );
}
