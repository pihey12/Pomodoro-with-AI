import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import meRouter from "./routes/me.js";
import tasksRouter from "./routes/tasks.js";
import sessionsRouter from "./routes/sessions.js";
import summaryRouter from "./routes/summary.js";
import aiRouter from "./routes/ai.js";
import suggestionsRouter from "./routes/suggestions.js";

export function createApp() {
  const app = express();

  const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin browser calls omit CORS preflight issues; allow missing Origin.
        // On Vercel, also allow the deployment host even if CLIENT_ORIGIN is slightly wrong.
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes("*") ||
          (process.env.VERCEL && origin.endsWith(".vercel.app"))
        ) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "pomodoro-track-timer" });
  });

  app.use("/api/me", meRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/summary", summaryRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/suggestions", suggestionsRouter);

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(err);
      const message = err instanceof Error ? err.message : "Internal server error";
      if (message.startsWith("CORS blocked")) {
        res.status(403).json({ error: message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}

const app = createApp();
export default app;
