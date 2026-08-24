/**
 * Shared skeleton loading UI — use for page/list/data loads (not button busy states).
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function FeedPostSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32 bg-white/10" />
          <Skeleton className="h-3 w-20 bg-white/[0.07]" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full bg-white/[0.08]" />
        <Skeleton className="h-3 w-4/5 max-w-[85%] bg-white/[0.07]" />
        <Skeleton className="h-3 w-2/3 max-w-[60%] bg-white/[0.06]" />
      </div>
      <Skeleton className="mt-3 h-40 w-full rounded-xl bg-white/[0.06]" />
      <div className="mt-3 flex gap-4">
        <Skeleton className="h-3 w-12 bg-white/[0.07]" />
        <Skeleton className="h-3 w-12 bg-white/[0.07]" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-1 py-2" aria-busy aria-label="Loading feed">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-white/5 px-3 py-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-full bg-white/10" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36 bg-white/10" />
        <Skeleton className="h-3 w-48 max-w-full bg-white/[0.07]" />
      </div>
      <Skeleton className="h-3 w-8 bg-white/[0.06]" />
    </div>
  );
}

export function MessageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="py-1" aria-busy aria-label="Loading messages">
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function TournamentCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <Skeleton className="h-28 w-full rounded-none bg-white/[0.06]" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4 max-w-[200px] bg-white/10" />
        <Skeleton className="h-3 w-24 bg-white/[0.07]" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full bg-white/[0.08]" />
          <Skeleton className="h-6 w-20 rounded-full bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

export function TournamentGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-busy aria-label="Loading tournaments">
      {Array.from({ length: count }).map((_, i) => (
        <TournamentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function OrganizerCardSkeleton() {
  return (
    <div className="aspect-[2/1] overflow-hidden rounded-xl border border-white/5">
      <Skeleton className="h-full w-full rounded-none bg-white/[0.06]" />
    </div>
  );
}

export function OrganizerListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-2.5" aria-busy aria-label="Loading organizers">
      {Array.from({ length: count }).map((_, i) => (
        <OrganizerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pt-6" aria-busy aria-label="Loading profile">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-full bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40 bg-white/10" />
          <Skeleton className="h-3 w-24 bg-white/[0.07]" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 w-20 rounded-full bg-white/[0.08]" />
            <Skeleton className="h-8 w-20 rounded-full bg-white/[0.06]" />
          </div>
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-xl bg-white/[0.05]" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-14 rounded-xl bg-white/[0.06]" />
        <Skeleton className="h-14 rounded-xl bg-white/[0.06]" />
        <Skeleton className="h-14 rounded-xl bg-white/[0.06]" />
      </div>
      <FeedSkeleton count={2} />
    </div>
  );
}

export function TournamentDetailSkeleton() {
  return (
    <div className="min-h-[50vh] bg-[#0a0a0a]" aria-busy aria-label="Loading tournament">
      <div className="border-b border-white/8 px-3 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3 sm:max-w-2xl">
          <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
          <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full bg-white/10" />
            <Skeleton className="h-3 w-28 bg-white/[0.07]" />
          </div>
        </div>
        <div className="mx-auto mt-3 flex max-w-lg gap-2 px-1 sm:max-w-2xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-16 shrink-0 rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-lg space-y-3 px-3 pt-4 sm:max-w-2xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-10" aria-busy aria-label="Loading dashboard">
      <Skeleton className="h-8 w-48 bg-white/10" />
      <Skeleton className="h-4 w-64 bg-white/[0.07]" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-2xl bg-white/[0.06]" />
        <Skeleton className="h-24 rounded-2xl bg-white/[0.06]" />
        <Skeleton className="h-24 rounded-2xl bg-white/[0.06]" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl bg-white/[0.05]" />
    </div>
  );
}

export function GallerySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-busy aria-label="Loading gallery">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl bg-white/[0.06]" />
      ))}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3" aria-busy>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-8 flex-1 bg-white/[0.06]", c === 0 && "max-w-[3rem]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageCenterSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-auto w-full max-w-lg space-y-3 px-4 py-16", className)}
      aria-busy
      aria-label="Loading"
    >
      <Skeleton className="mx-auto h-12 w-12 rounded-full bg-white/10" />
      <Skeleton className="mx-auto h-4 w-40 bg-white/10" />
      <Skeleton className="mx-auto h-3 w-56 bg-white/[0.07]" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-12 w-full rounded-xl bg-white/[0.06]" />
        <Skeleton className="h-12 w-full rounded-xl bg-white/[0.06]" />
        <Skeleton className="h-12 w-full rounded-xl bg-white/[0.05]" />
      </div>
    </div>
  );
}

export function HistoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="mt-6 space-y-2" aria-busy aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40 bg-white/10" />
            <Skeleton className="h-3 w-24 bg-white/[0.07]" />
          </div>
        </div>
      ))}
    </div>
  );
}
