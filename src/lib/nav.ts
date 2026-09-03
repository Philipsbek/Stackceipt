import type { PermissionKey } from "@/lib/domain/permissions";

export interface NavItem {
  label: string;
  segment: string; // appended to /app/[slug]
  icon: string; // lucide icon name
  permission?: PermissionKey;
  /** Show only to owner/admin/manager (not plain members). */
  section: "overview" | "manage" | "govern";
}

/** Icon names resolved in the client shell against a small lucide map. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", segment: "", icon: "LayoutDashboard", section: "overview" },
  { label: "Subscriptions", segment: "subscriptions", icon: "Boxes", section: "overview" },
  { label: "Renewals", segment: "renewals", icon: "CalendarClock", section: "overview", permission: "review.read" },

  { label: "Requests", segment: "requests", icon: "ClipboardList", section: "manage" },
  { label: "Reviews", segment: "reviews", icon: "ClipboardCheck", section: "manage", permission: "review.read" },
  { label: "Offboarding", segment: "offboarding", icon: "UserMinus", section: "manage", permission: "offboarding.read" },
  { label: "Team", segment: "team", icon: "Users", section: "manage", permission: "member.read" },
  { label: "Departments", segment: "departments", icon: "Building2", section: "manage", permission: "department.read" },

  { label: "Janitor", segment: "janitor", icon: "Sparkles", section: "govern", permission: "janitor.read" },
  { label: "Reports", segment: "reports", icon: "BarChart3", section: "govern", permission: "report.read" },
  { label: "Audit log", segment: "audit", icon: "ScrollText", section: "govern", permission: "audit.read" },
  { label: "Settings", segment: "settings", icon: "Settings", section: "govern", permission: "organization.read" },
];

export const SECTION_LABELS: Record<NavItem["section"], string> = {
  overview: "Overview",
  manage: "Manage",
  govern: "Govern",
};
