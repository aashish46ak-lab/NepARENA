import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { NotificationsBell } from "@/components/NotificationsBell";
import { isSuperAdminEmail, PLATFORM_NAME } from "@/lib/organizers";

const PLATFORM_NAV = [
  { to: "/" as const, label: "Home" },
  { to: "/organizers" as const, label: "Organizers" },
];

const ORGANIZER_PUBLIC_NAV = [
  { to: "/tournaments" as const, label: "Tournaments" },
  { to: "/hall-of-fame" as const, label: "Hall of Fame" },
  { to: "/history" as const, label: "History" },
  { to: "/gallery" as const, label: "Gallery" },
  { to: "/members" as const, label: "Members" },
  { to: "/about" as const, label: "About" },
];

const ADMIN_NAV = [
  { label: "Dashboard", to: "/dashboard" as const, search: { t: "dashboard" } },
  {
    label: "Tournament Manager",
    to: "/dashboard" as const,
    search: { t: "tournaments" },
    sub: [
      { label: "Overview", to: "/dashboard" as const, search: { t: "tournaments" } },
      { label: "History", to: "/dashboard" as const, search: { t: "history" } },
      { label: "Hall of Fame", to: "/dashboard" as const, search: { t: "hall-of-fame" } },
      { label: "Announcements", to: "/dashboard" as const, search: { t: "announcements" } },
    ],
  },
  { label: "Members", to: "/dashboard" as const, search: { t: "players" } },
  { label: "Reports", to: "/dashboard" as const, search: { t: "reports" } },
  { label: "Settings", to: "/dashboard" as const, search: { t: "settings" } },
];

export function Header({ mode = "organizer" }: { mode?: "platform" | "organizer" }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const [activeMenu, setActiveMenu] = useState<(typeof ADMIN_NAV)[number] | null>(null);
  const settings = useSiteSettings();
  const router = useRouter();

  const initials = (profile?.username ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  const NAV =
    mode === "platform"
      ? PLATFORM_NAV
      : isAdmin
        ? [
            ...(isSuperAdmin
              ? [{ label: `${PLATFORM_NAME} Platform`, to: "/platform" as const }]
              : []),
            ...ADMIN_NAV,
          ]
        : [
            { to: "/" as const, label: PLATFORM_NAME },
            ...ORGANIZER_PUBLIC_NAV,
          ];

  const brandName =
    mode === "platform" ? PLATFORM_NAME : (settings?.site_name ?? "Organizer");
  const brandLogo =
    mode === "platform"
      ? "/neparena-logo.png"
      : (settings?.logo_url ?? "/neparena-logo.png");

  return (
    <header
      className={
        mode === "platform"
          ? "sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md"
          : "sticky top-0 z-40 border-b border-border/60 glass"
      }
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link
          to={mode === "platform" ? "/" : "/o/efootball-nepal"}
          className="flex shrink-0 items-center gap-2.5"
        >
          <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-neutral-900 shadow-md ring-1 ring-white/25">
            <img
              src={brandLogo}
              alt={brandName}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192x192.png";
              }}
            />
          </span>
          <span
            className={
              mode === "platform"
                ? "text-base font-semibold tracking-tight text-neutral-100"
                : "font-semibold text-gradient-brand"
            }
          >
            {brandName}
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              search={"search" in n ? (n as { search?: object }).search : undefined}
              onMouseEnter={() => {
                if ("sub" in n && n.sub) setActiveMenu(n as (typeof ADMIN_NAV)[number]);
                else setActiveMenu(null);
              }}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              activeProps={{
                className:
                  "rounded-md px-2.5 py-1.5 text-sm text-foreground bg-white/10",
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user && mode === "organizer" && <NotificationsBell />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.username ?? user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/platform">
                      <Building2 className="mr-2 h-4 w-4" /> {PLATFORM_NAME} Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <Shield className="mr-2 h-4 w-4" /> Organizer Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void signOut();
                    router.navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="bg-neutral-100 text-black hover:bg-white">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 border-l border-border">
              <div className="mt-8 flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link
                    key={n.label}
                    to={n.to}
                    search={"search" in n ? (n as { search?: object }).search : undefined}
                    className="rounded-md px-3 py-2 hover:bg-white/5"
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {mode === "organizer" && isAdmin && activeMenu && "sub" in activeMenu && activeMenu.sub && (
        <div className="border-t border-border/60 glass">
          <nav className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
            {activeMenu.sub.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                search={item.search}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
