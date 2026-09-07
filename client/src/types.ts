export type PreferredMode = "pomodoro" | "task_track";
export type TaskStatus = "todo" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type SessionKind = "focus" | "break";

export interface Profile {
  id: string;
  display_name: string | null;
  preferred_mode: PreferredMode;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_minutes: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimerSession {
  id: string;
  user_id: string;
  task_id: string | null;
  mode: PreferredMode;
  kind: SessionKind;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface SummaryResponse {
  range: "daily" | "weekly" | "monthly";
  since: string;
  stats: {
    tasks_created: number;
    tasks_completed: number;
    focus_minutes: number;
    break_minutes: number;
    pomodoro_count: number;
    sessions_count: number;
  };
  completed_tasks: Task[];
  sessions: TimerSession[];
}

export interface AiPlan {
  tasks: Array<{
    title: string;
    description?: string | null;
    estimated_minutes?: number | null;
    priority?: TaskPriority;
  }>;
  breaks: Array<{
    after_task_index: number;
    minutes: number;
    label?: string;
  }>;
  summary?: string;
}
