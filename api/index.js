/**
 * Vercel serverless entry (CommonJS).
 * Loads the esbuild-bundled Express app from api/app.cjs (created at build time).
 */
module.exports = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./app.cjs");
    return mod.default || mod;
  } catch (err) {
    console.error("Failed to load api/app.cjs:", err);
    return function fallback(req, res) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to load API bundle",
          hint: "Ensure vercel build runs npm run build:api and env vars are set.",
        }),
      );
    };
  }
})();
