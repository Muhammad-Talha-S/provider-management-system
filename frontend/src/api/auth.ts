// src/api/auth.ts
import type { User, Provider } from "../types";

const API_BASE = "http://127.0.0.1:8000";

export type LoginResponse = {
  refresh: string;
  access: string;
  user: User;
  provider: Provider;
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  // Try to parse backend error payload (if any)
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.message ||
      (typeof data === "string" ? data : null) ||
      `Login failed (${res.status})`;
    throw new Error(msg);
  }

  return data as LoginResponse;
}
