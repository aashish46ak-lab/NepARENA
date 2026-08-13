/**
 * GA4 Analytics API — Super Admin only.
 * GET ?kind=overview&range=7d
 * GET ?kind=realtime
 * Authorization: Bearer <supabase access_token>
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  fetchGaOverview,
  fetchGaRealtime,
  isGaConfigured,
  type DateRangeKey,
} from "@/server/ga-data";
import { SUPER_ADMIN_EMAILS } from "@/lib/organizers";

const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}

async function requireSuperAdmin(request: Request): Promise<
  { ok: true; email: string } | { ok: false; response: Response }
> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = typeof process !== "undefined" ? (process as any).env : {};
  const url =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      ok: false,
      response: json({ error: "Server misconfigured (Supabase env)" }, 500),
    };
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  }

  const email = data.user.email.toLowerCase();
  const allowed = SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === email);
  if (!allowed) {
    return { ok: false, response: json({ error: "Forbidden — Owner only" }, 403) };
  }

  if (!rateLimit(email)) {
    return { ok: false, response: json({ error: "Rate limit exceeded" }, 429) };
  }

  return { ok: true, email };
}

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireSuperAdmin(request);
        if (!auth.ok) return auth.response;

        if (!isGaConfigured()) {
          return json({
            configured: false,
            error:
              "GA4 Data API not configured. Set GA4_PROPERTY_ID and service account env vars on the server.",
          });
        }

        const url = new URL(request.url);
        const kind = url.searchParams.get("kind") || "overview";
        const range = (url.searchParams.get("range") || "30d") as DateRangeKey;
        const start = url.searchParams.get("start") || undefined;
        const end = url.searchParams.get("end") || undefined;

        try {
          if (kind === "realtime") {
            const data = await fetchGaRealtime();
            return json({ configured: true, kind: "realtime", data });
          }
          const data = await fetchGaOverview(range, start, end);
          return json({ configured: true, kind: "overview", range, data });
        } catch (e) {
          const message = e instanceof Error ? e.message : "GA4 error";
          return json({ configured: true, error: message }, 502);
        }
      },
    },
  },
});
