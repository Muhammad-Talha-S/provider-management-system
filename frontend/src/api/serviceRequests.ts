// src/api/serviceRequests.ts
import type { ServiceRequest } from "../types";
import { authFetch } from "./http";

/**
 * List all service requests visible to provider
 */
export async function getServiceRequests(accessToken: string): Promise<ServiceRequest[]> {
  const res = await authFetch("/api/service-requests/", accessToken, { method: "GET" });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch service requests (${res.status})`);
  }
  return data as ServiceRequest[];
}

/**
 * Fetch single service request by ID
 */
export async function getServiceRequestById(accessToken: string, id: string): Promise<ServiceRequest> {
  const res = await authFetch(`/api/service-requests/${id}/`, accessToken, { method: "GET" });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch service request (${res.status})`);
  }
  return data as ServiceRequest;
}
