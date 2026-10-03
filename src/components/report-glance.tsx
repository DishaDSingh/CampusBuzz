import { SparklesIcon } from "lucide-react";
import { summarizeReport, type Section } from "@/lib/reports/types";

/** "At a glance": the report's headline and key figures, taken straight from its own text. */
export function ReportGlance({ sections, print }: { sections: Section[]; print?: boolean }) {
  const { headline, points } = summarizeReport(sections);
  if (!headline && !points.length) return null;
  if (print) {
    return (
      <section className="mb-6 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
        <h2 className="mb-1 text-sm font-semibold tracking-wide text-neutral-500 uppercase">At a glance</h2>
        <p className="font-medium">{headline}</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section className="mb-4 max-w-3xl overflow-hidden rounded-2xl border bg-linear-to-br from-[color-mix(in_oklch,var(--page-accent)_14%,transparent)] to-transparent p-4 shadow-sm sm:p-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--page-accent)] uppercase">
        <SparklesIcon className="size-3.5" /> At a glance
      </p>
      <p className="font-heading mt-1 text-lg leading-snug font-semibold">{headline}</p>
      {points.length > 0 && (
        <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--page-accent)]" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
