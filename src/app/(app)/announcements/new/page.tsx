import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/common";
import { aiConfigured } from "@/lib/ai/claude";
import { param } from "@/lib/format";
import { DraftForm } from "./draft-form";
import { db } from "@/lib/db";
import { countAudience } from "@/lib/announcements";
import { AUDIENCE_KEYS } from "@/lib/announcement-templates";

export const metadata: Metadata = { title: "New announcement" };

export default async function NewAnnouncementPage(props: PageProps<"/announcements/new">) {
  await requirePermission("announcements.create");
  const sp = await props.searchParams;
  const [org, counts] = await Promise.all([
    db.organization.findFirst({ select: { name: true } }),
    Promise.all(AUDIENCE_KEYS.map(async (k) => [k, await countAudience(k)] as const)).then((e) => Object.fromEntries(e)),
  ]);
  return (
    <>
      <PageHeader
        title="New announcement"
        description="Pick who it's for — a matching message is filled in for you. Edit anything; nothing is sent yet."
        back={{ href: "/announcements?tab=drafts", label: "Announcements" }}
      />
      <DraftForm
        ai={aiConfigured()}
        brief={param(sp.brief) ?? ""}
        audience={AUDIENCE_KEYS.find((a) => a === param(sp.audience)) ?? "MEMBERS"}
        counts={counts}
        org={org?.name ?? "the committee"}
      />
    </>
  );
}
