import app from "./app.js";
import { env } from "./config/env.js";

// Local / classic Node only — on Vercel the serverless entry exports `app`.
app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
