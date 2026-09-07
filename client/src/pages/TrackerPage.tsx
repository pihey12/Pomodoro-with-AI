import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { playPomodoroAlarm } from "../lib/alarm";
import { useAuth } from "../context/AuthContext";
import type { AiPlan, Task, TimerSession } from "../types";

type Filter = "all" | "todo" | "done";
type CompletedKind = "focus" | "break";

const POMODORO_FOCUS = 25 * 60;
const POMODORO_BREAK = 5 * 60;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function TrackerPage() {
  const { profile } = useAuth();
  const mode = profile?.preferred_mode ?? "pomodoro";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [session, setSession] = useState<TimerSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** After a Pomodoro block hits 0 — show next-step buttons. */
  const [phaseComplete, setPhaseComplete] = useState<CompletedKind | null>(null);

  const [aiPrompt, setAiPrompt] = useState("Can you set 5 tasks then break?");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AiPlan | null>(null);

  const completingRef = useRef(false);

  async function loadTasks() {
    const data = await apiFetch<{ tasks: Task[] }>("/api/tasks");
    setTasks(data.tasks);
  }

  async function loadActiveSession() {
    const data = await apiFetch<{ session: TimerSession | null }>("/api/sessions/active");
    setSession(data.session);
    if (data.session) {
      const started = new Date(data.session.started_at).getTime();
      setElapsed(Math.floor((Date.now() - started) / 1000));
    } else {
      setElapsed(0);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadTasks(), loadActiveSession()]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tracker");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session || session.ended_at) return;
    const id = window.setInterval(() => {
      const started = new Date(session.started_at).getTime();
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [session]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const targetSeconds =
    mode === "pomodoro"
      ? session?.kind === "break"
        ? POMODORO_BREAK
        : session
          ? POMODORO_FOCUS
          : null
      : null;

  const displaySeconds =
    targetSeconds != null ? Math.max(0, targetSeconds - elapsed) : elapsed;

  const isRunning = Boolean(session && !session.ended_at && !phaseComplete);

  // Pomodoro: when countdown hits 0 → alarm + stop session + show next buttons
  useEffect(() => {
    if (mode !== "pomodoro") return;
    if (!session || session.ended_at || phaseComplete) return;
    if (completingRef.current) return;

    const limit = session.kind === "break" ? POMODORO_BREAK : POMODORO_FOCUS;
    if (elapsed < limit) return;

    completingRef.current = true;
    const finishedKind = session.kind;

    (async () => {
      try {
        playPomodoroAlarm();
        await apiFetch<{ session: TimerSession }>("/api/sessions/stop", {
          method: "POST",
          body: JSON.stringify({ session_id: session.id }),
        });
        setSession(null);
        setElapsed(0);
        setPhaseComplete(finishedKind);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete timer");
        completingRef.current = false;
      }
    })();
  }, [mode, session, elapsed, phaseComplete]);

  async function toggleDone(task: Task) {
    const next = task.status === "todo" ? "done" : "todo";
    const data = await apiFetch<{ task: Task }>(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    setTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)));
  }

  async function removeTask(id: string) {
    await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }

  async function startTimer(kind: "focus" | "break") {
    setError(null);
    setPhaseComplete(null);
    completingRef.current = false;
    const data = await apiFetch<{ session: TimerSession }>("/api/sessions/start", {
      method: "POST",
      body: JSON.stringify({
        kind,
        mode,
        task_id: selectedTaskId,
      }),
    });
    setSession(data.session);
    setElapsed(0);
  }

  async function stopTimer() {
    if (!session) return;
    const data = await apiFetch<{ session: TimerSession }>("/api/sessions/stop", {
      method: "POST",
      body: JSON.stringify({ session_id: session.id }),
    });
    setSession(data.session.ended_at ? null : data.session);
    setElapsed(0);
    setPhaseComplete(null);
    completingRef.current = false;
  }

  async function runAiPlan() {
    setAiBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ plan: AiPlan; created_tasks: Task[] }>("/api/ai/plan", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt, create_tasks: true }),
      });
      setAiResult(data.plan);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI plan failed");
    } finally {
      setAiBusy(false);
    }
  }

  function timerStatusText() {
    if (phaseComplete === "focus") {
      return "Focus finished — take a break or start another focus";
    }
    if (phaseComplete === "break") {
      return "Break finished — ready for the next focus";
    }
    if (isRunning && session) {
      return `${session.kind} · running`;
    }
    if (selectedTaskId) return "Ready — task selected";
    return "Select a task (optional) then start";
  }

  if (loading) {
    return <p className="muted">Loading tracker…</p>;
  }

  return (
    <div className="tracker-layout">
      <section className="tracker-main">
        <div className="section-head">
          <div>
            <h1>Timer Tracker</h1>
            <p className="muted">
              Mode: <strong>{mode === "pomodoro" ? "Pomodoro" : "Task Track"}</strong>
              {mode === "pomodoro"
                ? " — 25m focus / 5m break cycles"
                : " — free-form timer per task"}
            </p>
          </div>
        </div>

        <div className="sub-nav" role="tablist" aria-label="Task filter">
          {(["all", "todo", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "todo" ? "Active" : "Done"}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        <ul className="task-list">
          {filtered.length === 0 && <li className="muted empty">No tasks in this filter.</li>}
          {filtered.map((task) => (
            <li
              key={task.id}
              className={`task-row ${selectedTaskId === task.id ? "selected" : ""} ${task.status}`}
            >
              <button
                type="button"
                className="task-select"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <span className={`prio ${task.priority}`}>{task.priority}</span>
                <div>
                  <strong>{task.title}</strong>
                  {task.description && <p className="muted tiny">{task.description}</p>}
                  {task.estimated_minutes != null && (
                    <p className="tiny muted">~{task.estimated_minutes} min</p>
                  )}
                </div>
              </button>
              <div className="task-actions">
                <button type="button" className="ghost" onClick={() => void toggleDone(task)}>
                  {task.status === "todo" ? "Mark done" : "Reopen"}
                </button>
                <button type="button" className="ghost danger" onClick={() => void removeTask(task.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="tracker-side">
        <div className={`timer-panel ${phaseComplete ? "timer-done" : ""}`}>
          <h2>Timer</h2>
          <p className="timer-display">
            {phaseComplete ? "00:00" : formatTime(displaySeconds)}
          </p>
          <p className="muted tiny">{timerStatusText()}</p>
          <div className="button-row">
            {phaseComplete ? (
              <>
                <button type="button" onClick={() => void startTimer("focus")}>
                  Start focus
                </button>
                <button type="button" className="secondary" onClick={() => void startTimer("break")}>
                  Start break
                </button>
              </>
            ) : isRunning ? (
              <button type="button" className="secondary" onClick={() => void stopTimer()}>
                Stop
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void startTimer("focus")}>
                  Start focus
                </button>
                {mode === "pomodoro" && (
                  <button type="button" className="secondary" onClick={() => void startTimer("break")}>
                    Start break
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="ai-panel">
          <h2>AI prompt</h2>
          <p className="muted tiny">
            Example: “set 5 tasks then break” — OpenAI plans tasks and inserts them.
          </p>
          <textarea
            rows={4}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe the plan you want…"
          />
          <button type="button" disabled={aiBusy || !aiPrompt.trim()} onClick={() => void runAiPlan()}>
            {aiBusy ? "Planning…" : "Generate & add tasks"}
          </button>
          {aiResult && (
            <div className="ai-result">
              {aiResult.summary && <p>{aiResult.summary}</p>}
              <p className="tiny muted">
                {aiResult.tasks.length} tasks
                {aiResult.breaks.length > 0
                  ? ` · ${aiResult.breaks.length} break suggestion(s)`
                  : ""}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
