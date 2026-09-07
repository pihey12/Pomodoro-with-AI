import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { SummaryResponse } from "../types";

type Range = "daily" | "weekly" | "monthly";

export function SummaryPage() {
  const [range, setRange] = useState<Range>("daily");
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFetch<SummaryResponse>(`/api/summary?range=${range}`);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load summary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const maxBar = Math.max(
    data?.stats.focus_minutes ?? 0,
    data?.stats.break_minutes ?? 0,
    data?.stats.tasks_completed ?? 0,
    1,
  );

  return (
    <div className="summary-page">
      <div className="section-head">
        <div>
          <h1>Performance summary</h1>
          <p className="muted">Daily, weekly, and monthly focus stats from your timer sessions.</p>
        </div>
      </div>

      <div className="sub-nav" role="tablist">
        {(["daily", "weekly", "monthly"] as Range[]).map((r) => (
          <button
            key={r}
            type="button"
            className={range === r ? "active" : ""}
            onClick={() => setRange(r)}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading summary…</p>}
      {error && <p className="error">{error}</p>}

      {data && !loading && (
        <>
          <div className="stat-grid">
            <Stat label="Tasks completed" value={data.stats.tasks_completed} />
            <Stat label="Tasks created" value={data.stats.tasks_created} />
            <Stat label="Focus minutes" value={data.stats.focus_minutes} />
            <Stat label="Break minutes" value={data.stats.break_minutes} />
            <Stat label="Pomodoros" value={data.stats.pomodoro_count} />
            <Stat label="Sessions" value={data.stats.sessions_count} />
          </div>

          <div className="bars">
            <Bar label="Focus min" value={data.stats.focus_minutes} max={maxBar} />
            <Bar label="Break min" value={data.stats.break_minutes} max={maxBar} />
            <Bar label="Completed" value={data.stats.tasks_completed} max={maxBar} />
          </div>

          <section className="summary-lists">
            <div>
              <h2>Completed tasks</h2>
              {data.completed_tasks.length === 0 ? (
                <p className="muted">None in this range yet.</p>
              ) : (
                <ul>
                  {data.completed_tasks.map((t) => (
                    <li key={t.id}>
                      <strong>{t.title}</strong>
                      {t.completed_at && (
                        <span className="muted tiny">
                          {" "}
                          · {new Date(t.completed_at).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="bar-row">
      <span>{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-value">{value}</span>
    </div>
  );
}
