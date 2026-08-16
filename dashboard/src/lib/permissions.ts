import { AdminRole } from './types';
export type Permission = 'moderate' | 'manageRoles' | 'settings' | 'read';
export const can = (role: AdminRole | undefined, action: Permission) => {
  if (!role) return false;
  if (action === 'read') return true;
  if (action === 'manageRoles') return role === 'SUPER_ADMIN';
  if (action === 'settings') return role === 'SUPER_ADMIN' || role === 'ADMIN';
  return role !== 'SUPPORT';
};
