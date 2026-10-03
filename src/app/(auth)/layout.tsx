import { Logo } from "@/components/shell/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-muted-foreground text-xs">Runs locally · your data stays on your organization&apos;s server</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white lg:flex lg:flex-col lg:justify-center lg:p-16">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-amber-300/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-400/30 blur-3xl" />
        <p className="relative text-sm font-medium text-amber-200">The operating system for student organizations</p>
        <h2 className="font-heading relative mt-3 max-w-md text-4xl font-semibold tracking-tight text-balance">
          Members, events, money and people — in one place, with a clear record of who did what.
        </h2>
        <ul className="relative mt-10 grid max-w-md gap-4 text-sm text-white/80">
          {[
            ["Operate", "Members · Events · Tickets · Merch · Volunteers · Finance"],
            ["Understand", "Analytics · Insights · Copilot · Reports · Pulse"],
            ["Anticipate", "What-if simulation · Alerts · Organization memory"],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white ring-1 ring-white/30">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold text-white">{title}</span>
                {body}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
