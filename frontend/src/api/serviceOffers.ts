import { authFetch } from "./http";

/**
 * This type matches your Django ServiceOfferSerializer response:
 * - daily_rate, total_cost are snake_case
 * - travelCostPerOnsiteDay is camelCase
 * - mustHaveMatchPercentage / niceToHaveMatchPercentage are camelCase
 */
export type ServiceOffer = {
  id: number;
  serviceRequestId: string;
  providerId: string;
  specialistId: string;

  daily_rate: string | number; // DRF Decimal can come as string
  travelCostPerOnsiteDay: string | number;
  total_cost: string | number;

  contractualRelationship: "Employee" | "Freelancer" | "Subcontractor";
  subcontractorCompany?: string | null;

  mustHaveMatchPercentage?: number | null;
  niceToHaveMatchPercentage?: number | null;

  status: "Draft" | "Submitted" | "Withdrawn" | "Accepted" | "Rejected";
  submitted_at?: string | null;
  created_at: string;
};

export type CreateOfferPayload = {
  serviceRequestId: string;
  specialistId: string;

  daily_rate: number;
  travelCostPerOnsiteDay?: number;
  total_cost: number;

  contractualRelationship?: "Employee" | "Freelancer" | "Subcontractor";
  subcontractorCompany?: string | null;

  mustHaveMatchPercentage?: number | null;
  niceToHaveMatchPercentage?: number | null;

  status: "Draft" | "Submitted";
};

export async function getServiceOffers(access: string): Promise<ServiceOffer[]> {
  const res = await authFetch("/api/service-offers/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service offers (${res.status})`);
  return data as ServiceOffer[];
}

export async function getServiceOfferById(access: string, id: number): Promise<ServiceOffer> {
  const res = await authFetch(`/api/service-offers/${id}/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch service offer (${res.status})`);
  return data as ServiceOffer;
}

export async function createServiceOffer(access: string, payload: CreateOfferPayload): Promise<ServiceOffer> {
  const res = await authFetch("/api/service-offers/", access, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to create offer (${res.status})`);
  return data as ServiceOffer;
}

/**
 * Calls your backend endpoint:
 * PATCH /api/service-offers/:id/status/  body: { status: "Submitted" | "Withdrawn" }
 */
export async function updateServiceOfferStatus(
  access: string,
  offerId: number,
  status: "Submitted" | "Withdrawn"
): Promise<ServiceOffer> {
  const res = await authFetch(`/api/service-offers/${offerId}/status/`, access, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to update offer status (${res.status})`);
  return data as ServiceOffer;
}
