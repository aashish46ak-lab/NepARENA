/**
 * Compact top bar for organizer portal pages (tournaments, gallery, etc.).
 * No site Header/Footer — only Back + Home (organizer public page).
 */
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { getOrganizerContext } from "@/lib/organizer-context";

export function OrganizerSubnav({ title }: { title?: string }) {
  const router = useRouter();
  const ctx = getOrganizerContext();
  const homeHref = ctx?.slug ? `/o/${ctx.slug}` : "/";

  return (
    <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 pt-3 pb-1">
      <button
        type="button"
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/40 px-3 py-1.5 text-sm text-neutral-100 backdrop-blur-md hover:bg-black/60"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <a
        href={homeHref}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/40 px-3 py-1.5 text-sm text-neutral-100 backdrop-blur-md hover:bg-black/60"
      >
        <Home className="h-4 w-4" /> Home
      </a>
      {title ? (
        <span className="ml-1 truncate text-sm font-semibold text-white">{title}</span>
      ) : null}
    </div>
  );
}
