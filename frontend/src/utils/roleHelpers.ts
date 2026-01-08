import type { User, UserRole } from "../types";

export const hasRole = (user: User | null | undefined, role: UserRole): boolean => {
  if (!user) return false;
  return user.role === role;
};

export function hasAnyRole(user: User | null | undefined, roles: string[]) {
  if (!user) return false;
  return roles.includes(user.role);
}

export const canViewServiceRequests = (user: User | null | undefined): boolean => {
  return hasAnyRole(user, ["Provider Admin", "Supplier Representative"]);
};

export const canManageOffers = (user: User | null | undefined): boolean => {
  return hasAnyRole(user, ["Provider Admin", "Supplier Representative"]);
};

export const canViewContracts = (user: User | null | undefined): boolean => {
  return hasAnyRole(user, ["Provider Admin", "Contract Coordinator"]);
};

export const canManageUsers = (user: User | null | undefined): boolean => {
  return hasRole(user, "Provider Admin");
};

export const canViewActivityLogs = (user: User | null | undefined): boolean => {
  return hasRole(user, "Provider Admin");
};

export const canViewServiceOrders = (user: User | null | undefined): boolean => {
  return hasAnyRole(user, ["Provider Admin", "Supplier Representative", "Specialist"]);
};

export const canManageSpecialists = (user: User | null | undefined): boolean => {
  return hasAnyRole(user, ["Provider Admin", "Supplier Representative"]);
};

export const isSpecialistOnly = (user: User | null | undefined): boolean => {
  return !!user && user.role === "Specialist";
};

export const canEditUserProfile = (user: User | null | undefined): boolean => {
  return !!user && user.role === "Provider Admin";
};

export const canChangeUserRole = (user: User | null | undefined): boolean => {
  return !!user && user.role === "Provider Admin";
};
