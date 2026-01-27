// frontend/src/api/serviceOrders.ts
import { authFetch } from "./http";

export type ServiceOrderAssignment = {
  specialistId: string;
  specialistName: string;
  materialNumber: string;

  // keep these snake_case because your UI pages use a.daily_rate etc
  daily_rate: string;
  travelling_cost: string;
  specialist_cost: string;

  match_must_have_criteria: boolean;
  match_nice_to_have_criteria: boolean;
  match_language_skills: boolean;
};

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

  assignments?: ServiceOrderAssignment[];
};

function pick<T = any>(raw: any, keys: string[], fallback: T): T {
  for (const k of keys) {
    if (raw && raw[k] !== undefined && raw[k] !== null) return raw[k] as T;
  }
  return fallback;
}

function mapAssignment(raw: any): ServiceOrderAssignment {
  // accept either camelCase or snake_case coming from backend
  const specialistId = String(pick(raw, ["specialistId", "specialist_id"], ""));
  const specialistName = String(pick(raw, ["specialistName", "specialist_name"], ""));
  const materialNumber = String(pick(raw, ["materialNumber", "material_number"], ""));

  const dailyRate = pick(raw, ["daily_rate", "dailyRate"], "0");
  const travellingCost = pick(raw, ["travelling_cost", "travellingCost"], "0");
  const specialistCost = pick(raw, ["specialist_cost", "specialistCost"], "0");

  return {
    specialistId,
    specialistName,
    materialNumber,
    daily_rate: String(dailyRate),
    travelling_cost: String(travellingCost),
    specialist_cost: String(specialistCost),

    match_must_have_criteria: Boolean(pick(raw, ["match_must_have_criteria", "matchMustHaveCriteria"], true)),
    match_nice_to_have_criteria: Boolean(pick(raw, ["match_nice_to_have_criteria", "matchNiceToHaveCriteria"], true)),
    match_language_skills: Boolean(pick(raw, ["match_language_skills", "matchLanguageSkills"], true)),
  };
}

function mapOrder(raw: any): ServiceOrder {
  const assignmentsRaw = Array.isArray(raw?.assignments) ? raw.assignments : [];
  const assignments = assignmentsRaw.map(mapAssignment);

  const firstSpecialistId =
    assignments?.[0]?.specialistId ||
    (assignmentsRaw?.[0]?.specialistId ?? assignmentsRaw?.[0]?.specialist_id);

  const statusRaw = String(raw?.status || "").toUpperCase();
  const status: "ACTIVE" | "COMPLETED" = statusRaw === "COMPLETED" ? "COMPLETED" : "ACTIVE";

  return {
    id: Number(raw?.id ?? 0),

    // backend serializer uses camelCase for these
    serviceOfferId: Number(pick(raw, ["serviceOfferId", "service_offer_id", "serviceOfferID"], 0)),
    serviceRequestId: String(pick(raw, ["serviceRequestId", "service_request_id"], "")),
    providerId: String(pick(raw, ["providerId", "provider_id"], "")),

    specialistId: firstSpecialistId ? String(firstSpecialistId) : undefined,

    title: String(pick(raw, ["title"], "")),

    // IMPORTANT FIX: read camelCase first (serializer), fallback to snake_case
    startDate: pick(raw, ["startDate", "start_date"], null),
    endDate: pick(raw, ["endDate", "end_date"], null),

    location: String(pick(raw, ["location"], "")),

    // IMPORTANT FIX
    manDays: Number(pick(raw, ["manDays", "man_days"], 0)),
    totalCost: String(pick(raw, ["totalCost", "total_cost"], "0")),

    status,

    // serializer sends created_at (snake) because you included "created_at" in fields
    createdAt: String(pick(raw, ["createdAt", "created_at"], "")),

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
