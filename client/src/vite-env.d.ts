/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** New Supabase dashboard name (preferred). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Legacy name — still supported. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
