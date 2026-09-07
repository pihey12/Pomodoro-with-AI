import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// On Vercel, env vars come from the project settings — skip local .env file.
if (!process.env.VERCEL) {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

/**
 * Newer Supabase dashboards show:
 *   SUPABASE_PUBLISHABLE_KEY  (client-safe, like the old "anon" key)
 *   SUPABASE_SECRET_KEY       (server-only, like the old "service_role" key)
 * Older projects still use SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
 * We accept either naming style.
 *
 * CLIENT_ORIGIN may be a comma-separated list, e.g.
 *   http://localhost:5173,https://your-app.vercel.app
 */
const rawSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = rawSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid server environment:", parsed.error.flatten().fieldErrors);
  console.error("Copy server/.env.example → server/.env and fill in your Supabase + OpenAI values.");
  process.exit(1);
}

const publishableKey =
  parsed.data.SUPABASE_PUBLISHABLE_KEY ?? parsed.data.SUPABASE_ANON_KEY;

if (!publishableKey) {
  console.error(
    "Missing Supabase client key. Set SUPABASE_PUBLISHABLE_KEY (new dashboard) or SUPABASE_ANON_KEY (legacy).",
  );
  process.exit(1);
}

export const env = {
  SUPABASE_URL: parsed.data.SUPABASE_URL,
  /** Client-safe key used with createClient (publishable or legacy anon). */
  SUPABASE_ANON_KEY: publishableKey,
  SUPABASE_SERVICE_ROLE_KEY:
    parsed.data.SUPABASE_SECRET_KEY ?? parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: parsed.data.OPENAI_API_KEY,
  PORT: parsed.data.PORT,
  CLIENT_ORIGIN: parsed.data.CLIENT_ORIGIN,
};
