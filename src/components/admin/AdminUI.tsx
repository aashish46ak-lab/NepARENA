import type { ReactNode } from "react";

export function AdminSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">{message}</div>;
}