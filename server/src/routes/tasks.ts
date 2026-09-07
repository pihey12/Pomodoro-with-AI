import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  estimated_minutes: z.number().int().min(1).max(480).optional().nullable(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  estimated_minutes: z.number().int().min(1).max(480).optional().nullable(),
  status: z.enum(["todo", "done"]).optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  let query = db
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status === "todo" || status === "done") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ tasks: data ?? [] });
});

router.post("/", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { data, error } = await db
    .from("tasks")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      estimated_minutes: parsed.data.estimated_minutes ?? null,
      status: "todo",
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ task: data });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status === "done") {
    updates.completed_at = new Date().toISOString();
  }
  if (parsed.data.status === "todo") {
    updates.completed_at = null;
  }

  const { data, error } = await db
    .from("tasks")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: "Task not found" });
  }

  return res.json({ task: data });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;

  const { data, error } = await db
    .from("tasks")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: "Task not found" });
  }

  return res.status(204).send();
});

export default router;
