import { RoleCode, PermissionKey, Role } from '@/types';

export const INITIAL_PERMISSIONS_LIST: { code: PermissionKey; module: string; label: string; description: string }[] = [
  // 1. Fleet Master
  { code: 'vehicle:view', module: 'Fleet Master', label: 'View Vehicles', description: 'View fleet registry, live status, hubs, and telemetry' },
  { code: 'vehicle:create', module: 'Fleet Master', label: 'Register Vehicle', description: 'Add new electric scooters to the enterprise fleet' },
  { code: 'vehicle:edit', module: 'Fleet Master', label: 'Edit Vehicle Details', description: 'Modify model, VIN, key number, and hub assignment' },
  { code: 'vehicle:request_state', module: 'Fleet Master', label: 'Request State Change', description: 'Stage pending operational vehicle status transitions' },
  { code: 'vehicle:approve_state', module: 'Fleet Master', label: 'Approve State Change', description: 'Commit staged vehicle availability and maintenance states' },
  { code: 'vehicle:reassign_iot', module: 'Fleet Master', label: 'Reassign IoT Telemetry ID', description: 'Re-bind 14-15 digit IoT device identifier' },
  { code: 'vehicle:update_odometer', module: 'Fleet Master', label: 'Update Odometer (KM)', description: 'Update current vehicle mileage' },
  { code: 'vehicle:delete', module: 'Fleet Master', label: 'Decommission Vehicle', description: 'Deactivate or permanently archive fleet asset' },

  // 2. Rapid Inspections
  { code: 'inspections:view', module: 'Rapid Inspections', label: 'View Inspection Audits', description: 'View vehicle check history and defect reports' },
  { code: 'inspections:create', module: 'Rapid Inspections', label: 'Execute 6-Point Audit', description: 'Conduct and submit 6-point safety checklist with photos' },
  { code: 'inspections:override_status', module: 'Rapid Inspections', label: 'Override Inspection Result', description: 'Override suggested status regardless of defects' },

  // 3. Maintenance & Job Cards
  { code: 'job:view', module: 'Job Cards', label: 'View Job Cards', description: 'View maintenance work orders, assigned mechanics, and parts' },
  { code: 'job:create', module: 'Job Cards', label: 'Create Job Card', description: 'Open maintenance job cards and defect tickets' },
  { code: 'job:edit', module: 'Job Cards', label: 'Edit Job Card', description: 'Modify issue description, stage spare parts, and update notes' },
  { code: 'job:assign_mechanic', module: 'Job Cards', label: 'Assign Field Mechanic', description: 'Delegate job card tickets to technicians' },
  { code: 'job:complete', module: 'Job Cards', label: 'Mark Work Completed', description: 'Mark work order as completed awaiting review' },
  { code: 'job:approve', module: 'Job Cards', label: 'Approve & Close Ticket', description: 'Manager sign-off on job card and spare parts consumption' },
  { code: 'job:reject', module: 'Job Cards', label: 'Reject Job Ticket', description: 'Reject job card or send back for mechanical rework' },
  { code: 'job:delete', module: 'Job Cards', label: 'Delete Job Card', description: 'Void or remove accidental maintenance work orders' },

  // 4. Central Spares & Warehouse (Store 1)
  { code: 'inventory:view', module: 'Spare Parts', label: 'View Spare Inventory', description: 'View central Store 1 and hub stock balances' },
  { code: 'inventory:request', module: 'Spare Parts', label: 'Request Spares from Store 1', description: 'Request spare parts from central warehouse' },
  { code: 'inventory:approve', module: 'Spare Parts', label: 'Approve & Dispatch Spares', description: 'Authorize and dispatch stock from Store 1 warehouse' },
  { code: 'inventory:adjust_stock', module: 'Spare Parts', label: 'Manual Stock Audit Adjustment', description: 'Perform physical stock balance reconciliations' },
  { code: 'part:create', module: 'Spare Parts', label: 'Create SKU Item', description: 'Add new spare part catalog item' },
  { code: 'part:edit', module: 'Spare Parts', label: 'Edit Spare Parts', description: 'Update part catalog, unit cost, SKU, and threshold' },
  { code: 'part:delete', module: 'Spare Parts', label: 'Delete Catalog Item', description: 'Deactivate or delete spare part catalog SKU' },

  // 5. Approvals Desk
  { code: 'approvals:view', module: 'Approvals Desk', label: 'Access Approvals Desk', description: 'Access centralized multi-stream approvals hub' },
  { code: 'approvals:job_cards', module: 'Approvals Desk', label: 'Approve Spares & Job Cards', description: 'Authorize parts allocation and ticket closure' },
  { code: 'approvals:vehicle_status', module: 'Approvals Desk', label: 'Approve Vehicle Status', description: 'Approve staged vehicle availability transitions' },
  { code: 'approvals:refunds', module: 'Approvals Desk', label: 'Approve Dispute Payouts', description: 'Authorize wallet and bank refund transactions' },

  // 6. Customer Disputes & Refunds
  { code: 'refund:view', module: 'Customer Disputes', label: 'View Dispute Claims', description: 'View customer ride refund claims and ledger' },
  { code: 'refund:create', module: 'Customer Disputes', label: 'Log Customer Claim', description: 'Submit ride refund disputes with evidence' },
  { code: 'refund:edit', module: 'Customer Disputes', label: 'Edit Claim Details', description: 'Modify claim amount, payout method, and dispute reason' },
  { code: 'refund:approve', module: 'Customer Disputes', label: 'Verify & Settle Claim', description: 'Verify and settle customer claims via ERP' },
  { code: 'refund:reject', module: 'Customer Disputes', label: 'Reject Dispute Claim', description: 'Reject dispute claims with reason' },

  // 7. Strategic Objectives & Tasks
  { code: 'task:view', module: 'Objectives & Tasks', label: 'View Tasks & Roadmaps', description: 'View objective roadmaps, milestones, and task boards' },
  { code: 'task:manage', module: 'Objectives & Tasks', label: 'Manage Objectives & Milestones', description: 'Create and edit strategic goals and milestone stages' },
  { code: 'task:create_task', module: 'Objectives & Tasks', label: 'Create Work Tasks', description: 'Add operational action items to roadmap' },
  { code: 'task:edit', module: 'Objectives & Tasks', label: 'Edit Task Specifications', description: 'Modify assignees, dates, priority, and attachments' },
  { code: 'task:execute', module: 'Objectives & Tasks', label: 'Execute Assigned Tasks', description: 'Update task progress, status, and remarks' },
  { code: 'task:delete', module: 'Objectives & Tasks', label: 'Delete Tasks', description: 'Remove task items or abandoned roadmap objectives' },

  // 8. Daily Staff Shift Logs
  { code: 'shift_logs:view', module: 'Shift Logs', label: 'View Daily Shift Logs', description: 'View staff handover reports, metrics, and receipts' },
  { code: 'shift_logs:create', module: 'Shift Logs', label: 'Submit Personal Shift Log', description: 'Log shift accomplishments, roadblocks, and media' },
  { code: 'shift_logs:edit_all', module: 'Shift Logs', label: 'Edit All Staff Logs', description: 'Manager moderation over any staff shift log' },

  // 9. Team Communications & Channels
  { code: 'channels:view', module: 'Team Channels', label: 'Access Permitted Channels', description: 'View group chat channels matching permissions' },
  { code: 'channels:create', module: 'Team Channels', label: 'Create Chat Channels', description: 'Create public or private restricted channels' },
  { code: 'channels:edit_access', module: 'Team Channels', label: 'Manage Channel Access', description: 'Add/remove member and role permissions on existing channels' },
  { code: 'channels:delete', module: 'Team Channels', label: 'Delete Chat Channels', description: 'Delete non-system team communication channels' },
  { code: 'channels:send_message', module: 'Team Channels', label: 'Post Channel Messages', description: 'Send chat messages and upload media attachments' },

  // 10. SOPs & Standard Procedures
  { code: 'sops:view', module: 'SOPs', label: 'View Published Manuals', description: 'Read operational procedures and acknowledge' },
  { code: 'sops:create', module: 'SOPs', label: 'Author SOP Manuals', description: 'Draft new standard operational procedures' },
  { code: 'sops:edit', module: 'SOPs', label: 'Revise & Version SOPs', description: 'Edit procedures and produce new version revisions' },
  { code: 'sops:publish', module: 'SOPs', label: 'Publish SOPs', description: 'Promote draft SOPs to live published status' },
  { code: 'sops:manage', module: 'SOPs', label: 'Full SOP Management', description: 'Full administrative control over operational documentation' },
  { code: 'sops:delete', module: 'SOPs', label: 'Delete SOP Manuals', description: 'Archive or remove obsolete SOP documents' },

  // 11. Scratchpad & Team Notes
  { code: 'notes:view', module: 'Team Notes', label: 'View Team Notes', description: 'View pinned and active operational scratch notes' },
  { code: 'notes:create', module: 'Team Notes', label: 'Create Team Notes', description: 'Post quick notes, announcements, and reminders' },
  { code: 'notes:edit', module: 'Team Notes', label: 'Edit Team Notes', description: 'Update note contents, tags, and category' },
  { code: 'notes:pin', module: 'Team Notes', label: 'Pin / Unpin Notes', description: 'Pin critical notes to top of scratchpad' },
  { code: 'notes:manage', module: 'Team Notes', label: 'Full Notes Management', description: 'Archive, restore, and bulk dispose scratchpad notes' },
  { code: 'notes:delete', module: 'Team Notes', label: 'Delete Notes', description: 'Permanently remove team notes' },

  // 12. Hubs & Charging Infrastructure
  { code: 'hubs:view', module: 'Hubs Directory', label: 'View Hub Directory', description: 'View hub addresses, contacts, and charging points' },
  { code: 'hubs:manage', module: 'Hubs Directory', label: 'Manage Hub Directory', description: 'Create hubs and edit charging point telemetry' },
  { code: 'hub:edit', module: 'Hubs Directory', label: 'Edit Hub Information', description: 'Edit contacts, security guards, and active plugs' },

  // 13. Governance & System Security
  { code: 'roles:manage', module: 'Governance', label: 'Manage Roles & Permissions', description: 'Configure granular permission matrix and custom roles' },
  { code: 'role:switch', module: 'Governance', label: 'Switch Active Role Preview', description: 'Super Admin only: test UI as other roles' },
  { code: 'audit:view', module: 'Governance', label: 'View Forensic Audit Trail', description: 'Inspect complete system mutation ledger and blocked users' },
  { code: 'data:view_all', module: 'Governance', label: 'View All Organization Data', description: 'Bypass role scoping to view all hubs and records' },
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
      'vehicle:create',
      'vehicle:edit',
      'vehicle:request_state',
      'vehicle:approve_state',
      'vehicle:reassign_iot',
      'vehicle:update_odometer',
      'inspections:view',
      'inspections:create',
      'inspections:override_status',
      'job:view',
      'job:create',
      'job:edit',
      'job:assign_mechanic',
      'job:complete',
      'job:approve',
      'job:reject',
      'inventory:view',
      'inventory:request',
      'inventory:approve',
      'inventory:adjust_stock',
      'part:create',
      'part:edit',
      'approvals:view',
      'approvals:job_cards',
      'approvals:vehicle_status',
      'approvals:refunds',
      'refund:view',
      'refund:create',
      'refund:edit',
      'refund:approve',
      'refund:reject',
      'task:view',
      'task:manage',
      'task:create_task',
      'task:edit',
      'task:execute',
      'shift_logs:view',
      'shift_logs:create',
      'shift_logs:edit_all',
      'channels:view',
      'channels:create',
      'channels:edit_access',
      'channels:send_message',
      'sops:view',
      'sops:create',
      'sops:edit',
      'sops:publish',
      'sops:manage',
      'notes:view',
      'notes:create',
      'notes:edit',
      'notes:pin',
      'notes:manage',
      'hubs:view',
      'hubs:manage',
      'hub:edit',
      'audit:view',
      'data:view_all',
    ],
  },
  rsa: {
    label: 'Roadside Assistance (RSA)',
    permissions: [
      'vehicle:view',
      'vehicle:request_state',
      'inspections:view',
      'inspections:create',
      'job:view',
      'job:create',
      'job:complete',
      'inventory:view',
      'inventory:request',
      'task:view',
      'task:execute',
      'shift_logs:view',
      'shift_logs:create',
      'channels:view',
      'channels:send_message',
      'sops:view',
      'notes:view',
      'notes:create',
      'notes:edit',
      'hubs:view',
    ],
  },
  mechanic: {
    label: 'Field Mechanic',
    permissions: [
      'vehicle:view',
      'vehicle:request_state',
      'inspections:view',
      'inspections:create',
      'job:view',
      'job:create',
      'job:complete',
      'inventory:view',
      'inventory:request',
      'task:view',
      'task:execute',
      'shift_logs:view',
      'shift_logs:create',
      'channels:view',
      'channels:send_message',
      'sops:view',
      'notes:view',
      'notes:create',
      'notes:edit',
      'hubs:view',
    ],
  },
};

/**
 * Compute the additive union of permissions across all active roles for the current user
 */
export function computeEffectivePermissions(
  activeRoles: RoleCode[] = [],
  customRoles: Role[] = []
): Set<PermissionKey> {
  const permissions = new Set<PermissionKey>();

  for (const roleCode of (activeRoles || [])) {
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
