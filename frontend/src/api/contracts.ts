// frontend/src/api/contracts.ts
import { authFetch } from "./http";
import type { Contract } from "../types";

async function parseJsonSafe(res: Response) {
  return await res.json().catch(() => null);
}

export async function getContracts(access: string): Promise<Contract[]> {
  const res = await authFetch("/api/contracts/", access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch contracts (${res.status})`);
  return data as Contract[];
}

export async function getContractById(access: string, id: string): Promise<Contract> {
  const res = await authFetch(`/api/contracts/${id}/`, access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch contract (${res.status})`);
  return data as Contract;
}

export async function syncContractsFromGroup2(access: string): Promise<{ upserted: number; skipped: number }> {
  const res = await authFetch("/api/integrations/group2/sync-contracts/", access, { method: "POST" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || `Failed to sync contracts (${res.status})`);
  return data as { upserted: number; skipped: number };
}
