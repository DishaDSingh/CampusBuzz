import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MinutesDocument } from "@/components/minutes";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth/current-user";
import { seesCommitteeItems } from "@/lib/calendar/load";
import { PageHeader, Section } from "@/components/common";
import { fmtDateTime } from "@/lib/format";
import { toMinutes, type StoredMinutes as Stored } from "@/lib/meetings/minutes";
import { ExtractButton, ReviewForm } from "./review";

export const metadata: Metadata = { title: "Minutes of Meeting" };

export default async function MeetingPage(props: PageProps<"/meetings/[id]">) {
  const user = await requirePermission("calendar.view");
  // Meeting notes are committee business, not for every member.
  if (!(await seesCommitteeItems(user))) redirect("/forbidden");
  const { id } = await props.params;
  const m = await db.meeting.findUnique({
    where: { id },
    include: {
      committee: { select: { name: true } },
      createdBy: { select: { name: true } },
      tasks: { select: { id: true, title: true, status: true, dueAt: true, assignee: { select: { name: true } } } },
    },
  });
  if (!m) notFound();
  const x = m.extracted as Stored | null;
  const manage = can(user, "calendar.manage");
  const people =
    manage && x && m.status !== "CONFIRMED"
      ? await db.user.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : [];

  return (
    <>
      <PageHeader
        title={m.title}
        description={[fmtDateTime(m.heldAt), m.committee?.name, m.status === "CONFIRMED" ? "Confirmed" : "Needs review"]
          .filter(Boolean)
          .join(" · ")}
        back={{ href: "/meetings", label: "Minutes of Meeting" }}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="grid content-start gap-6 lg:col-span-3">
          {m.status === "CONFIRMED" && x ? (
            <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-7">
              <div className="mb-4 flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <a href={`/print/meetings/${m.id}`} target="_blank" rel="noreferrer">
                    <PrinterIcon /> Print / PDF
                  </a>
                </Button>
              </div>
              <MinutesDocument m={toMinutes(m, x)} />
            </div>
          ) : x && manage ? (
            <ReviewForm meetingId={m.id} initial={x} people={people} source={m.source} />
          ) : manage ? (
            <Section title="Next step">
              <p className="text-muted-foreground mb-4 text-sm">
                Find the decisions, action items and open questions in these notes. You&apos;ll review and edit them before anything is
                created.
              </p>
              <ExtractButton meetingId={m.id} />
            </Section>
          ) : (
            <p className="text-muted-foreground text-sm">This meeting hasn&apos;t been reviewed yet.</p>
          )}
        </div>
        <Section title="Notes" className="lg:col-span-2">
          <pre className="text-muted-foreground max-h-[32rem] overflow-auto font-sans text-sm whitespace-pre-wrap">{m.notes}</pre>
          {m.status === "CONFIRMED" && (
            <p className="mt-3 text-xs">
              <Link href="/memory" className="text-primary hover:underline">
                Search organization memory →
              </Link>
            </p>
          )}
        </Section>
      </div>
    </>
  );
}
