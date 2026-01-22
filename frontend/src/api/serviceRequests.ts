import { authFetch } from "./http";

async function parseJsonSafe(res: Response) {
  return await res.json().catch(() => null);
}

function extractError(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  return fallback;
}

export async function getServiceRequests(access: string): Promise<any[]> {
  const res = await authFetch("/api/service-requests/", access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(extractError(data, `Failed to fetch service requests (${res.status})`));
  return data as any[];
}

export async function getServiceRequestById(access: string, id: string): Promise<any> {
  const res = await authFetch(`/api/service-requests/${encodeURIComponent(id)}/`, access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(extractError(data, `Failed to fetch service request (${res.status})`));
  return data as any;
}

export async function syncServiceRequestsFromGroup3(access: string): Promise<{ upserted: number }> {
  const res = await authFetch("/api/integrations/group3/sync-service-requests/", access, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(extractError(data, `Failed to sync from Group3 (${res.status})`));
  return data as { upserted: number };
}

export async function getSuggestedSpecialists(
  access: string,
  requestId: string,
  opts?: { mode?: "recommended" | "eligible"; limit?: number }
): Promise<{ specialists: any[]; eligibleCount: number }> {
  const mode = opts?.mode || "recommended";
  const limit = opts?.limit ?? 10;

  const res = await authFetch(
    `/api/service-requests/${encodeURIComponent(requestId)}/suggested-specialists/?mode=${mode}&limit=${limit}`,
    access,
    { method: "GET" }
  );

  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(extractError(data, `Failed to load suggested specialists (${res.status})`));
  return data as { specialists: any[]; eligibleCount: number };
}
