import type { User, Provider } from "../types";

const API_BASE = "http://127.0.0.1:8000";

export type MeResponse = { user: User; provider: Provider };

export async function meRequest(access: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/api/auth/me/`, {
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.detail || `Me request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as MeResponse;
}

export async function refreshRequest(refresh: string): Promise<{ access: string }> {
  const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.detail || `Token refresh failed (${res.status})`;
    throw new Error(msg);
  }
  return data as { access: string };
}
