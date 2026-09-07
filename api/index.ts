/**
 * Vercel serverless entry — static import so the bundler includes Express + deps.
 * (Dynamic import of server/dist was crashing with FUNCTION_INVOCATION_FAILED.)
 */
import app from "../server/src/app.js";

export default app;
