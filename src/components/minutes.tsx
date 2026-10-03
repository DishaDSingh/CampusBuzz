import { fmtDate, fmtDateTime } from "@/lib/format";

/**
 * The formal Minutes of Meeting (MoM) layout — used on the meeting page and
 * the print/PDF view so both always match.
 */
export type MinutesData = {
  title: string;
  heldAt: Date;
  committee?: string | null;
  recordedBy?: string | null;
  summary: string;
  attendees: string[];
  decisions: string[];
  questions: string[];
  actions: { task: string; owner: string | null; due: Date | null; done?: boolean }[];
};

export function MinutesDocument({ m, print }: { m: MinutesData; print?: boolean }) {
  const h2 = print
    ? "mb-2 text-base font-semibold"
    : "mb-2 text-sm font-semibold tracking-wide text-[var(--page-accent,var(--primary))] uppercase";
  return (
    <article className={print ? "text-[15px] leading-relaxed" : "grid gap-6 text-sm"}>
      <header className={print ? "mb-6" : ""}>
        <p className={print ? "text-sm tracking-wide text-neutral-500 uppercase" : "text-muted-foreground text-xs tracking-wide uppercase"}>
          Minutes of Meeting
        </p>
        <h2 className={print ? "mt-1 text-3xl font-semibold" : "font-heading mt-1 text-2xl font-semibold"}>{m.title}</h2>
        <dl className={print ? "mt-3 grid grid-cols-[8rem_1fr] gap-y-1 text-sm" : "mt-3 grid grid-cols-[7rem_1fr] gap-y-1"}>
          <dt className="text-muted-foreground">Date &amp; time</dt>
          <dd>{fmtDateTime(m.heldAt)}</dd>
          {m.committee && (
            <>
              <dt className="text-muted-foreground">Committee</dt>
              <dd>{m.committee}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Present</dt>
          <dd>{m.attendees.length ? m.attendees.join(", ") : "Not recorded"}</dd>
          {m.recordedBy && (
            <>
              <dt className="text-muted-foreground">Minutes by</dt>
              <dd>{m.recordedBy}</dd>
            </>
          )}
        </dl>
      </header>

      <section className={print ? "mb-5" : ""}>
        <h3 className={h2}>1. Summary of discussion</h3>
        <p>{m.summary || "—"}</p>
      </section>

      <section className={print ? "mb-5" : ""}>
        <h3 className={h2}>2. Decisions</h3>
        {m.decisions.length ? (
          <ol className="list-decimal space-y-1 pl-5">
            {m.decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">No decisions recorded.</p>
        )}
      </section>

      <section className={print ? "mb-5" : ""}>
        <h3 className={h2}>3. Action items</h3>
        {m.actions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left">
              <thead>
                <tr className="border-b text-xs text-neutral-500">
                  <th className="py-1.5 pr-3 font-medium">#</th>
                  <th className="py-1.5 pr-3 font-medium">Action</th>
                  <th className="py-1.5 pr-3 font-medium">Owner</th>
                  <th className="py-1.5 pr-3 font-medium">Due</th>
                  {!print && <th className="py-1.5 font-medium">Status</th>}
                </tr>
              </thead>
              <tbody>
                {m.actions.map((a, i) => (
                  <tr key={i} className="border-b align-top last:border-0">
                    <td className="py-1.5 pr-3 tabular-nums">{i + 1}</td>
                    <td className="py-1.5 pr-3">{a.task}</td>
                    <td className="py-1.5 pr-3">{a.owner ?? "—"}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{a.due ? fmtDate(a.due) : "—"}</td>
                    {!print && (
                      <td className={a.done ? "text-success py-1.5" : "text-muted-foreground py-1.5"}>{a.done ? "Done" : "Open"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No action items.</p>
        )}
      </section>

      <section>
        <h3 className={h2}>4. Open questions</h3>
        {m.questions.length ? (
          <ul className="list-disc space-y-1 pl-5">
            {m.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">None.</p>
        )}
      </section>
    </article>
  );
}
