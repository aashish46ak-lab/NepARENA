/**
 * NepARENA — Web Push fan-out (phone notifications when app is closed).
 *
 * Deploy:
 *   supabase functions deploy send-push --no-verify-jwt
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT          e.g. mailto:aashish46ak@gmail.com
 *   SUPABASE_URL           (auto)
 *   SUPABASE_SERVICE_ROLE_KEY (auto)
 *
 * Generate VAPID once:
 *   npx web-push generate-vapid-keys
 * Then set VITE_VAPID_PUBLIC_KEY in Vercel/env to the public key.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  user_ids?: string[];
  user_id?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string },
) {
  // Minimal Web Push using native crypto + fetch (RFC 8291 / 8292 simplified via web-push lib)
  const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    payload,
    { TTL: 60 * 60 * 12 },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:aashish46ak@gmail.com";

    if (!vapidPublic || !vapidPrivate) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "VAPID keys not configured on edge function",
        }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as Body;
    const userIds = [
      ...(body.user_ids ?? []),
      ...(body.user_id ? [body.user_id] : []),
    ].filter(Boolean);

    if (!userIds.length) {
      return new Response(JSON.stringify({ ok: false, error: "no user_ids" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id")
      .in("user_id", userIds);

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: body.title || "NepARENA",
      body: body.body || "",
      url: body.url || "/",
      tag: body.tag || "neparena",
    });

    let sent = 0;
    const failures: string[] = [];

    for (const row of subs ?? []) {
      if (!row.endpoint || !row.p256dh || !row.auth) continue;
      if (String(row.endpoint).startsWith("local-opt-in:")) continue;
      try {
        await sendWebPush(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          {
            publicKey: vapidPublic,
            privateKey: vapidPrivate,
            subject: vapidSubject,
          },
        );
        sent += 1;
      } catch (e) {
        failures.push(
          e instanceof Error ? e.message : "send failed",
        );
        // Drop dead subscriptions
        if (
          e &&
          typeof e === "object" &&
          "statusCode" in e &&
          ((e as { statusCode?: number }).statusCode === 404 ||
            (e as { statusCode?: number }).statusCode === 410)
        ) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, attempted: (subs ?? []).length, failures }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : "unknown",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
