import { usePractice } from './usePractice';
import { useAuth } from './useAuth';
import type { MembershipRole } from '../types/models';

export interface UseRoleReturn {
  role: MembershipRole | null;
  isPlatformAdmin: boolean;
  isOwner: boolean;
  isManager: boolean;
  isClinician: boolean;
  isReceptionist: boolean;
  isAccountant: boolean;
  isPatient: boolean;
  isStaff: boolean;
  hasRole: (allowedRoles: MembershipRole[]) => boolean;
}

const STAFF_ROLES: MembershipRole[] = [
  'practice_owner',
  'practice_manager',
  'physiotherapist',
  'receptionist',
  'accountant',
];

/**
 * Reusable authorization helper for UI element visibility.
 * WARNING: Frontend role checks are for UX and navigation convenience only.
 * They are NOT security boundaries. Database Row Level Security (RLS) is authoritative.
 */
export function useRole(): UseRoleReturn {
  const { currentRole } = usePractice();
  const { profile } = useAuth();

  const isPlatformAdmin = Boolean(profile?.is_platform_admin);
  const isOwner = currentRole === 'practice_owner';
  const isManager = currentRole === 'practice_manager';
  const isClinician = currentRole === 'physiotherapist';
  const isReceptionist = currentRole === 'receptionist';
  const isAccountant = currentRole === 'accountant';
  const isPatient = currentRole === 'patient';
  const isStaff = currentRole !== null && STAFF_ROLES.includes(currentRole);

  const hasRole = (allowedRoles: MembershipRole[]): boolean => {
    if (!currentRole) return false;
    return allowedRoles.includes(currentRole);
  };

  return {
    role: currentRole,
    isPlatformAdmin,
    isOwner,
    isManager,
    isClinician,
    isReceptionist,
    isAccountant,
    isPatient,
    isStaff,
    hasRole,
  };
}
