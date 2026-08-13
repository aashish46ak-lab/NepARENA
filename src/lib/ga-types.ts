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
