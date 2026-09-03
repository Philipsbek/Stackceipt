import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { CircleAlert, Inbox, Lock } from "lucide-react";

interface StateShellProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "danger";
}

function StateShell({ icon, title, description, action, className, tone = "neutral" }: StateShellProps) {
  return (
    <Card className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          tone === "danger" ? "bg-[color:var(--danger-bg)] text-destructive" : "bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <StateShell
      icon={icon ?? <Inbox className="size-5" />}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this view. Try again in a moment.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <StateShell
      tone="danger"
      icon={<CircleAlert className="size-5" />}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function PermissionNotice({
  title = "You don't have access to this",
  description = "This area requires a higher role in this organization. Contact an owner or admin if you need access.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <StateShell
      icon={<Lock className="size-5" />}
      title={title}
      description={description}
      className={className}
    />
  );
}
