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
  Trophy,
  Users,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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
  },
  {
    label: "Tournament Manager",
    to: "/dashboard?t=tournaments",
    sub: [
      {
        label: "Overview",
        to: "/dashboard?t=tournament-overview",
      },
      {
        label: "Tournament History",
        to: "/dashboard?t=history",
      },
      {
        label: "Hall of Fame",
        to: "/dashboard?t=hall-of-fame",
      },
      {
        label: "Reports",
        to: "/dashboard?t=reports",
      },
    ],
  },
  {
    label: "Members",
    to: "/dashboard?t=members",
  },
  {
    label: "Roles & Permissions",
    to: "/dashboard?t=roles",
  },
  {
    label: "Settings",
    to: "/dashboard?t=settings",
  },
];

export function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
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

  const NAV = isAdmin ? ADMIN_NAV : PUBLIC_NAV;

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3">

        <Link
          to={isAdmin ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-bold"
        >
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt=""
              className="h-8 w-8 rounded"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-gradient-brand grid place-items-center">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
          )}

          <span className="text-gradient-brand text-lg tracking-tight">
            {settings?.site_name ?? "eFootball Nepal"}
          </span>
        </Link>
                <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              onClick={() => setActiveMenu(n)}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              activeProps={{
                className:
                  "px-3 py-1.5 rounded-md text-sm text-foreground bg-white/10",
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-2 ring-transparent hover:ring-brand/50 transition">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium truncate">
                    {profile?.username ?? user.email}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {!isAdmin && (
                  <DropdownMenuItem
                    onClick={() => router.navigate({ to: "/profile" })}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                )}

                {isAdmin && (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.navigate({ to: "/dashboard" })}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => router.navigate({ to: "/" })}
                    >
                      🌐 View Website
                    </DropdownMenuItem>
                  </>
                )}

                {!isAdmin && (
                  <DropdownMenuItem
                    onClick={() => router.navigate({ to: "/members" })}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Community
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() =>
                    signOut().then(() => router.navigate({ to: "/" }))
                  }
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              size="sm"
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
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
                    key={n.to}
                    to={n.to}
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
                    <Link
                      to="/dashboard"
                      className="px-3 py-2 rounded-md hover:bg-white/5"
                    >
                      Dashboard
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
                key={item.to}
                to={item.to}
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
