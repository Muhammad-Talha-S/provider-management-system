// frontend/src/api/serviceOrders.ts
import { authFetch } from "./http";

export type ServiceOrder = {
  id: number;
  serviceOfferId: number;
  serviceRequestId: string;
  providerId: string;

  // derived from assignments (first specialist shown in table)
  specialistId?: string;

  title: string;
  startDate?: string | null;
  endDate?: string | null;
  location: string;
  manDays: number;
  totalCost: string; // Decimal string
  status: "ACTIVE" | "COMPLETED";
  createdAt: string;

  assignments?: Array<{
    specialistId: string;
    specialistName: string;
    materialNumber: string;
    daily_rate: string;
    travelling_cost: string;
    specialist_cost: string;
    match_must_have_criteria: boolean;
    match_nice_to_have_criteria: boolean;
    match_language_skills: boolean;
  }>;
};

function mapOrder(raw: any): ServiceOrder {
  const assignments = Array.isArray(raw?.assignments) ? raw.assignments : [];
  const firstSpecialistId = assignments?.[0]?.specialistId;

  return {
    id: raw.id,
    serviceOfferId: raw.serviceOfferId,
    serviceRequestId: raw.serviceRequestId,
    providerId: raw.providerId,

    specialistId: firstSpecialistId,

    title: raw.title || "",
    startDate: raw.start_date ?? null,
    endDate: raw.end_date ?? null,
    location: raw.location || "",
    manDays: Number(raw.man_days ?? 0),
    totalCost: String(raw.total_cost ?? "0"),
    status: String(raw.status || "").toUpperCase() === "COMPLETED" ? "Completed" : "Active",
    createdAt: raw.created_at,

    assignments,
  };
}

export async function getServiceOrders(access: string): Promise<ServiceOrder[]> {
  const res = await authFetch("/api/service-orders/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service orders (${res.status})`);
  return (Array.isArray(data) ? data : []).map(mapOrder);
}

export async function getServiceOrderById(access: string, id: number | string): Promise<ServiceOrder> {
  const res = await authFetch(`/api/service-orders/${id}/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service order (${res.status})`);
  return mapOrder(data);
}

export async function getMyOrders(access: string): Promise<ServiceOrder[]> {
  return getServiceOrders(access);
}
