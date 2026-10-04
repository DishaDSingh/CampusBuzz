import type { Metadata } from "next";
import Link from "next/link";
import { MegaphoneIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/auth/current-user";
import { EmptyState, PageHeader, PageTabs, activeTab } from "@/components/common";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { AUDIENCES, visibleAnnouncementsWhere, type Audience } from "@/lib/announcements";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage(props: PageProps<"/announcements">) {
  // Published announcements are for everyone; drafts need announcements.view.
  const user = await requireUser();
  const sp = await props.searchParams;
  const editor = can(user, "announcements.view");
  const tab = editor ? activeTab(["sent", "drafts"] as const, sp.tab) : "sent";
  // Editors see everything that was sent; everyone else sees what was addressed to them.
  const sentWhere = editor ? { status: "PUBLISHED" } : await visibleAnnouncementsWhere(user.id);
  const [list, drafts, approvals] = await Promise.all([
    db.announcement.findMany({
      where: tab === "drafts" ? { status: { in: ["DRAFT", "PENDING"] } } : sentWhere,
      // Waiting for approval first ("PENDING" sorts after "DRAFT", so descending).
      orderBy: tab === "drafts" ? [{ status: "desc" }, { updatedAt: "desc" }] : { publishedAt: "desc" },
      take: 50,
      include: { createdBy: { select: { name: true } }, event: { select: { id: true, title: true } } },
    }),
    editor ? db.announcement.count({ where: { status: { in: ["DRAFT", "PENDING"] } } }) : 0,
    editor ? db.announcement.count({ where: { status: "PENDING" } }) : 0,
  ]);

  return (
    <>
      <PageHeader
        title="Announcements"
        description={
          editor ? "Draft, review, then send. Nothing goes out until someone with publish rights confirms." : "News from the committee."
        }
        actions={
          can(user, "announcements.create") && (
            <Button asChild>
              <Link href="/announcements/new">
                <PlusIcon /> New announcement
              </Link>
            </Button>
          )
        }
      />
      {editor && (
        <PageTabs
          basePath="/announcements"
          current={tab}
          tabs={[
            { key: "sent", label: "Sent" },
            {
              key: "drafts",
              label: approvals ? `Drafts · ${approvals} to approve` : "Drafts",
              count: approvals ? undefined : drafts || undefined,
            },
          ]}
        />
      )}
      {list.length === 0 ? (
        <EmptyState icon={MegaphoneIcon} title={tab === "drafts" ? "No drafts" : "No announcements yet"} />
      ) : tab === "drafts" ? (
        <ul className="bg-card divide-y rounded-xl border">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                href={`/announcements/${a.id}`}
                className="hover:bg-muted/50 flex items-center gap-4 px-4 py-3 transition-colors sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {a.title}
                    {a.source === "ai" && <SparklesIcon className="text-primary size-3.5 shrink-0" aria-label="AI draft" />}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {a.event ? `${a.event.title} · ` : ""}For {AUDIENCES[a.audience as Audience].toLowerCase()} · {a.createdBy?.name ?? "—"}{" "}
                    · {fmtDateTime(a.updatedAt)}
                  </p>
                </div>
                {a.status === "PENDING" ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                    Needs approval
                  </span>
                ) : a.reviewNote ? (
                  <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Changes requested</span>
                ) : (
                  <span className="text-muted-foreground text-xs font-medium">Draft</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="grid max-w-3xl gap-4">
          {list.map((a) => (
            <li key={a.id} className="bg-card rounded-xl border p-4 sm:p-5">
              <p className="text-muted-foreground text-xs">
                {fmtDate(a.publishedAt)} · {a.createdBy?.name ?? "Committee"}
                {editor && ` · sent to ${a.recipients}`}
              </p>
              <h2 className="mt-1 font-semibold">{a.title}</h2>
              {a.event && (
                <Link href={`/events/${a.event.id}`} className="text-primary text-xs font-medium hover:underline">
                  {a.event.title} →
                </Link>
              )}
              <p className="mt-2 text-sm whitespace-pre-line">{a.body}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
