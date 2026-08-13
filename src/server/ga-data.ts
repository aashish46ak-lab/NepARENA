/**
 * Google Analytics Data API — server only.
 * Env:
 *   GA4_PROPERTY_ID          — numeric property id (Admin → Property settings)
 *   GA4_SERVICE_ACCOUNT_EMAIL
 *   GA4_SERVICE_ACCOUNT_PRIVATE_KEY  (with \n newlines)
 *   — or —
 *   GA4_SERVICE_ACCOUNT_JSON  — full JSON string of the service account key
 *
 * Grant the service account "Viewer" on the GA4 property.
 */

export type DateRangeKey = "today" | "7d" | "30d" | "90d" | "1y" | "custom";

export type GaOverview = {
  totals: {
    totalUsers: number;
    newUsers: number;
    returningUsers: number;
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number;
    bounceRate: number;
    engagementRate: number;
  };
  daily: { date: string; users: number; sessions: number; views: number }[];
  sources: { name: string; users: number }[];
  devices: { name: string; users: number }[];
  browsers: { name: string; users: number }[];
  countries: { name: string; users: number }[];
  cities: { name: string; users: number }[];
  pages: { path: string; views: number; users: number }[];
  landingPages: { path: string; sessions: number }[];
  os: { name: string; users: number }[];
  channelGroups: { name: string; users: number }[];
};

export type GaRealtime = {
  activeUsers: number;
  byCountry: { name: string; users: number }[];
  byDevice: { name: string; users: number }[];
  bySource: { name: string; users: number }[];
  byPage: { path: string; users: number }[];
  fetchedAt: string;
};

type CacheEntry<T> = { at: number; data: T };
const cache = new Map<string, CacheEntry<unknown>>();
const OVERVIEW_TTL_MS = 5 * 60 * 1000;
const REALTIME_TTL_MS = 12 * 1000;

function env(name: string): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = typeof process !== "undefined" ? (process as any).env : undefined;
  return p?.[name] as string | undefined;
}

export function isGaConfigured(): boolean {
  const propertyId = env("GA4_PROPERTY_ID");
  const json = env("GA4_SERVICE_ACCOUNT_JSON");
  const email = env("GA4_SERVICE_ACCOUNT_EMAIL");
  const key = env("GA4_SERVICE_ACCOUNT_PRIVATE_KEY");
  return !!propertyId && (!!json || (!!email && !!key));
}

function resolveRange(
  key: DateRangeKey,
  customStart?: string,
  customEnd?: string,
): { startDate: string; endDate: string } {
  const end = new Date();
  const endDate = end.toISOString().slice(0, 10);
  if (key === "custom" && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }
  const start = new Date(end);
  if (key === "today") {
    /* same day */
  } else if (key === "7d") start.setDate(start.getDate() - 6);
  else if (key === "30d") start.setDate(start.getDate() - 29);
  else if (key === "90d") start.setDate(start.getDate() - 89);
  else if (key === "1y") start.setFullYear(start.getFullYear() - 1);
  else start.setDate(start.getDate() - 29);
  return { startDate: start.toISOString().slice(0, 10), endDate };
}

async function getAccessToken(): Promise<string> {
  const jsonRaw = env("GA4_SERVICE_ACCOUNT_JSON");
  let clientEmail = env("GA4_SERVICE_ACCOUNT_EMAIL");
  let privateKey = env("GA4_SERVICE_ACCOUNT_PRIVATE_KEY")?.replace(/\\n/g, "\n");

  if (jsonRaw) {
    const parsed = JSON.parse(jsonRaw) as {
      client_email?: string;
      private_key?: string;
    };
    clientEmail = parsed.client_email ?? clientEmail;
    privateKey = parsed.private_key ?? privateKey;
  }

  if (!clientEmail || !privateKey) {
    throw new Error("GA4 service account credentials missing");
  }

  // Use google-auth-library if available; otherwise fail clearly
  try {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("No access token from GoogleAuth");
    return token.token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Cannot find module") || msg.includes("Failed to resolve")) {
      throw new Error(
        "Install google-auth-library: npm i google-auth-library @google-analytics/data",
      );
    }
    throw e;
  }
}

