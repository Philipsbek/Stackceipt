"use client";

import * as React from "react";
import { Search } from "lucide-react";
import type { Member } from "@/lib/domain/types";
import type { DepartmentRow } from "@/lib/data/collections";
import { Money } from "@/components/stackceipt/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/stackceipt/states";
import { DepartmentDialog } from "./department-dialog";
import { DepartmentMembers, type DeptMember } from "./department-members";

export function DepartmentsGrid({
  orgSlug,
  baseCurrency,
  departments,
  members,
  roster,
  canCreate,
  canManage,
}: {
  orgSlug: string;
  baseCurrency: string;
  departments: DepartmentRow[];
  members: Member[];
  roster: DeptMember[];
  canCreate: boolean;
  canManage: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? departments.filter((d) => d.name.toLowerCase().includes(q)) : departments;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search departments…"
          aria-label="Search departments"
          className="h-9 w-full rounded-lg border border-transparent bg-secondary pl-9 pr-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-border focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
        />
      </div>

      {departments.length === 0 ? (
        <EmptyState title="No departments yet" description="Create a department to organize subscriptions and spend." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching departments" description={`Nothing matches “${query.trim()}”.`} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const deptMembers: DeptMember[] = d.memberIds
              .map((id) => members.find((m) => m.id === id))
              .filter((m): m is Member => Boolean(m))
              .map((m) => ({ id: m.id, name: m.fullName, email: m.email }));
            return (
              <Card key={d.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{d.name}</CardTitle>
                    <div className="flex items-center gap-1.5">
                      {d.managerName ? <Badge variant="soft">{d.managerName}</Badge> : <Badge variant="warning">No manager</Badge>}
                      {canCreate ? <DepartmentDialog orgSlug={orgSlug} members={members} department={d} /> : null}
                    </div>
                  </div>
                  {d.description ? <p className="text-sm text-muted-foreground">{d.description}</p> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Annual cost</div>
                      <div className="text-xl font-semibold tabular-nums"><Money minor={d.annualizedMinor} currency={baseCurrency} showCents={false} /></div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{d.subscriptionCount} subscriptions</div>
                      <div>{d.memberCount} {d.memberCount === 1 ? "member" : "members"}</div>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Members</div>
                    <DepartmentMembers
                      orgSlug={orgSlug}
                      departmentId={d.id}
                      members={deptMembers}
                      roster={roster}
                      canManage={canManage}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
