import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const patchSchema = z.object({
  display_name: z.string().trim().min(1).max(80).optional(),
  preferred_mode: z.enum(["pomodoro", "task_track"]).optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    const { data: created, error: createError } = await db
      .from("profiles")
      .insert({
        id: user.id,
        display_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        preferred_mode: "pomodoro",
      })
      .select("*")
      .single();

    if (createError) {
      return res.status(500).json({ error: createError.message });
    }
    return res.json({ profile: created, email: user.email });
  }

  return res.json({ profile: data, email: user.email });
});

router.patch("/", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { data, error } = await db
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ profile: data });
});

export default router;
