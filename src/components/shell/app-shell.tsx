"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  UserMinus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_LABELS, type NavItem } from "@/lib/nav";
import { signOutAction } from "@/lib/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Boxes, CalendarClock, ClipboardList, ClipboardCheck,
  UserMinus, Users, Building2, Sparkles, BarChart3, ScrollText, Settings,
};

export interface ShellOrg {
  slug: string;
  name: string;
}

export interface ShellUser {
  name: string;
  email: string;
  role: string;
}

interface AppShellProps {
  org: ShellOrg;
  orgs: ShellOrg[];
  user: ShellUser;
  navItems: NavItem[];
  unreadCount: number;
  isReadOnly?: boolean;
  children: React.ReactNode;
}

export function AppShell({ org, orgs, user, navItems, unreadCount, isReadOnly, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarContent org={org} orgs={orgs} navItems={navItems} />
      </aside>

      <div className="lg:pl-60">
        {isReadOnly ? (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] px-4 py-1.5 text-center text-xs text-[color:var(--warning)]">
            <span className="font-medium">You&apos;re exploring a read-only demo.</span>
            <Link href="/auth/sign-up" className="font-semibold underline underline-offset-2 hover:opacity-80">
              Create your own free workspace →
            </Link>
          </div>
        ) : null}
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent org={org} orgs={orgs} navItems={navItems} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <Link
            href={`/app/${org.slug}/notifications`}
            className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          >
            <BellRing className="size-4.5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar>
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium normal-case text-foreground">{user.name}</div>
                <div className="truncate text-xs font-normal normal-case text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/app/${org.slug}/settings`}>
                  <Settings className="size-4" /> Organization settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <form action={signOutAction} className="w-full">
                  <button type="submit" className="flex w-full items-center gap-2">
                    <LogOut className="size-4" /> Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  org,
  orgs,
  navItems,
  onNavigate,
}: {
  org: ShellOrg;
  orgs: ShellOrg[];
  navItems: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/app/${org.slug}`;
  const sections: NavItem["section"][] = ["overview", "manage", "govern"];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href={base} className="flex items-center" onClick={onNavigate} aria-label="Stackceipt home">
          <Wordmark height={40} />
        </Link>
      </div>

      {/* Org switcher */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-lg border border-sidebar-border bg-card px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{org.name}</span>
                <span className="block text-xs text-muted-foreground">{org.slug}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[13.5rem]">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {orgs.map((o) => (
              <DropdownMenuItem key={o.slug} asChild>
                <Link href={`/app/${o.slug}`} onClick={onNavigate}>
                  <span className="flex-1 truncate">{o.name}</span>
                  {o.slug === org.slug && <Check className="size-4" />}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/onboarding" onClick={onNavigate}>Create organization</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {sections.map((section) => {
          const items = navItems.filter((n) => n.section === section);
          if (items.length === 0) return null;
          return (
            <div key={section} className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-muted">
                {SECTION_LABELS[section]}
              </div>
              {items.map((item) => {
                const href = item.segment ? `${base}/${item.segment}` : base;
                const active = item.segment
                  ? pathname.startsWith(href)
                  : pathname === base;
                const Icon = ICONS[item.icon] ?? Boxes;
                return (
                  <Link
                    key={item.label}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Badge variant="soft" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-[color:var(--success)]" />
          Connected
        </Badge>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
