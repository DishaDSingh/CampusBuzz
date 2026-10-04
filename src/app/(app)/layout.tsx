import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { AppShell } from "@/components/shell/app-shell";
import { Assistant } from "@/components/shell/assistant";
import { allowed } from "@/lib/copilot/answers";
import { INTENTS } from "@/lib/copilot/router";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const org = await db.organization.findFirst({ select: { shortName: true } });

  return (
    <>
      <AppShell
        user={{ name: user.name, email: user.email, isMasterAdmin: user.isMasterAdmin, roleNames: user.roles.map((r) => r.name) }}
        orgShortName={org?.shortName ?? ""}
        permissions={[...user.permissions]}
        impersonator={user.impersonator?.name}
      >
        {children}
      </AppShell>
      {/* Buzz, the assistant: on every page, answering only from what this person may see. */}
      <Assistant
        firstName={user.name.split(" ")[0]}
        roleLabel={user.roles[0]?.name ?? "Member"}
        isMasterAdmin={user.isMasterAdmin}
        intents={INTENTS.filter((i) => allowed(user, i))}
      />
    </>
  );
}
