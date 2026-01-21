import type { ServiceOrder } from "../types";
import { authFetch } from "./http";

/**
 * Convert backend/service-order payload to frontend ServiceOrder type.
 * Ensures status matches types.ts: "ACTIVE" | "COMPLETED".
 */
function mapOrder(raw: any): ServiceOrder {
  const rawStatus = String(raw?.status || "").toUpperCase();

  const status: ServiceOrder["status"] =
    rawStatus === "COMPLETED" ? "COMPLETED" : "ACTIVE";

  return {
    id: Number(raw.id),
    serviceOfferId: Number(raw.serviceOfferId ?? raw.service_offer_id ?? 0),
    serviceRequestId: String(raw.serviceRequestId ?? raw.service_request_id ?? ""),
    providerId: String(raw.providerId ?? raw.provider_id ?? ""),
    status,
    totalCost:
      raw.totalCost ??
      raw.total_cost ??
      (raw.total_cost === 0 ? 0 : undefined),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
}

/**
 * Fetch all service orders visible for the current role.
 * Backend is expected to filter for Specialist vs other roles.
 */
export async function getServiceOrders(access: string): Promise<ServiceOrder[]> {
  const res = await authFetch("/api/service-orders/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service orders (${res.status})`);
  return (Array.isArray(data) ? data : []).map(mapOrder);
}

/** Fetch a single service order by id. */
export async function getServiceOrderById(access: string, id: number | string): Promise<ServiceOrder> {
  const res = await authFetch(`/api/service-orders/${id}/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service order (${res.status})`);
  return mapOrder(data);
}

/** Alias for Specialist dashboard/orders: uses the same endpoint. */
export async function getMyOrders(access: string): Promise<ServiceOrder[]> {
  return getServiceOrders(access);
}
