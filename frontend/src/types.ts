// frontend/src/types.ts

export type UserRole = "Provider Admin" | "Supplier Representative" | "Contract Coordinator" | "Specialist";

export interface Provider {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  communicationPreferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    preferredLanguage: string;
  };
  metrics: {
    totalUsers: number;
    activeSpecialists: number;
    activeServiceOrders: number;
    activeContracts: number;
  };
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  providerId: string;
  status: "Active" | "Inactive";
  createdAt: string;

  photo?: string;
  materialNumber?: string;

  experienceLevel?: "Junior" | "Intermediate" | "Senior";
  technologyLevel?: "Common" | "Uncommon" | "Rare";

  performanceGrade?: "A" | "B" | "C" | "D";
  averageDailyRate?: number;
  skills?: string[];
  availability?: "Available" | "Partially Booked" | "Fully Booked";
  serviceRequestsCompleted?: number;
  serviceOrdersActive?: number;
}

export interface Specialist extends User {}

export type ContractKind = "SERVICE" | "LICENSE" | "HARDWARE";
export type ContractStatus = "DRAFT" | "PUBLISHED" | "IN_NEGOTIATION" | "ACTIVE" | "EXPIRED";

export interface ContractAllowedConfiguration {
  domains: string[];
  roles: string[];
  experienceLevels: string[];
  technologyLevels: string[];
  acceptedServiceRequestTypes: Array<{
    type: "SINGLE" | "MULTI" | "TEAM" | "WORK_CONTRACT";
    isAccepted: boolean;
    biddingDeadlineDays: number;
    offerCycles: number;
  }>;
  pricingRules: {
    currency: "EUR";
    maxDailyRates: Array<{
      role: string;
      experienceLevel: string;
      technologyLevel: string;
      maxDailyRate: number;
    }>;
  };
}

export interface Contract {
  contractId: string;
  title: string;
  kind: ContractKind;
  status: ContractStatus;

  publishingDate?: string | null;
  offerDeadlineAt?: string | null;

  stakeholders?: {
    procurementManager?: string;
    legalCounsel?: string;
    contractAdministrator?: string;
  } | null;

  scopeOfWork?: string;
  termsAndConditions?: string;

  weighting?: { functional: number; commercial: number } | null;

  allowedConfiguration?: ContractAllowedConfiguration | null;

  versionsAndDocuments?: any[] | null;

  isAwardedToMyProvider: boolean;
  myProviderStatus?: { status: "IN_NEGOTIATION" | "ACTIVE" | "EXPIRED"; awardedAt?: string | null; note?: string } | null;
}

export type ServiceRequestType = "SINGLE" | "MULTI" | "TEAM" | "WORK_CONTRACT";

export interface Group3RoleRequirement {
  domain: string;
  roleName: string;
  technology: string;
  experienceLevel: string;
  manDays: number;
  onsiteDays: number;
}

export interface ServiceRequest {
  id: string; // requestNumber
  external_id?: number | null;

  requestNumber: string;
  title: string;
  type: ServiceRequestType;
  status: string;

  contractId: string;
  contractSupplier?: string;

  startDate?: string | null;
  endDate?: string | null;

  performanceLocation?: string;

  requiredLanguages?: string[];
  mustHaveCriteria?: string[];
  niceToHaveCriteria?: string[];

  taskDescription?: string;
  furtherInformation?: string;

  roles?: Group3RoleRequirement[];

  biddingCycleDays?: number | null;
  biddingStartAt?: string | null;
  biddingEndAt?: string | null;
  biddingActive?: boolean | null;
}

export type ServiceOfferStatus = "DRAFT" | "SUBMITTED" | "WITHDRAWN" | "ACCEPTED" | "REJECTED";

export interface ServiceOffer {
  id: number;
  serviceRequestId: string;
  providerId: string;
  status: ServiceOfferStatus;

  requestSnapshot?: any;
  response?: any; // response.specialists[] etc
  deltas?: any[];

  submittedAt?: string | null;
  createdAt: string;
}

export interface ServiceOrder {
  id: number;
  serviceOfferId: number;
  serviceRequestId: string;
  providerId: string;

  specialistId?: string;

  title: string;
  startDate?: string | null;
  endDate?: string | null;
  location: string;
  manDays: number;

  // Extended lifecycle (keep ACTIVE/COMPLETED for now; allow change states later)
  status: "ACTIVE" | "COMPLETED" | "EXTENSION_PENDING" | "SUBSTITUTION_PENDING";

  // Keep as decimal string (matches backend)
  totalCost: string;

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
}

