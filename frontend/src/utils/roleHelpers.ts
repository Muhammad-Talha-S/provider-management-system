import type { User, UserRole } from '../types';

export const hasRole = (user: User, role: UserRole): boolean => {
  return user.role === role;
};

export function hasAnyRole(user: User | null | undefined, roles: string[]) {
  if (!user) return false;
  return roles.includes(user.role);
}

export const canViewServiceRequests = (user: User): boolean => {
  // Contract Coordinator cannot see Service Requests
  // Only Provider Admin and Supplier Representative can
  return hasAnyRole(user, ['Provider Admin', 'Supplier Representative']);
};

export const canManageOffers = (user: User): boolean => {
  return hasAnyRole(user, ['Provider Admin', 'Supplier Representative']);
};

export const canViewContracts = (user: User): boolean => {
  return hasAnyRole(user, ['Provider Admin', 'Contract Coordinator']);
};

export const canManageUsers = (user: User): boolean => {
  return hasRole(user, 'Provider Admin');
};

export const canViewActivityLogs = (user: User): boolean => {
  return hasRole(user, 'Provider Admin');
};

export const canViewServiceOrders = (user: User): boolean => {
  return hasAnyRole(user, ['Provider Admin', 'Supplier Representative', 'Specialist']);
};

export const canManageSpecialists = (user: User): boolean => {
  return hasAnyRole(user, ['Provider Admin', 'Supplier Representative']);
};

export const isSpecialistOnly = (user: User): boolean => {
  return user.role === 'Specialist';
};

export const canEditUserProfile = (user: User): boolean => {
  return user.role === 'Provider Admin';
};

export const canChangeUserRole = (user: User): boolean => {
  return user.role === 'Provider Admin';
};