import dotenv from "dotenv";
import { z } from "zod";

// Local only. Do not use import.meta.url here — it crashes under Vercel's bundler.
if (!process.env.VERCEL) {
  dotenv.config(); // loads server/.env when cwd is server/ (npm -w server)
}

/**
 * Newer Supabase dashboards:
 *   SUPABASE_PUBLISHABLE_KEY  (client-safe)
 *   SUPABASE_SECRET_KEY       (server-only)
 *
 * CLIENT_ORIGIN may be comma-separated:
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

function loadEnv() {
  const parsed = rawSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    const message = `Invalid server environment: ${JSON.stringify(details)}`;
    if (process.env.VERCEL) {
      throw new Error(message);
    }
    console.error(message);
    console.error("Create server/.env with SUPABASE_* and OPENAI_API_KEY.");
    process.exit(1);
  }

  const publishableKey =
    parsed.data.SUPABASE_PUBLISHABLE_KEY ?? parsed.data.SUPABASE_ANON_KEY;

  if (!publishableKey) {
    const message =
      "Missing SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY).";
    if (process.env.VERCEL) {
      throw new Error(message);
    }
    console.error(message);
    process.exit(1);
  }

  return {
    SUPABASE_URL: parsed.data.SUPABASE_URL,
    SUPABASE_ANON_KEY: publishableKey,
    SUPABASE_SERVICE_ROLE_KEY:
      parsed.data.SUPABASE_SECRET_KEY ?? parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: parsed.data.OPENAI_API_KEY,
    PORT: parsed.data.PORT,
    CLIENT_ORIGIN: parsed.data.CLIENT_ORIGIN,
  };
}

export const env = loadEnv();
