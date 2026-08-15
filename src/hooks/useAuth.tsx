import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, OWNER_EMAIL, type Profile, type Role } from "@/lib/supabase";
import { analytics } from "@/lib/analytics";
import { recordLoginStreak } from "@/lib/streaks";
import { subscribeWebPush } from "@/lib/web-push";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  isOwner: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const trackedLogin = useRef<string | null>(null);
  const streakOnce = useRef<string | null>(null);

  const loadProfileAndRoles = async (userId: string) => {
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((profileData as Profile) ?? null);
    setRoles((roleData ?? []).map((r: { role: Role }) => r.role));
  };

  const bumpStreak = (userId: string) => {
    if (streakOnce.current === userId) return;
    streakOnce.current = userId;
    void recordLoginStreak().then(() => {
      void loadProfileAndRoles(userId);
    });
    // Register for phone push (PWA / browser) after login
    void subscribeWebPush(userId).catch(() => {});
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfileAndRoles(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
        bumpStreak(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        void loadProfileAndRoles(newSession.user.id);
        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          trackedLogin.current !== newSession.user.id
        ) {
          trackedLogin.current = newSession.user.id;
          if (event === "SIGNED_IN") {
            analytics.login("supabase");
          }
        }
        bumpStreak(newSession.user.id);
      } else {
        setProfile(null);
        setRoles([]);
        trackedLogin.current = null;
        streakOnce.current = null;
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const email = user?.email?.toLowerCase() ?? "";
  const isOwner = email === OWNER_EMAIL.toLowerCase() || roles.includes("owner");
  const isAdmin = isOwner || roles.includes("admin") || roles.includes("moderator");

  const value: AuthContextValue = {
    session,
    user,
    profile,
    roles,
    isOwner,
    isAdmin,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshProfile: async () => {
      if (user) await loadProfileAndRoles(user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
