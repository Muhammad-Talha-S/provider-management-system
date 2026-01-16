import { authFetch } from "./http";

export type ContractStatus = "Draft" | "Published" | "In Negotiation" | "Awarded" | "Active" | "Expired";

export type ContractKind = "Service" | "License" | "Hardware";

export type RequestType = "Single" | "Multi" | "Team" | "Work Contract";

export type PricingLimit = {
  role: string;
  experienceLevel: string;
  technologyLevel?: string | null;
  maxRate: number;
};

export type OfferCycle = {
  requestType: string;
  cycle: string;
  deadline: string;
};

export type VersionHistoryItem = {
  version: number;
  date: string;
  status: "Signed" | "Proposed" | "Rejected";
  changes: string;
  documentLink?: string | null;
};


export type AllowedRequestConfigs = Partial<
  Record<RequestType, { offerDeadlineDays: number; cycles: 1 | 2 }>
>;

export type Contract = {
  id: string;
  title: string;
  status: ContractStatus;
  kind: ContractKind;

  publishedAt?: string | null;
  offerDeadline?: string | null; // optional if backend supports it

  startDate?: string | null;
  endDate?: string | null;

  scopeOfWork?: string;
  termsAndConditions?: string;

  functionalWeight?: number; // optional
  commercialWeight?: number; // optional

  allowedRequestConfigs?: AllowedRequestConfigs;

  // Award info (Option A)
  awardedProviderId?: string | null;

  acceptedRequestTypes?: string[];
  allowedDomains?: string[];
  allowedRoles?: string[];
  experienceLevels?: string[];

  offerCyclesAndDeadlines?: OfferCycle[];
  pricingLimits?: PricingLimit[];
  versionHistory?: VersionHistoryItem[];
};

export type ContractOfferStatus =
  | "Draft"
  | "Submitted"
  | "Countered"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";

export type ContractOffer = {
  id: number;
  contractId: string;
  providerId: string;
  createdByUserId?: string | null;

  status: ContractOfferStatus;
  submittedAt?: string | null;
  createdAt: string;

  // commercial offer details (keep flexible)
  note?: string;
  proposedDailyRate?: string | number | null;
  proposedTerms?: string | null;
};

export type CreateContractOfferPayload = {
  note?: string;
  proposedDailyRate?: number | null;
  proposedTerms?: string | null;
};

export async function getContracts(access: string): Promise<Contract[]> {
  const res = await authFetch("/api/contracts/", access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch contracts (${res.status})`);
  return data as Contract[];
}

export async function getContractById(access: string, id: string): Promise<Contract> {
  const res = await authFetch(`/api/contracts/${id}/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch contract (${res.status})`);
  return data as Contract;
}

export async function getMyContractOffers(access: string, contractId: string): Promise<ContractOffer[]> {
  const res = await authFetch(`/api/contracts/${contractId}/offers/`, access, { method: "GET" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to fetch offers (${res.status})`);
  return data as ContractOffer[];
}

export async function createContractOffer(
  access: string,
  contractId: string,
  payload: CreateContractOfferPayload
): Promise<ContractOffer> {
  const res = await authFetch(`/api/contracts/${contractId}/offers/`, access, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Failed to submit offer (${res.status})`);
  return data as ContractOffer;
}
