/**
 * Vercel serverless entry for Express.
 * `vercel.json` buildCommand compiles `server/` before this runs.
 */
// @ts-expect-error compiled output (built in vercel-build / buildCommand)
import app from "../server/dist/app.js";

export default app;
