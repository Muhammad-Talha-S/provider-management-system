import { authFetch } from "./http";
import type { Specialist } from "../types";

export async function getSpecialists(access: string): Promise<Specialist[]> {
  const res = await authFetch("/api/specialists/", access, { method: "GET" });
  const data = await res.json().catch(() => null);

  if (!res.ok) throw new Error(data?.detail || `Failed to load specialists (${res.status})`);
  return data as Specialist[];
}
