import { API_BASE } from "./config";

export async function meRequest(access: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/auth/me/`, {
    method: "GET",
    headers: { Authorization: `Bearer ${access}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed /me (${res.status})`);
  return data;
}

export async function refreshRequest(refresh: string): Promise<{ access: string }> {
  const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed refresh (${res.status})`);
  return data as { access: string };
}
