"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { MemberRow } from "@/lib/data/collections";
import { formatDate } from "@/lib/domain/dates";
import { ORGANIZATION_ROLES, MEMBERSHIP_STATUSES, ROLE_LABELS, MEMBERSHIP_STATUS_LABELS } from "@/lib/domain/enums";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleBadge, MembershipStatusBadge } from "@/components/stackceipt/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const JOINED_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
] as const;

export function TeamTable({ team, base }: { team: MemberRow[]; base: string }) {
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [dept, setDept] = React.useState("all");
  const [joined, setJoined] = React.useState("all");

  const roleOptions = ORGANIZATION_ROLES.filter((r) => team.some((m) => m.role === r));
  const statusOptions = MEMBERSHIP_STATUSES.filter((s) => team.some((m) => m.status === s));
  const deptOptions = React.useMemo(() => {
    const set = new Set<string>();
    team.forEach((m) => m.departmentNames.forEach((d) => set.add(d)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [team]);

  const q = query.trim().toLowerCase();
  const joinedCutoff =
    joined === "all" ? null : Date.now() - Number(joined) * 24 * 60 * 60 * 1000;

  const filtered = team.filter((m) => {
    if (q && !`${m.fullName} ${m.email}`.toLowerCase().includes(q)) return false;
    if (role !== "all" && m.role !== role) return false;
    if (status !== "all" && m.status !== status) return false;
    if (dept !== "all" && !m.departmentNames.includes(dept)) return false;
    if (joinedCutoff !== null) {
      if (!m.joinedAt || new Date(m.joinedAt).getTime() < joinedCutoff) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            aria-label="Search members"
            className="h-9 w-full rounded-lg border border-transparent bg-secondary pl-9 pr-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-border focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
          />
        </div>

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-36" aria-label="Filter by role"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roleOptions.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((s) => <SelectItem key={s} value={s}>{MEMBERSHIP_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-44" aria-label="Filter by department"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {deptOptions.length === 0 ? (
              <SelectItem value="__none" disabled>No departments</SelectItem>
            ) : (
              deptOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)
            )}
          </SelectContent>
        </Select>

        <Select value={joined} onValueChange={setJoined}>
          <SelectTrigger className="w-40" aria-label="Filter by joined date"><SelectValue placeholder="Joined" /></SelectTrigger>
          <SelectContent>
            {JOINED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No members match these filters.</Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Departments</TableHead>
                  <TableHead className="text-right">Assignments</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8"><AvatarFallback>{initials(m.fullName)}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-medium">{m.fullName}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={m.role} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MembershipStatusBadge status={m.status} />
                        {m.hasOpenOffboarding ? <Badge variant="warning">Offboarding</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.departmentNames.length ? (
                        <div className="flex flex-wrap gap-1">
                          {m.departmentNames.map((d) => <Badge key={d} variant="soft">{d}</Badge>)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.subscriptionCount}</TableCell>
                    <TableCell className="text-muted-foreground">{m.joinedAt ? formatDate(m.joinedAt.slice(0, 10)) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`${base}/team/${m.id}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">View</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 md:hidden">
            {filtered.map((m) => (
              <Link key={m.id} href={`${base}/team/${m.id}`}>
                <Card className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9"><AvatarFallback>{initials(m.fullName)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="font-medium">{m.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                      {m.departmentNames.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {m.departmentNames.slice(0, 3).map((d) => <Badge key={d} variant="soft" className="text-[10px]">{d}</Badge>)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <RoleBadge role={m.role} />
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
