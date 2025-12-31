import type { User, UserRole } from '../types';

export const hasRole = (user: User, role: UserRole): boolean => {
  return user.roles.includes(role);
};

export const hasAnyRole = (user: User, roles: UserRole[]): boolean => {
  return roles.some(role => user.roles.includes(role));
};

export const hasOnlyRole = (user: User, role: UserRole): boolean => {
  return user.roles.length === 1 && user.roles[0] === role;
};

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
  return hasOnlyRole(user, 'Specialist');
};