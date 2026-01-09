import { authFetch } from "./http";

export type ActivityLog = {
  id: number;
  providerId: string | null;

  actor_type: "USER" | "GROUP3_SYSTEM" | "SYSTEM";
  actorUserId?: string | null;
  actorUserName?: string | null;

  event_type: string;
  entity_type: string;
  entity_id: string;

  message: string;
  metadata?: any;
  created_at: string;
};

export async function getActivityLogs(access: string): Promise<ActivityLog[]> {
  const res = await authFetch("/api/activity-logs/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to load activity logs (${res.status})`);
  return data as ActivityLog[];
}
