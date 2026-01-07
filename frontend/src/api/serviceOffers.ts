import { authFetch } from "./http";

export type ServiceOfferStatus = "Draft" | "Submitted" | "Withdrawn" | "Accepted" | "Rejected";

export type ServiceOffer = {
  id: number;
  serviceRequestId: string;
  providerId: string;
  specialistId: string;

  daily_rate: string; // backend sends Decimal as string
  travelCostPerOnsiteDay: string;
  total_cost: string;

  contractualRelationship: "Employee" | "Freelancer" | "Subcontractor";
  subcontractorCompany?: string | null;

  mustHaveMatchPercentage?: number | null;
  niceToHaveMatchPercentage?: number | null;

  status: ServiceOfferStatus;
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

export async function createServiceOffer(access: string, payload: CreateOfferPayload) {
  const res = await authFetch("/api/service-offers/", access, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to create offer (${res.status})`);
  return data as ServiceOffer;
}

export async function getServiceOffers(access: string): Promise<ServiceOffer[]> {
  const res = await authFetch("/api/service-offers/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch offers (${res.status})`);
  return data as ServiceOffer[];
}

export async function getServiceOfferById(access: string, id: number): Promise<ServiceOffer> {
  const res = await authFetch(`/api/service-offers/${id}/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch offer (${res.status})`);
  return data as ServiceOffer;
}

export async function updateServiceOfferStatus(access: string, id: number, status: "Submitted" | "Withdrawn") {
  const res = await authFetch(`/api/service-offers/${id}/status/`, access, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to update offer status (${res.status})`);
  return data as ServiceOffer;
}