async function runReport(body: Record<string, unknown>): Promise<unknown> {
  const propertyId = env("GA4_PROPERTY_ID");
  if (!propertyId) throw new Error("GA4_PROPERTY_ID not set");
  const token = await getAccessToken();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 runReport ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

async function runRealtime(body: Record<string, unknown>): Promise<unknown> {
  const propertyId = env("GA4_PROPERTY_ID");
  if (!propertyId) throw new Error("GA4_PROPERTY_ID not set");
  const token = await getAccessToken();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 realtime ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

function metricMap(row: {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}): { dims: string[]; metrics: number[] } {
  return {
    dims: (row.dimensionValues ?? []).map((d) => d.value ?? ""),
    metrics: (row.metricValues ?? []).map((m) => Number(m.value ?? 0)),
  };
}

export async function fetchGaOverview(
  range: DateRangeKey,
  customStart?: string,
  customEnd?: string,
): Promise<GaOverview> {
  const cacheKey = `ov:${range}:${customStart ?? ""}:${customEnd ?? ""}`;
  const hit = cache.get(cacheKey) as CacheEntry<GaOverview> | undefined;
  if (hit && Date.now() - hit.at < OVERVIEW_TTL_MS) return hit.data;

  const { startDate, endDate } = resolveRange(range, customStart, customEnd);
  const dateRanges = [{ startDate, endDate }];

  const [
    totalsRes,
    dailyRes,
    sourcesRes,
    devicesRes,
    browsersRes,
    countriesRes,
    citiesRes,
    pagesRes,
    landingRes,
    osRes,
    channelRes,
  ] = await Promise.all([
    runReport({
      dateRanges,
      metrics: [
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "engagementRate" },
      ],
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 12,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "totalUsers" }],
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 10,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "country" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 15,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "city" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 12,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 15,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 12,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "operatingSystem" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 10,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 10,
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalsRow = (totalsRes as any)?.rows?.[0];
  const tm = metricMap(totalsRow ?? {}).metrics;
  const totalUsers = tm[0] ?? 0;
  const newUsers = tm[1] ?? 0;

  const overview: GaOverview = {
    totals: {
      totalUsers,
      newUsers,
      returningUsers: Math.max(0, totalUsers - newUsers),
      activeUsers: tm[2] ?? 0,
      sessions: tm[3] ?? 0,
      screenPageViews: tm[4] ?? 0,
      averageSessionDuration: tm[5] ?? 0,
      bounceRate: tm[6] ?? 0,
      engagementRate: tm[7] ?? 0,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    daily: ((dailyRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      const raw = dims[0] ?? "";
      const date =
        raw.length === 8
          ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
          : raw;
      return {
        date,
        users: metrics[0] ?? 0,
        sessions: metrics[1] ?? 0,
        views: metrics[2] ?? 0,
      };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sources: ((sourcesRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "(direct)", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    devices: ((devicesRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "unknown", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browsers: ((browsersRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "unknown", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countries: ((countriesRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "unknown", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cities: ((citiesRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "unknown", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pages: ((pagesRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return {
        path: dims[0] || "/",
        views: metrics[0] ?? 0,
        users: metrics[1] ?? 0,
      };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    landingPages: ((landingRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { path: dims[0] || "/", sessions: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    os: ((osRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "unknown", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channelGroups: ((channelRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "Unknown", users: metrics[0] ?? 0 };
    }),
  };

  cache.set(cacheKey, { at: Date.now(), data: overview });
  return overview;
}

export async function fetchGaRealtime(): Promise<GaRealtime> {
  const cacheKey = "rt";
  const hit = cache.get(cacheKey) as CacheEntry<GaRealtime> | undefined;
  if (hit && Date.now() - hit.at < REALTIME_TTL_MS) return hit.data;

  const [activeRes, countryRes, deviceRes, sourceRes, pageRes] =
    await Promise.all([
      runRealtime({
        metrics: [{ name: "activeUsers" }],
      }),
      runRealtime({
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        limit: 10,
      }),
      runRealtime({
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
      }),
      runRealtime({
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        limit: 8,
      }),
      runRealtime({
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        limit: 8,
      }),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeUsers = Number((activeRes as any)?.rows?.[0]?.metricValues?.[0]?.value ?? 0);

  const data: GaRealtime = {
    activeUsers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    byCountry: ((countryRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "unknown", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    byDevice: ((deviceRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "unknown", users: metrics[0] ?? 0 };
    }),
    // source dimension limited in realtime — reuse screen as activity proxy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bySource: ((sourceRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { name: dims[0] || "(active)", users: metrics[0] ?? 0 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    byPage: ((pageRes as any)?.rows ?? []).map((r: any) => {
      const { dims, metrics } = metricMap(r);
      return { path: dims[0] || "/", users: metrics[0] ?? 0 };
    }),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}
