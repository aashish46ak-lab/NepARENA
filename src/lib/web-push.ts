/**
 * Web Push subscription helper.
 * Stores endpoints in Supabase `push_subscriptions`.
 * Background delivery requires a server/Edge Function with VAPID private key
 * that calls the Push API — client is fully ready to receive.
 */
import { supabase } from "./supabase";

/** Optional public VAPID key (set via Vite env). Without it we still request Notification permission. */
const VAPID_PUBLIC =
  (typeof import.meta !== "undefined" &&
    // @ts-expect-error vite env
    (import.meta.env?.VITE_VAPID_PUBLIC_KEY as string | undefined)) ||
  "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function subscribeWebPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, error: "Push not supported on this browser" };
    }
    const perm = await ensureNotificationPermission();
    if (perm !== "granted") return { ok: false, error: "Permission not granted" };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && VAPID_PUBLIC) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    // If no VAPID yet, still store a placeholder row so we know user opted in
    const endpoint = sub?.endpoint ?? `local-opt-in:${userId}`;
    const json = sub ? sub.toJSON() : { endpoint, keys: {} };

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: (json.keys as { p256dh?: string } | undefined)?.p256dh ?? null,
        auth: (json.keys as { auth?: string } | undefined)?.auth ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "subscribe failed" };
  }
}

/** Local toast-style OS notification when tab is backgrounded but SW not required */
export function showLocalNotification(title: string, body?: string, url?: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body: body ?? "",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192-maskable.png",
      tag: "neparena-local",
    });
    n.onclick = () => {
      window.focus();
      n.close();
      if (url) window.location.href = url;
    };
  } catch {
    /* ignore */
  }
}
