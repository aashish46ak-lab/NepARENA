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

const PUBLIC_NAV = [
  { to: "/", label: "Home" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/hall-of-fame", label: "Hall of Fame" },
  { to: "/history", label: "History" },
  { to: "/gallery", label: "Gallery" },
  { to: "/members", label: "Members" },
  { to: "/about", label: "About" },
];

const ADMIN_NAV = [
  {
    label: "Dashboard",
    to: "/dashboard",
    search: { t: "dashboard" },
  },
  {
    label: "Tournament Manager",
    to: "/dashboard",
    search: { t: "tournaments" },
    sub: [
      {
        label: "Overview",
        to: "/dashboard",
        search: { t: "tournaments" },
      },
      {
        label: "History",
        to: "/dashboard",
        search: { t: "history" },
      },
      {
        label: "Hall of Fame",
        to: "/dashboard",
        search: { t: "hall-of-fame" },
      },
      {
        label: "Announcements",
        to: "/dashboard",
        search: { t: "announcements" },
      },
    ],
  },
  {
    label: "Members",
    to: "/dashboard",
    search: { t: "players" },
  },
  {
    label: "Reports",
    to: "/dashboard",
    search: { t: "reports" },
  },
  {
    label: "Settings",
    to: "/dashboard",
    search: { t: "settings" },
  },
];

const LOGO_SRC = "/neparena-logo.png";

export function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const [activeMenu, setActiveMenu] = useState<any>(null);
  const settings = useSiteSettings();
  const router = useRouter();

  const initials = (
    profile?.username ??
    user?.email ??
    "U"
  )
    .slice(0, 2)
    .toUpperCase();

  const NAV = isAdmin
    ? [
        ...(isSuperAdmin
          ? [{ label: `${PLATFORM_NAME} Platform`, to: "/platform" as const }]
          : []),
        ...ADMIN_NAV,
      ]
    : PUBLIC_NAV;

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src={LOGO_SRC}
            alt={PLATFORM_NAME}
            className="h-8 w-8 rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.src = "/android-chrome-512x512.png";
            }}
          />
          <span className="font-bold hidden sm:inline text-gradient-brand">
            {settings?.site_name ?? PLATFORM_NAME}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV.map((n) => (
            <div key={n.label} className="relative">
              {"sub" in n && n.sub ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenu(activeMenu?.label === n.label ? null : n)
                  }
                  className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  {n.label}
                </button>
              ) : (
                <Link
                  to={n.to}
                  search={"search" in n ? (n as any).search : undefined}
                  className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5"
                  activeProps={{
                    className:
                      "px-3 py-1.5 rounded-md text-sm text-foreground bg-white/10",
                  }}
                >
                  {n.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          {user && <NotificationsBell />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
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
                    <UserIcon className="h-4 w-4 mr-2" /> Profile
                  </Link>
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/platform">
                      <Building2 className="h-4 w-4 mr-2" /> {PLATFORM_NAME} Platform
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <Shield className="h-4 w-4 mr-2" /> eFootball Nepal Admin
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
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-64 glass border-l border-border"
            >
              <div className="flex flex-col gap-1 mt-8">
                {NAV.map((n) => (
                  <Link
                    key={n.label}
                    to={n.to}
                    search={"search" in n ? (n as any).search : undefined}
                    className="px-3 py-2 rounded-md hover:bg-white/5"
                  >
                    {n.label}
                  </Link>
                ))}
                {!isAdmin && user && (
                  <Link
                    to="/profile"
                    className="px-3 py-2 rounded-md hover:bg-white/5"
                  >
                    My Profile
                  </Link>
                )}
                {isAdmin && (
                  <>
                    {isSuperAdmin && (
                      <Link
                        to="/platform"
                        className="px-3 py-2 rounded-md hover:bg-white/5 flex items-center gap-2"
                      >
                        <Building2 className="h-4 w-4" /> {PLATFORM_NAME} Platform
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="px-3 py-2 rounded-md hover:bg-white/5"
                    >
                      eFootball Nepal Admin
                    </Link>
                    <Link
                      to="/"
                      className="px-3 py-2 rounded-md hover:bg-white/5"
                    >
                      View Website
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isAdmin && activeMenu?.sub && (
        <div className="border-t border-border/60 glass">
          <nav className="max-w-7xl mx-auto flex items-center gap-2 px-4 py-2">
            {activeMenu.sub.map((item: any) => (
              <Link
                key={item.label}
                to={item.to}
                search={item.search}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                activeProps={{
                  className:
                    "px-3 py-1.5 rounded-md text-sm text-foreground bg-white/10",
                }}
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
