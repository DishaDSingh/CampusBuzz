import { CalendarDaysIcon, CheckCircle2Icon, SparklesIcon, TicketIcon, UsersIcon } from "lucide-react";
import { Logo } from "@/components/shell/logo";

const float = (delay: string, tilt: string) =>
  ({ animation: `cb-float 6s ease-in-out ${delay} infinite`, "--tilt": tilt }) as React.CSSProperties;

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative grid min-h-svh overflow-hidden bg-linear-to-br from-indigo-50 via-white to-fuchsia-50 lg:grid-cols-[1fr_1.15fr] dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950">
      {/* Soft colour behind the form */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-[28rem] rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-700/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10rem] left-1/4 size-[24rem] rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/10"
      />

      <div className="relative flex flex-col px-4 py-8 sm:px-10">
        <Logo className="text-lg" />
        <div className="flex flex-1 items-center justify-center py-10">
          <div
            className="bg-card/85 w-full max-w-md rounded-3xl border border-white/60 p-6 shadow-2xl ring-1 shadow-violet-500/10 ring-black/5 backdrop-blur-xl sm:p-9 dark:border-white/10"
            style={{ animation: "cb-pop 500ms cubic-bezier(0.2,0.7,0.2,1) both" }}
          >
            {children}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">Runs locally · your data stays on your organization&apos;s server</p>
      </div>

      <aside className="relative m-3 hidden [animation:cb-gradient_14s_ease_infinite] overflow-hidden rounded-[2rem] bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 bg-[length:200%_200%] p-14 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-amber-300/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-400/30 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.08]"
        />

        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-amber-100 ring-1 ring-white/25 backdrop-blur">
            <SparklesIcon className="size-3.5" /> The operating system for student organizations
          </p>
          <h2 className="font-heading mt-5 max-w-lg text-5xl leading-[1.05] font-semibold tracking-tight text-balance">
            Run your club like it&apos;s <span className="text-amber-200 italic">already famous.</span>
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Members, events, money and people in one place, with a clear record of who did what.
          </p>
        </div>

        {/* A peek at the app: floating cards */}
        <div className="relative my-10 h-64" aria-hidden>
          <div className="absolute top-0 left-0 w-64 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl" style={float("0s", "-3deg")}>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-600">
              <CalendarDaysIcon className="size-3.5" /> Next event
            </p>
            <p className="font-heading mt-1 text-lg font-semibold">Diwali Gala 2026</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              {[
                ["12", "days"],
                ["08", "hrs"],
                ["45", "min"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-lg bg-violet-50 py-1.5">
                  <p className="text-lg font-bold text-violet-700 tabular-nums">{n}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-6 right-2 w-52 rounded-2xl bg-white/95 p-4 text-slate-900 shadow-2xl" style={float("1.2s", "4deg")}>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <TicketIcon className="size-3.5" /> Tickets sold
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">412</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full w-4/5 rounded-full bg-linear-to-r from-emerald-400 to-teal-500" />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">82% of capacity</p>
          </div>
          <div
            className="absolute bottom-0 left-1/3 flex w-60 items-center gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-2xl"
            style={float("2.4s", "-1deg")}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-pink-400 to-rose-600 text-sm font-semibold text-white">
              AK
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Aarav K. checked in</p>
              <p className="text-[11px] text-slate-500">Member pass · just now</p>
            </div>
            <CheckCircle2Icon className="size-5 text-emerald-500" />
          </div>
        </div>

        <ul className="relative grid grid-cols-3 gap-3 text-sm">
          {[
            ["Operate", "Members, events, merch, volunteers, finance"],
            ["Understand", "Analytics, insights, reports"],
            ["Anticipate", "Calendar, reminders, minutes"],
          ].map(([title, body]) => (
            <li key={title} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur">
              <span className="block font-semibold">{title}</span>
              <span className="text-xs text-white/75">{body}</span>
            </li>
          ))}
        </ul>
        <p className="relative mt-4 flex items-center gap-1.5 text-xs text-white/70">
          <UsersIcon className="size-3.5" /> Built for councils, committees and every volunteer in between.
        </p>
      </aside>
    </div>
  );
}
