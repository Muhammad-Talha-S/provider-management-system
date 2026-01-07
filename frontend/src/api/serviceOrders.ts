import { authFetch } from "./http";

export type ServiceOrderStatus = "Active" | "Completed";

export type ServiceOrderChange = {
  type: string;
  status: string;
  initiatedBy: string;
  date: string;
  payload?: any;
};

export type ServiceOrder = {
  id: number;
  serviceOfferId: number;
  serviceRequestId: string;
  providerId: string;
  specialistId: string;

  title: string;
  startDate: string | null;
  endDate: string | null;
  location: string;
  manDays: number;

  status: ServiceOrderStatus;
  changeHistory: ServiceOrderChange[];
  created_at: string;
};

export async function getServiceOrders(access: string): Promise<ServiceOrder[]> {
  const res = await authFetch("/api/service-orders/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service orders (${res.status})`);
  return data as ServiceOrder[];
}

export async function getServiceOrderById(access: string, id: number): Promise<ServiceOrder> {
  const res = await authFetch(`/api/service-orders/${id}/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service order (${res.status})`);
  return data as ServiceOrder;
}

export async function requestSubstitution(
  access: string,
  orderId: number,
  payload: { newSpecialistId: string; reason?: string }
) {
  const res = await authFetch(`/api/service-orders/${orderId}/substitution/`, access, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to request substitution (${res.status})`);
  return data as ServiceOrder;
}
