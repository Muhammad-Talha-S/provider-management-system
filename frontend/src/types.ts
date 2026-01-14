// User roles - Specialist is now a role, not a separate entity
export type UserRole = "Provider Admin" | "Supplier Representative" | "Contract Coordinator" | "Specialist";

// Provider type
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

// User type - unified model that includes specialist information
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  providerId: string;
  status: "Active" | "Inactive";
  createdAt: string;

  // Specialist-specific fields
  photo?: string;
  materialNumber?: string;
  experienceLevel?: "Junior" | "Mid" | "Senior" | "Expert";
  technologyLevel?: "Basic" | "Intermediate" | "Advanced" | "Expert";
  performanceGrade?: "A" | "B" | "C" | "D";
  averageDailyRate?: number;
  skills?: string[];
  availability?: "Available" | "Partially Booked" | "Fully Booked";
  serviceRequestsCompleted?: number;
  serviceOrdersActive?: number;
}

// Specialist type - kept for backward compatibility, but now references User
export interface Specialist extends User {}

// Contract type
export interface Contract {
  id: string;
  title: string;
  status: "Draft" | "Published" | "Active" | "Expired";
  publishDate: string;
  offerDeadline: string;
  startDate: string;
  endDate: string;
  scopeOfWork: string;
  termsAndConditions?: string;
  functionalWeight?: number;
  commercialWeight?: number;
  acceptedRequestTypes: string[];
  allowedDomains: string[];
  allowedRoles: string[];
  experienceLevels: string[];
  offerCyclesAndDeadlines?: { requestType: string; cycle: string; deadline: string }[];
  pricingLimits: {
    role: string;
    experienceLevel: string;
    technologyLevel?: string;
    maxRate: number;
  }[];
  versionHistory: {
    version: number;
    date: string;
    status: "Proposed" | "Signed" | "Rejected";
    changes: string;
    documentLink?: string;
  }[];
}

// Service Request type (matches backend camelCase mapping)
export interface ServiceRequest {
  id: string;
  title: string;
  type: "Single" | "Multi" | "Team" | "Work Contract";
  offerDeadlineAt?: string | null; // ISO string
  cycles?: number | null;
  linkedContractId: string;
  role: string;
  technology: string;
  experienceLevel: string;
  startDate: string;
  endDate: string;
  totalManDays: number;
  onsiteDays: number;
  performanceLocation: "Onshore" | "Nearshore" | "Offshore";
  requiredLanguages: string[];
  mustHaveCriteria: { name: string; weight: number }[];
  niceToHaveCriteria: { name: string; weight: number }[];
  taskDescription: string;
  status: "Open" | "Closed";
}

/**
 * IMPORTANT:
 * Your real Offers pages use types from `src/api/serviceOffers.ts`.
 * This type stays only for legacy/mock compatibility (keep both styles optional).
 */
export interface ServiceOffer {
  id: string | number;
  serviceRequestId: string;
  specialistId: string;

  // legacy/mock fields:
  dailyRate?: number;
  travelCostPerOnsiteDay?: number;
  totalCost?: number;

  // API fields (current real backend):
  daily_rate?: string | number;
  total_cost?: string | number;

  contractualRelationship?: "Employee" | "Freelancer" | "Subcontractor";
  subcontractorCompany?: string;

  mustHaveMatchPercentage?: number | null;
  niceToHaveMatchPercentage?: number | null;

  status: "Draft" | "Submitted" | "Accepted" | "Rejected" | "Withdrawn";
  submittedAt?: string;
  submitted_at?: string | null;
}

/**
 * Same concept for ServiceOrder:
 * Real Service Orders pages should import the type from `src/api/serviceOrders.ts`.
 * This stays for legacy/mock UI code.
 */
export interface ServiceOrder {
  id: string | number;

  // legacy/mock
  serviceRequestId?: string;
  specialistId?: string;
  role?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  manDays?: number;
  supplierCompany?: string;
  representativeName?: string;
  status?: "Active" | "Completed" | "Cancelled";
  changeHistory?: { type: string; initiatedBy: string; date: string; status: string }[];

  // API fields (optional here)
  serviceOfferId?: number;
  providerId?: string;
  total_cost?: string | number;
  created_at?: string;
}

// Activity Log type
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  changes?: string;
}
