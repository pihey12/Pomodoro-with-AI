import { supabase } from "./supabase";

/**
 * Production on Vercel: same-origin `/api` (empty base).
 * If VITE_API_URL was set to localhost in Vercel env by mistake, ignore it in prod builds.
 */
function resolveApiUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? "").trim();
  if (import.meta.env.PROD) {
    if (!raw || raw.includes("localhost") || raw.includes("127.0.0.1")) {
      return "";
    }
    return raw.replace(/\/$/, "");
  }
  return raw || "http://localhost:3001";
}

const API_URL = resolveApiUrl();

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : body?.error
          ? JSON.stringify(body.error)
          : res.statusText;
    throw new ApiError(res.status, message, body);
  }

  return body as T;
}
