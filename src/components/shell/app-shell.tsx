"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDownIcon, EyeIcon, LogOutIcon, MenuIcon, MonitorIcon, MoonIcon, SearchIcon, SunIcon, UserCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { BuzzToggle } from "./assistant";
import { visibleNav, type NavGroup } from "./nav";
import { TONES } from "./tones";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/actions";
import { stopImpersonation } from "@/app/(app)/admin/users/impersonate";

type ShellUser = { name: string; email: string; isMasterAdmin: boolean; roleNames: string[] };

export function AppShell({
  user,
  orgShortName,
  permissions,
  impersonator,
  children,
}: {
  user: ShellUser;
  orgShortName: string;
  permissions: string[];
  /** Name of the Master Admin viewing the app as this user, if any. */
  impersonator?: string;
  children: React.ReactNode;
}) {
  const nav = useMemo(() => visibleNav(new Set(permissions)), [permissions]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  // The page's area colour, from the most specific matching nav item.
  const activeItem = nav
    .flatMap((g) => g.items)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const accent = TONES[activeItem?.tone ?? "indigo"].accent;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sidebar-surface sticky top-0 hidden h-svh flex-col lg:flex">
        <SidebarContent nav={nav} orgShortName={orgShortName} pathname={pathname} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="sidebar-surface w-[272px] border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent nav={nav} orgShortName={orgShortName} pathname={pathname} />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-col" style={{ "--page-accent": accent } as React.CSSProperties}>
        {/* Soft glow in the page's colour behind the header area. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-80 opacity-[0.28] dark:opacity-[0.3]"
          style={{
            background:
              "radial-gradient(55% 90% at 15% 0%, var(--page-accent), transparent 70%), radial-gradient(35% 70% at 65% 0%, oklch(0.7 0.2 330), transparent 70%), radial-gradient(40% 80% at 100% 0%, oklch(0.7 0.15 230), transparent 70%)",
          }}
        />
        {impersonator && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950"
          >
            <EyeIcon className="size-4" />
            <span>
              {impersonator}, you&apos;re viewing as <strong>{user.name}</strong>. Everything you do is logged under your name.
            </span>
            <form action={stopImpersonation}>
              <button type="submit" className="rounded-md bg-amber-950 px-2.5 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-900">
                Return to my account
              </button>
            </form>
          </div>
        )}
        <header className="bg-background/70 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <MenuIcon />
          </Button>
          <Logo className="lg:hidden" href="/dashboard" />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="bg-muted/40 text-muted-foreground hover:bg-muted ml-auto flex h-8 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors sm:w-64 lg:ml-0"
          >
            <SearchIcon className="size-4" />
            <span className="hidden sm:inline">Jump to…</span>
            <kbd className="bg-background ml-auto hidden rounded border px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="flex items-center gap-1 lg:ml-auto">
            <BuzzToggle />
            <NotificationBell />
            <ThemeMenu />
            <UserMenu user={user} />
          </div>
        </header>
        <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>

      <NavPalette nav={nav} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function SidebarContent({ nav, orgShortName, pathname }: { nav: NavGroup[]; orgShortName: string; pathname: string }) {
  // The most specific match wins, so /members/verify doesn't also light up /members.
  const activeHref = nav
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  const activeGroup = nav.find((g) => g.items.some((i) => i.href === activeHref))?.label;
  // Groups start collapsed except the one you're in; clicking a header opens/closes it.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (label: string) => toggled[label] ?? label === activeGroup;

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <Logo href="/dashboard" className="text-white" />
        <span className="ml-auto truncate rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white/80 ring-1 ring-white/15">
          {orgShortName}
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main">
        <ul className="grid gap-1">
          {nav.map((group) => {
            const open = isOpen(group.label);
            const tone = TONES[group.tone ?? "indigo"];
            const GroupIcon = group.icon;
            const hasActive = group.label === activeGroup;
            const id = `nav-${group.label.toLowerCase()}`;
            return (
              <li key={group.label}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={id}
                  onClick={() => setToggled((t) => ({ ...t, [group.label]: !open }))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors",
                    open || hasActive ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {GroupIcon && (
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
                      <GroupIcon className="size-4" />
                    </span>
                  )}
                  <span className="flex-1">{group.label}</span>
                  {!open && (
                    <span className="rounded-full bg-white/10 px-1.5 text-[11px] font-medium text-white/60 tabular-nums">
                      {group.items.length}
                    </span>
                  )}
                  <ChevronDownIcon
                    className={cn("size-4 text-white/60 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}
                  />
                </button>
                {/* Smooth open/close: the grid row animates between 0fr and 1fr. */}
                <div
                  id={id}
                  className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                >
                  <ul className="ml-[1.35rem] grid gap-0.5 overflow-hidden border-l border-white/10 pl-2" inert={!open}>
                    {group.items.map((item, i) => {
                      const active = item.href === activeHref;
                      const itemTone = TONES[item.tone ?? "indigo"];
                      return (
                        <li key={item.href} className={cn(i === 0 && "mt-1", i === group.items.length - 1 && "mb-1.5")}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            style={active ? ({ "--tone": itemTone.accent } as React.CSSProperties) : undefined}
                            className={cn(
                              "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-all",
                              active
                                ? "bg-white/15 font-medium text-white shadow-[inset_3px_0_0_var(--tone),0_1px_8px_-2px_rgb(0_0_0/0.3)]"
                                : "text-white/70 hover:bg-white/10 hover:text-white",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105",
                                itemTone.chip,
                              )}
                            >
                              <item.icon className="size-3" />
                            </span>
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function NavPalette({ nav, open, onOpenChange }: { nav: NavGroup[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Jump to" description="Search pages you have access to">
      <CommandInput placeholder="Search pages…" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        {nav.map((g) => (
          <CommandGroup key={g.label} heading={g.label}>
            {g.items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.keywords ?? ""}`}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
              >
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

function ThemeMenu() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <SunIcon /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonIcon /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <MonitorIcon /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-1.5" aria-label="Account menu">
          <Initials name={user.name} />
          <span className="hidden max-w-32 truncate text-sm md:inline">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {user.isMasterAdmin ? "Master Admin" : user.roleNames.slice(0, 2).join(" · ") || "No role"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserCircleIcon /> My profile & access
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => logout()}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        className,
      )}
    >
      {initials}
    </span>
  );
}
