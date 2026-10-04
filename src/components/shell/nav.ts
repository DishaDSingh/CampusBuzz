import {
  BadgeIndianRupeeIcon,
  CalendarDaysIcon,
  HandHeartIcon,
  HandCoinsIcon,
  WalletIcon,
  ShirtIcon,
  Building2Icon,
  ScanLineIcon,
  UserRoundCheckIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  ChartColumnIcon,
  LightbulbIcon,
  HouseIcon,
  BriefcaseBusinessIcon,
  ChartPieIcon,
  TelescopeIcon,
  ShieldIcon,
  CircleUserRoundIcon,
  SparklesIcon,
  MegaphoneIcon,
  CalendarRangeIcon,
  NotebookPenIcon,
  BrainIcon,
  FileTextIcon,
  type LucideIcon,
  NetworkIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { PermissionKey } from "@/lib/rbac/catalog";
import type { Tone } from "./tones";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visible if the user holds ANY of these. Omit = everyone signed in. */
  anyOf?: PermissionKey[];
  keywords?: string;
  /** The area's colour (sidebar chip, page accent). */
  tone?: Tone;
};

export type NavGroup = {
  label: string;
  /** Icon and colour for the collapsible group header in the sidebar. */
  icon?: LucideIcon;
  tone?: Tone;
  items: NavItem[];
};

/**
 * Single source of truth for navigation. Each phase adds its module here;
 * items the user can't access are not rendered at all (no teasing locked links).
 */
export const NAV: NavGroup[] = [
  {
    label: "Home",
    icon: HouseIcon,
    tone: "indigo",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, tone: "indigo", keywords: "home overview" },
      { href: "/announcements", label: "Announcements", icon: MegaphoneIcon, tone: "orange", keywords: "news notices updates" },
      { href: "/calendar", label: "Calendar", icon: CalendarRangeIcon, tone: "sky", keywords: "schedule deadlines reminders dates" },
    ],
  },
  {
    // Layer 1 — run the organization day to day.
    label: "Operate",
    icon: BriefcaseBusinessIcon,
    tone: "orange",
    items: [
      {
        href: "/members",
        label: "Members",
        icon: UserRoundCheckIcon,
        tone: "violet",
        anyOf: ["members.view"],
        keywords: "dues renewals expiry",
      },
      {
        href: "/members/verify",
        label: "Verify pass",
        icon: ScanLineIcon,
        tone: "fuchsia",
        anyOf: ["members.verify"],
        keywords: "scan qr door check",
      },
      { href: "/events", label: "Events", icon: CalendarDaysIcon, tone: "orange", keywords: "gala tickets check-in" },
      { href: "/merch", label: "Merch", icon: ShirtIcon, tone: "pink", keywords: "hoodie tshirt store inventory studio" },
      {
        href: "/volunteers",
        label: "Volunteers",
        icon: HandHeartIcon,
        tone: "rose",
        anyOf: ["volunteers.view"],
        keywords: "helpers roster",
      },
      {
        href: "/fundraisers",
        label: "Fundraisers",
        icon: HandCoinsIcon,
        tone: "amber",
        anyOf: ["fundraisers.view"],
        keywords: "donations goal tasks",
      },
      {
        href: "/finance",
        label: "Finance",
        icon: WalletIcon,
        tone: "emerald",
        anyOf: ["finance.view", "finance.create_expense"],
        keywords: "money expenses receipts reimbursement treasurer budget scan",
      },
    ],
  },
  {
    // Layer 2 — understand what's happening.
    label: "Understand",
    icon: ChartPieIcon,
    tone: "amber",
    items: [
      {
        href: "/insights",
        label: "Insights",
        icon: LightbulbIcon,
        tone: "amber",
        anyOf: ["analytics.view"],
        keywords: "alerts pulse health warnings",
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: ChartColumnIcon,
        tone: "blue",
        anyOf: ["analytics.view"],
        keywords: "charts trends growth stats",
      },
      {
        href: "/reports",
        label: "Reports",
        icon: FileTextIcon,
        tone: "teal",
        anyOf: ["reports.view"],
        keywords: "summary handover annual export pdf",
      },
    ],
  },
  {
    // Layer 3 — anticipate and remember.
    label: "Anticipate",
    icon: TelescopeIcon,
    tone: "fuchsia",
    items: [
      {
        href: "/meetings",
        label: "Minutes of Meeting",
        icon: NotebookPenIcon,
        tone: "cyan",
        anyOf: ["calendar.manage", "committees.view"],
        keywords: "mom minutes meetings notes transcript decisions actions",
      },
      {
        href: "/memory",
        label: "Memory",
        icon: BrainIcon,
        tone: "indigo",
        anyOf: ["reports.view"],
        keywords: "history lessons vendors sponsors decisions knowledge",
      },
    ],
  },
  {
    label: "Administration",
    icon: ShieldIcon,
    tone: "slate",
    items: [
      { href: "/admin/users", label: "Users", icon: UsersIcon, tone: "blue", anyOf: ["users.view"], keywords: "people accounts" },
      {
        href: "/admin/roles",
        label: "Roles & permissions",
        icon: ShieldCheckIcon,
        tone: "violet",
        anyOf: ["roles.view"],
        keywords: "rbac access",
      },
      { href: "/admin/departments", label: "Departments", icon: NetworkIcon, tone: "teal", anyOf: ["departments.view"] },
      { href: "/admin/committees", label: "Committees", icon: UsersRoundIcon, tone: "lime", anyOf: ["committees.view"] },
      {
        href: "/members/plans",
        label: "Membership plans",
        icon: BadgeIndianRupeeIcon,
        tone: "emerald",
        anyOf: ["members.view"],
        keywords: "price dues benefits",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: HistoryIcon,
        tone: "slate",
        anyOf: ["audit.view"],
        keywords: "history activity security",
      },
      {
        href: "/admin/organization",
        label: "Organization",
        icon: Building2Icon,
        tone: "indigo",
        anyOf: ["organization.view"],
        keywords: "settings",
      },
    ],
  },
  {
    label: "You",
    icon: CircleUserRoundIcon,
    tone: "sky",
    items: [
      { href: "/me/volunteering", label: "Volunteering", icon: HandHeartIcon, tone: "rose", keywords: "my tasks help" },
      { href: "/me", label: "My membership", icon: BadgeIndianRupeeIcon, tone: "emerald", keywords: "renew dues join" },
      { href: "/profile", label: "My profile & access", icon: UserCircleIcon, tone: "sky", keywords: "password account" },
      { href: "/ai", label: "How AI works here", icon: SparklesIcon, tone: "fuchsia", keywords: "ai principles privacy human review" },
    ],
  },
];

export function visibleNav(permissions: ReadonlySet<string>): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.anyOf || i.anyOf.some((p) => permissions.has(p))) })).filter(
    (g) => g.items.length > 0,
  );
}
