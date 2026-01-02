// src/api/http.ts
const API_BASE = "http://127.0.0.1:8000";

export async function authFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  // You can later add auto-refresh here when res.status === 401
  return res;
}
