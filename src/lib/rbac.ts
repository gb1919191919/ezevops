import { RoleCode, PermissionKey, Role } from '@/types';

export const INITIAL_PERMISSIONS_LIST: { code: PermissionKey; module: string; label: string; description: string }[] = [
  { code: 'vehicle:view', module: 'vehicles', label: 'View Vehicles', description: 'View vehicle registry and telemetry' },
  { code: 'vehicle:request_state', module: 'vehicles', label: 'Request State Change', description: 'Stage pending status changes' },
  { code: 'vehicle:approve_state', module: 'vehicles', label: 'Approve State Change', description: 'Commit staged vehicle state transitions' },
  { code: 'vehicle:reassign_iot', module: 'vehicles', label: 'Reassign IoT Unit', description: 'Reassign 14-15 digit IoT ID' },
  { code: 'vehicle:edit', module: 'vehicles', label: 'Edit Vehicle Details', description: 'Modify model, VIN, key number, odometer, hub assignment' },
  { code: 'job:create', module: 'jobs', label: 'Create Job Card', description: 'Open maintenance job cards' },
  { code: 'job:complete', module: 'jobs', label: 'Complete Job Card', description: 'Mark work order as completed' },
  { code: 'job:approve', module: 'jobs', label: 'Approve Job Card', description: 'Manager sign-off on job card' },
  { code: 'job:edit', module: 'jobs', label: 'Edit Job Card', description: 'Edit work orders and solution notes' },
  { code: 'inventory:request', module: 'inventory', label: 'Request Spares from Store 1', description: 'Request spare parts from central warehouse' },
  { code: 'inventory:approve', module: 'inventory', label: 'Approve & Issue Spares', description: 'Dispatch stock from Store 1' },
  { code: 'part:edit', module: 'inventory', label: 'Edit Spare Parts', description: 'Update part catalog, unit cost, SKU, and threshold' },
  { code: 'refund:create', module: 'refunds', label: 'Log Customer Claim', description: 'Submit ride refund disputes' },
  { code: 'refund:approve', module: 'refunds', label: 'Settle Refunds (Frappe)', description: 'Verify and settle customer claims' },
  { code: 'task:manage', module: 'tasks', label: 'Create Objectives & Tasks', description: 'Create and assign operational tasks' },
  { code: 'task:execute', module: 'tasks', label: 'Execute Assigned Tasks', description: 'Update task progress and log notes' },
  { code: 'task:edit', module: 'tasks', label: 'Edit Task Specifications', description: 'Modify assignees, dates, and priorities' },
  { code: 'roles:manage', module: 'governance', label: 'Manage Roles & Users', description: 'Create custom roles and staff accounts' },
  { code: 'role:switch', module: 'governance', label: 'Switch Active Role Preview', description: 'Super Admin only: test dashboard as other roles' },
  { code: 'hubs:manage', module: 'hubs', label: 'Manage Hub Directory', description: 'Add/edit hubs and equipment conditions' },
  { code: 'hub:edit', module: 'hubs', label: 'Edit Hub Information', description: 'Edit contacts, guards, chargers, and addresses' },
  { code: 'sops:manage', module: 'governance', label: 'Manage SOPs', description: 'Author and version-control SOP manuals' },
  { code: 'notes:manage', module: 'collaboration', label: 'Manage Team Notes', description: 'Post, pin, and dispose operational scratch notes' },
  { code: 'data:view_all', module: 'governance', label: 'View All Organization Data', description: 'Bypass role scoping to view all hubs and tasks' },
];

export const ROLE_DEFINITIONS: Record<string, { label: string; permissions: PermissionKey[] }> = {
  owner: {
    label: 'Owner (Super Admin)',
    permissions: INITIAL_PERMISSIONS_LIST.map((p) => p.code),
  },
  manager: {
    label: 'Hub Operations Manager',
    permissions: [
      'vehicle:view',
      'vehicle:request_state',
      'vehicle:approve_state',
      'vehicle:reassign_iot',
      'vehicle:edit',
      'job:create',
      'job:complete',
      'job:approve',
      'job:edit',
      'inventory:request',
      'inventory:approve',
      'part:edit',
      'refund:create',
      'refund:approve',
      'task:manage',
      'task:execute',
      'task:edit',
      'hubs:manage',
      'hub:edit',
      'sops:manage',
      'notes:manage',
      'data:view_all',
    ],
  },
  rsa: {
    label: 'Roadside Assistance (RSA)',
    permissions: [
      'vehicle:view',
      'vehicle:request_state',
      'job:create',
      'job:complete',
      'inventory:request',
      'task:execute',
      'notes:manage',
    ],
  },
  mechanic: {
    label: 'Field Mechanic',
    permissions: [
      'vehicle:view',
      'vehicle:request_state',
      'job:create',
      'job:complete',
      'inventory:request',
      'task:execute',
      'notes:manage',
    ],
  },
};

/**
 * Compute the additive union of permissions across all active roles for the current user
 */
export function computeEffectivePermissions(
  activeRoles: RoleCode[],
  customRoles: Role[] = []
): Set<PermissionKey> {
  const permissions = new Set<PermissionKey>();

  for (const roleCode of activeRoles) {
    // Check built-in definitions
    const def = ROLE_DEFINITIONS[roleCode];
    if (def) {
      def.permissions.forEach((perm) => permissions.add(perm));
    }
    // Check dynamic custom roles
    const customRole = customRoles.find((r) => r.code === roleCode || r.id === roleCode);
    if (customRole && customRole.permissions) {
      customRole.permissions.forEach((perm) => permissions.add(perm));
    }
  }

  return permissions;
}

/**
 * Check if the effective permissions satisfy a required permission key
 */
export function hasPermission(
  activeRoles: RoleCode[],
  requiredPermission: PermissionKey,
  customRoles: Role[] = []
): boolean {
  const effective = computeEffectivePermissions(activeRoles, customRoles);
  return effective.has(requiredPermission);
}
