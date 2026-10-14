import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl tracking-tight [overflow-wrap:anywhere] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
