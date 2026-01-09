import { authFetch } from "./http";

export type ServiceOrder = {
  id: number;
  serviceOfferId: number;
  serviceRequestId: string;
  providerId: string;
  specialistId: string;

  title: string;
  startDate?: string | null;
  endDate?: string | null;
  location: string;
  manDays: number;
  total_cost: string; // DRF returns Decimal as string
  status: "Active" | "Completed";
  created_at: string;
};

export async function getServiceOrders(access: string): Promise<ServiceOrder[]> {
  const res = await authFetch("/api/service-orders/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service orders (${res.status})`);
  return data as ServiceOrder[];
}

export async function getServiceOrderById(access: string, id: number | string): Promise<ServiceOrder> {
  const res = await authFetch(`/api/service-orders/${id}/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service order (${res.status})`);
  return data as ServiceOrder;
}

export async function getMyOrders(access: string): Promise<ServiceOrder[]> {
  const res = await authFetch("/api/my-orders/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch my orders (${res.status})`);
  return data as ServiceOrder[];
}
