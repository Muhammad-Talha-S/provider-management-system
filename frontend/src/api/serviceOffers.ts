// frontend/src/api/serviceOffers.ts
import { authFetch } from "./http";
import type { ServiceOffer } from "../types";

async function parseJsonSafe(res: Response) {
  return await res.json().catch(() => null);
}

function extractError(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;

  // DRF serializer errors: { field: ["msg"] }
  if (typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const v = (data as any)[firstKey];
    if (Array.isArray(v) && v.length) return `${firstKey}: ${v[0]}`;
    if (typeof v === "string") return `${firstKey}: ${v}`;
  }

  return fallback;
}

export type CreateServiceOfferPayload = {
  serviceRequestId: string;

  // IMPORTANT: backend expects offerStatus (not status)
  offerStatus: "DRAFT" | "SUBMITTED";

  contractualRelationship?: string;
  subcontractorCompany?: string;

  supplierName?: string;
  supplierRepresentative?: string;

  specialists: Array<{
    userId: string;
    dailyRate: number;
    travellingCost: number;
    specialistCost?: number;
    matchMustHaveCriteria: boolean;
    matchNiceToHaveCriteria: boolean;
    matchLanguageSkills: boolean;
  }>;
};

export async function getServiceOffers(access: string): Promise<ServiceOffer[]> {
  const res = await authFetch("/api/service-offers/", access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(extractError(data, `Failed to fetch service offers (${res.status})`));
  return data as ServiceOffer[];
}

export async function getServiceOfferById(access: string, id: number): Promise<ServiceOffer> {
  const res = await authFetch(`/api/service-offers/${id}/`, access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(extractError(data, `Failed to fetch service offer (${res.status})`));
  return data as ServiceOffer;
}

export async function createServiceOffer(access: string, payload: CreateServiceOfferPayload): Promise<ServiceOffer> {
  const res = await authFetch("/api/service-offers/", access, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(extractError(data, `Failed to create offer (${res.status})`));
  return data as ServiceOffer;
}
