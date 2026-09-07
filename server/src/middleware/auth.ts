import type { Request, Response, NextFunction } from "express";
import type { User } from "@supabase/supabase-js";
import { createUserClient, getUserFromToken, type DbClient } from "../lib/supabase.js";

export type AuthedRequest = Request & {
  user: User;
  accessToken: string;
  db: DbClient;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const accessToken = header.slice("Bearer ".length).trim();
  if (!accessToken) {
    return res.status(401).json({ error: "Missing access token" });
  }

  try {
    const user = await getUserFromToken(accessToken);
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const authed = req as AuthedRequest;
    authed.user = user;
    authed.accessToken = accessToken;
    authed.db = createUserClient(accessToken);
    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}
