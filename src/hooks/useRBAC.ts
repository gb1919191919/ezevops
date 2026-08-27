'use client';

import { useAppStore } from '@/lib/store/appStore';
import { PermissionKey, RoleCode } from '@/types';
import { computeEffectivePermissions } from '@/lib/rbac';
import { useMemo } from 'react';

export function useRBAC() {
  const activeRoles = useAppStore((state) => state.activeRoles);
  const customRoles = useAppStore((state) => state.customRoles);
  const toggleRole = useAppStore((state) => state.toggleRole);
  const setActiveRoles = useAppStore((state) => state.setActiveRoles);
  const currentUser = useAppStore((state) => state.currentUser);

  const effectivePermissions = useMemo(() => {
    return computeEffectivePermissions(activeRoles, customRoles);
  }, [activeRoles, customRoles]);

  const can = (permission: PermissionKey): boolean => {
    return effectivePermissions.has(permission);
  };

  const canAny = (perms: PermissionKey[]): boolean => {
    return perms.some((p) => effectivePermissions.has(p));
  };

  const canAll = (perms: PermissionKey[]): boolean => {
    return perms.every((p) => effectivePermissions.has(p));
  };

  const isOwner = activeRoles.includes('owner');
  const isManager = activeRoles.includes('manager');
  const isRSA = activeRoles.includes('rsa');
  const isMechanic = activeRoles.includes('mechanic');

  return {
    activeRoles,
    currentUser,
    effectivePermissions,
    can,
    canAny,
    canAll,
    isOwner,
    isManager,
    isRSA,
    isMechanic,
    toggleRole,
    setActiveRoles,
  };
}
