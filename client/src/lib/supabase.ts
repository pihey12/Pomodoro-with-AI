import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
// New dashboard: VITE_SUPABASE_PUBLISHABLE_KEY — legacy: VITE_SUPABASE_ANON_KEY
const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) — auth will not work.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
