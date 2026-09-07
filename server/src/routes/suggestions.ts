import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().min(5).max(2000),
  category: z.enum(["feature", "improvement", "bug", "other"]).default("feature"),
});

router.get("/", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;

  const { data, error } = await db
    .from("suggestions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ suggestions: data ?? [] });
});

router.post("/", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { data, error } = await db
    .from("suggestions")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      details: parsed.data.details,
      category: parsed.data.category,
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ suggestion: data });
});

export default router;
