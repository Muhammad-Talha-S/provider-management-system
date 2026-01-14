import { authFetch } from "./http";

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

function isPlainObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Extract best error message from Django REST Framework error payloads:
 * - {detail: "..."}
 * - {non_field_errors: ["..."]}
 * - {field: ["..."]} or {field: "..."}
 * - nested objects
 */
function extractDrfErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;

  // Simple string payload (rare)
  if (typeof data === "string") return data;

  // Typical DRF: {detail: "..."}
  if (isPlainObject(data) && typeof data.detail === "string") return data.detail;

  // Typical DRF: {non_field_errors: ["..."]}
  if (isPlainObject(data) && Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    const first = data.non_field_errors[0];
    if (typeof first === "string") return first;
  }

  // Field errors: {field: ["msg"]} or {field: "msg"}
  if (isPlainObject(data)) {
    // Try to find the first error message anywhere in the object (shallow)
    for (const key of Object.keys(data)) {
      const v = data[key];
      if (typeof v === "string") return v;
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
      if (isPlainObject(v)) {
        // Nested: try one level down
        for (const nk of Object.keys(v)) {
          const nv = v[nk];
          if (typeof nv === "string") return nv;
          if (Array.isArray(nv) && nv.length > 0 && typeof nv[0] === "string") return nv[0];
        }
      }
    }
  }

  // If it's an array, show first string item if any
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === "string") return first;
  }

  return fallback;
}

async function parseJsonSafe(res: Response) {
  return await res.json().catch(() => null);
}

export async function getServiceOffers(access: string): Promise<ServiceOffer[]> {
  const res = await authFetch("/api/service-offers/", access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(extractDrfErrorMessage(data, `Failed to fetch service offers (${res.status})`));
  }
  return data as ServiceOffer[];
}

export async function getServiceOfferById(access: string, id: number): Promise<ServiceOffer> {
  const res = await authFetch(`/api/service-offers/${id}/`, access, { method: "GET" });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(extractDrfErrorMessage(data, `Failed to fetch service offer (${res.status})`));
  }
  return data as ServiceOffer;
}

export async function createServiceOffer(access: string, payload: CreateOfferPayload): Promise<ServiceOffer> {
  const res = await authFetch("/api/service-offers/", access, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(extractDrfErrorMessage(data, `Failed to create offer (${res.status})`));
  }
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

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(extractDrfErrorMessage(data, `Failed to update offer status (${res.status})`));
  }
  return data as ServiceOffer;
}
