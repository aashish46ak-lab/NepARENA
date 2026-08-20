import { Link } from "@tanstack/react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

export function ContentPageShell({
  title,
  subtitle,
  icon: Icon,
  children,
  backTo = "/",
  backLabel = "Home",
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-24">
        <div className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Link
              to={backTo}
              className="rounded-full border border-white/12 p-2 text-neutral-300 hover:bg-white/[0.06]"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-sky-400" /> : null}
                <h1 className="truncate text-base font-bold text-white">{title}</h1>
              </div>
              {subtitle ? (
                <p className="truncate text-xs text-neutral-500">{subtitle}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>
      </div>
    </PageShell>
  );
}

export function ContentSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8", className)}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-sky-300/90">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-neutral-300 whitespace-pre-line">
        {children}
      </div>
    </section>
  );
}
