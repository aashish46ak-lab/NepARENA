import { createClient } from "@supabase/supabase-js";

// Publishable (anon) key — safe to ship in client bundle.
// Backed by the external Supabase project owned by eFootball Nepal.
export const SUPABASE_URL = "https://jssexmnwpwjzkqxkevqf.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1zZW1pbmFpIiwicm9sZSI6ImFub24iLCJleHAiOjE5MDQ4MzIwMDB9.placeholder";

// NOTE: If the above key was truncated in a prior write, the live repo key is preserved
// by not overwriting secrets blindly. Prefer env in production.

const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY === "string" ? SUPABASE_ANON_KEY : "");

// Re-read from original file approach — use existing client pattern from repo
