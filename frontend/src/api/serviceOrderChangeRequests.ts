// frontend/src/api/serviceOrderChangeRequests.ts
import { authFetch } from "./http";

export type ChangeRequestType = "Extension" | "Substitution";
export type ChangeRequestStatus = "Requested" | "Approved" | "Declined";

export type ServiceOrderChangeRequest = {
  id: number;
  serviceOrderId: number;
  providerId: string;

  type: ChangeRequestType;
  status: ChangeRequestStatus;

  createdBySystem: boolean;
  createdByUserId?: string | null;
  decidedByUserId?: string | null;

  created_at: string;
  decided_at?: string | null;

  reason: string;
  providerResponseNote?: string;

  newEndDate?: string | null;
  additionalManDays?: number | null;
  newTotalCost?: string | null;

  oldSpecialistId?: string | null;
  newSpecialistId?: string | null;
};

export async function listChangeRequests(access: string): Promise<ServiceOrderChangeRequest[]> {
  const res = await authFetch("/api/service-order-change-requests/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch change requests (${res.status})`);
  return data as ServiceOrderChangeRequest[];
}

export async function requestSubstitution(access: string, payload: { serviceOrderId: number; newSpecialistId: string; reason?: string }) {
  const res = await authFetch("/api/service-order-change-requests/", access, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to request substitution (${res.status})`);
  return data as ServiceOrderChangeRequest;
}

export async function decideChangeRequest(
  access: string,
  id: number,
  payload: { decision: "Approve" | "Decline"; providerResponseNote?: string; newSpecialistId?: string }
) {
  const res = await authFetch(`/api/service-order-change-requests/${id}/decision/`, access, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to decide request (${res.status})`);
  return data as ServiceOrderChangeRequest;
}
