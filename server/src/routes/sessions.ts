import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const startSchema = z.object({
  kind: z.enum(["focus", "break"]).default("focus"),
  mode: z.enum(["pomodoro", "task_track"]),
  task_id: z.string().uuid().optional().nullable(),
});

const stopSchema = z.object({
  session_id: z.string().uuid(),
});

router.get("/active", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;

  const { data, error } = await db
    .from("timer_sessions")
    .select("*")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ session: data });
});

router.post("/start", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // End any open session first
  const now = new Date().toISOString();
  const { data: openSessions } = await db
    .from("timer_sessions")
    .select("*")
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (openSessions?.length) {
    for (const session of openSessions) {
      const started = new Date(session.started_at).getTime();
      const duration = Math.max(0, Math.floor((Date.now() - started) / 1000));
      await db
        .from("timer_sessions")
        .update({ ended_at: now, duration_seconds: duration })
        .eq("id", session.id);
    }
  }

  const { data, error } = await db
    .from("timer_sessions")
    .insert({
      user_id: user.id,
      task_id: parsed.data.task_id ?? null,
      mode: parsed.data.mode,
      kind: parsed.data.kind,
      started_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ session: data });
});

router.post("/stop", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const parsed = stopSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { data: existing, error: findError } = await db
    .from("timer_sessions")
    .select("*")
    .eq("id", parsed.data.session_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) {
    return res.status(500).json({ error: findError.message });
  }
  if (!existing) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (existing.ended_at) {
    return res.json({ session: existing });
  }

  const endedAt = new Date();
  const duration = Math.max(
    0,
    Math.floor((endedAt.getTime() - new Date(existing.started_at).getTime()) / 1000),
  );

  const { data, error } = await db
    .from("timer_sessions")
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: duration,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ session: data });
});

export default router;
