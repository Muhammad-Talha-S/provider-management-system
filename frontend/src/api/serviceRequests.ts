import type { ServiceRequest } from "../types";
import { authFetch } from "./http";

export async function getServiceRequests(accessToken: string, status: string = "all"): Promise<ServiceRequest[]> {
  const qs = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  const res = await authFetch(`/api/service-requests/${qs}`, accessToken);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Failed to load service requests");
  return data as ServiceRequest[];
}

export async function getServiceRequest(accessToken: string, id: string): Promise<ServiceRequest> {
  const res = await authFetch(`/api/service-requests/${id}/`, accessToken);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Failed to load service request");
  return data as ServiceRequest;
}
