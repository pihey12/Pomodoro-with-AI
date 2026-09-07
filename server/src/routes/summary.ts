import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function rangeStart(range: string): Date {
  const now = new Date();
  const start = new Date(now);

  if (range === "weekly") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday start
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // daily
  start.setHours(0, 0, 0, 0);
  return start;
}

router.get("/", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const range =
    req.query.range === "weekly" || req.query.range === "monthly"
      ? req.query.range
      : "daily";

  const startIso = rangeStart(range).toISOString();

  const [tasksResult, sessionsResult] = await Promise.all([
    db
      .from("tasks")
      .select("id, title, status, priority, completed_at, estimated_minutes, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startIso),
    db
      .from("timer_sessions")
      .select("id, kind, mode, duration_seconds, started_at, ended_at")
      .eq("user_id", user.id)
      .gte("started_at", startIso),
  ]);

  if (tasksResult.error) {
    return res.status(500).json({ error: tasksResult.error.message });
  }
  if (sessionsResult.error) {
    return res.status(500).json({ error: sessionsResult.error.message });
  }

  const tasks = tasksResult.data ?? [];
  const sessions = sessionsResult.data ?? [];

  const completedTasks = tasks.filter((t) => t.status === "done");
  const focusSeconds = sessions
    .filter((s) => s.kind === "focus" && s.duration_seconds != null)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
  const breakSeconds = sessions
    .filter((s) => s.kind === "break" && s.duration_seconds != null)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
  const pomodoroCount = sessions.filter(
    (s) => s.kind === "focus" && s.mode === "pomodoro" && (s.duration_seconds ?? 0) > 0,
  ).length;

  return res.json({
    range,
    since: startIso,
    stats: {
      tasks_created: tasks.length,
      tasks_completed: completedTasks.length,
      focus_minutes: Math.round(focusSeconds / 60),
      break_minutes: Math.round(breakSeconds / 60),
      pomodoro_count: pomodoroCount,
      sessions_count: sessions.filter((s) => s.ended_at).length,
    },
    completed_tasks: completedTasks,
    sessions: sessions.filter((s) => s.ended_at),
  });
});

export default router;
