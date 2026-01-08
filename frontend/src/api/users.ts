import type { User } from "../types";
import { authFetch } from "./http";

export async function getUser(accessToken: string, id: string): Promise<User> {
  const res = await authFetch(`/api/users/${id}/`, accessToken);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Failed to load user");
  return data as User;
}

export async function patchUser(accessToken: string, id: string, patch: Partial<User>): Promise<User> {
  const res = await authFetch(`/api/users/${id}/`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Failed to update user");
  // backend might return partial; safest: refetch
  return getUser(accessToken, id);
}

export async function patchUserRole(accessToken: string, id: string, role: User["role"]): Promise<void> {
  const res = await authFetch(`/api/users/${id}/role/`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Failed to update role");
}
