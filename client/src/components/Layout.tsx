import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { PreferredMode } from "../types";

export function Layout() {
  const { user, profile, setPreferredMode, signOut } = useAuth();
  const mode: PreferredMode = profile?.preferred_mode ?? "pomodoro";

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="brand-block">
          <p className="brand">FocusTrack</p>
          <p className="brand-sub">Pomodoro & Task Timer</p>
        </div>

        <nav className="main-nav" aria-label="Main">
          <NavLink to="/" end>
            Tracker
          </NavLink>
          <NavLink to="/summary">Summary</NavLink>
          <NavLink to="/suggestions">Suggestions</NavLink>
        </nav>

        <div className="header-actions">
          <div className="mode-toggle" role="group" aria-label="Timer mode">
            <button
              type="button"
              className={mode === "pomodoro" ? "active" : ""}
              onClick={() => void setPreferredMode("pomodoro")}
            >
              Pomodoro
            </button>
            <button
              type="button"
              className={mode === "task_track" ? "active" : ""}
              onClick={() => void setPreferredMode("task_track")}
            >
              Task Track
            </button>
          </div>

          <div className="user-chip">
            <span>{profile?.display_name ?? user?.email ?? "User"}</span>
            <button type="button" className="ghost" onClick={() => void signOut()}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="page-main">
        <Outlet />
      </main>
    </div>
  );
}
