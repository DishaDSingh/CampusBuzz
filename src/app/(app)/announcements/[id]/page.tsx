import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/common";
import { AUDIENCES, countAudience, type Audience } from "@/lib/announcements";
import { fmtDateTime } from "@/lib/format";
import { AnnouncementEditor } from "./editor";

export const metadata: Metadata = { title: "Review announcement" };

export default async function AnnouncementPage(props: PageProps<"/announcements/[id]">) {
  const user = await requirePermission("announcements.view");
  const { id } = await props.params;
  const a = await db.announcement.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true } }, event: { select: { id: true, title: true } } },
  });
  if (!a) notFound();
  if (a.status === "PUBLISHED") redirect(a.eventId ? `/events/${a.eventId}` : "/announcements");
  // Counts per audience so the editor can show who will be notified before sending.
  const keys = (Object.keys(AUDIENCES) as Audience[]).filter((k) => k !== "EVENT" || a.eventId);
  const counts = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await countAudience(k, a.eventId)] as const)));
  const pending = a.status === "PENDING";

  return (
    <>
      <PageHeader
        title={pending ? "Approve announcement" : "Review announcement"}
        description={
          pending
            ? `${a.createdBy?.name ?? "Someone"} sent this for approval ${a.submittedAt ? fmtDateTime(a.submittedAt) : ""}. Edit if needed, then approve and send — or send it back.`
            : "Edit anything. It's only sent when someone with publish rights approves it."
        }
        back={{ href: "/announcements?tab=drafts", label: "Drafts & approvals" }}
      />
      {a.event && (
        <p className="mb-4 text-sm">
          For the event{" "}
          <Link href={`/events/${a.event.id}`} className="text-primary font-medium hover:underline">
            {a.event.title}
          </Link>
        </p>
      )}
      <AnnouncementEditor
        announcement={{
          id: a.id,
          title: a.title,
          body: a.body,
          audience: a.audience as Audience,
          source: a.source,
          status: a.status,
          reviewNote: a.reviewNote,
        }}
        counts={counts as Partial<Record<Audience, number>>}
        canEdit={can(user, "announcements.create")}
        canPublish={can(user, "announcements.publish")}
      />
    </>
  );
}
