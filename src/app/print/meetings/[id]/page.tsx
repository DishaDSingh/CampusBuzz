import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { seesCommitteeItems } from "@/lib/calendar/load";
import { MinutesDocument } from "@/components/minutes";
import { toMinutes, type StoredMinutes } from "@/lib/meetings/minutes";
import { PrintButton } from "../../reports/[id]/print-button";

export const metadata: Metadata = { title: "Print minutes" };

/** Clean printable Minutes of Meeting — use Print → Save as PDF. */
export default async function PrintMinutesPage(props: PageProps<"/print/meetings/[id]">) {
  const user = await requirePermission("calendar.view");
  if (!(await seesCommitteeItems(user))) redirect("/forbidden");
  const { id } = await props.params;
  const [m, org] = await Promise.all([
    db.meeting.findUnique({
      where: { id },
      include: {
        committee: { select: { name: true } },
        createdBy: { select: { name: true } },
        tasks: { select: { title: true, status: true, dueAt: true, assignee: { select: { name: true } } } },
      },
    }),
    db.organization.findFirst({ select: { name: true } }),
  ]);
  if (!m || m.status !== "CONFIRMED" || !m.extracted) notFound();

  return (
    <main className="mx-auto max-w-[46rem] bg-white px-6 py-10 text-neutral-900 print:px-0 print:py-0">
      <div className="mb-8 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-neutral-500">Use Print → “Save as PDF” to export.</p>
        <PrintButton />
      </div>
      <p className="mb-4 text-sm tracking-wide text-neutral-500 uppercase">{org?.name}</p>
      <MinutesDocument m={toMinutes(m, m.extracted as StoredMinutes)} print />
    </main>
  );
}
