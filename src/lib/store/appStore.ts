'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Hub,
  Vehicle,
  PartInventory,
  HubPartStock,
  JobCard,
  Refund,
  Objective,
  TaskItem,
  AuditLog,
  Profile,
  Role,
  RoleCode,
  PermissionKey,
  ChargerStatus,
  VehicleStatus,
  TaskStatus,
  SOP,
  TeamNote,
  DailyShiftLog,
  ChatChannel,
  ChannelMessage,
  BlockedUser,
  VehicleInspection,
  PartUsageLog,
  Milestone,
  TaskAttachment,
} from '@/types';
import {
  INITIAL_HUBS,
  INITIAL_VEHICLES,
  INITIAL_PARTS,
  INITIAL_HUB_STOCK,
  INITIAL_JOB_CARDS,
  INITIAL_REFUNDS,
  INITIAL_OBJECTIVES,
  INITIAL_MILESTONES,
  INITIAL_TASKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ROLES,
  INITIAL_PROFILES,
  INITIAL_DAILY_SHIFT_LOGS,
  INITIAL_CHAT_CHANNELS,
  INITIAL_CHANNEL_MESSAGES,
  INITIAL_SOPS,
  INITIAL_NOTES,
  INITIAL_BLOCKED_USERS,
} from './initialData';
import { supabaseSync } from '../supabase/syncService';

interface AppStoreState {
  // Navigation & UI State
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  setSidebarCollapse: (collapsed: boolean) => void;
  isMobileDrawerOpen: boolean;
  toggleMobileDrawer: () => void;
  setMobileDrawerOpen: (open: boolean) => void;

  // Active Session & Multi-Role RBAC State
  currentUser: Profile;
  activeRoles: RoleCode[];
  activeHubId: string | 'ALL';
  selectedHubIds: string[];
  clearedBadges: Record<string, boolean>;
  customRoles: Role[];
  staffProfiles: Profile[];
  toggleRole: (role: RoleCode) => void;
  setActiveRoles: (roles: RoleCode[]) => void;
  setCurrentUser: (user: Profile) => void;
  setActiveHubId: (hubId: string | 'ALL') => void;
  setSelectedHubIds: (hubIds: string[]) => void;
  toggleHubSelection: (hubId: string) => void;
  selectAllHubs: () => void;
  clearAllHubs: () => void;
  clearBadge: (key: string) => void;

  // Role & User Administration
  addCustomRole: (role: Omit<Role, 'id'>) => void;
  updateRolePermissions: (roleId: string, permissions: PermissionKey[]) => void;
  addStaffProfile: (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => void;
  updateStaffProfile: (id: string, updates: Partial<Profile>) => void;
  updateStaffRoles: (profileId: string, roleIds: string[]) => void;
  archiveStaffProfile: (id: string) => void;
  restoreStaffProfile: (id: string) => void;

  // Core Entity Data
  hubs: Hub[];
  vehicles: Vehicle[];
  inspections: VehicleInspection[];
  parts: PartInventory[];
  hubStock: HubPartStock[];
  partUsageLogs: PartUsageLog[];
  jobCards: JobCard[];
  refunds: Refund[];
  objectives: Objective[];
  milestones: Milestone[];
  tasks: TaskItem[];
  dailyShiftLogs: DailyShiftLog[];
  chatChannels: ChatChannel[];
  channelMessages: ChannelMessage[];
  sops: SOP[];
  teamNotes: TeamNote[];
  blockedUsers: BlockedUser[];
  auditLogs: AuditLog[];

  // 1. Customer Refunds (Up to 3 Decimal Points support)
  createRefund: (
    refundData: Omit<Refund, 'id' | 'status' | 'created_at' | 'updated_at' | 'requested_by' | 'requester_name' | 'requester_role'>
  ) => void;
  verifyRefund: (refundId: string, remarks?: string) => void;
  settleRefund: (refundId: string, frappeReference?: string) => void;
  rejectRefund: (refundId: string, reason: string) => void;
  archiveRefund: (refundId: string) => void;
  restoreRefund: (refundId: string) => void;

  // 2. Hubs & Charger Operations
  addHub: (hubData: Omit<Hub, 'id' | 'created_at' | 'updated_at'>) => void;
  updateHub: (hubId: string, hubData: Partial<Omit<Hub, 'id' | 'created_at'>>) => void;
  archiveHub: (hubId: string) => void;
  restoreHub: (hubId: string) => void;
  toggleChargerStatus: (
    hubId: string,
    portNumber: number,
    status: ChargerStatus,
    remarks?: string
  ) => void;
  logChargerStatus: (
    hubId: string,
    chargerName: string,
    connectorNumber: string | undefined,
    status: ChargerStatus,
    remarks?: string
  ) => void;

  // 3. Objectives & Hierarchical 3-Tier Tasks Engine
  createObjective: (objectiveData: Omit<Objective, 'id' | 'created_at' | 'is_completed'>) => void;
  archiveObjective: (id: string) => void;
  restoreObjective: (id: string) => void;
  addMilestone: (milestoneData: Omit<Milestone, 'id' | 'created_at'>) => void;
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  archiveMilestone: (id: string) => void;
  restoreMilestone: (id: string) => void;
  deleteMilestone: (id: string) => void; // Soft-delete alias
  createTask: (taskData: Omit<TaskItem, 'id' | 'created_at' | 'updated_at' | 'remarks' | 'changelog'>) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  archiveTask: (taskId: string) => void;
  restoreTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void; // Soft-delete alias
  addTaskRemark: (taskId: string, comment: string) => void;
  addTaskAttachment: (taskId: string, attachment: TaskAttachment) => void;
  updateTaskAssignees: (taskId: string, assigneeIds: string[]) => void;
  updateTaskDates: (taskId: string, startDate?: string, dueDate?: string) => void;

  // 4 & 5. Vehicle Mutations, Odometer, Edit & Rapid Inspection
  updateVehicle: (vehicleId: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'created_at'>>) => void;
  updateVehicleCustomId: (vehicleId: string, customId: string) => void;
  requestVehicleStatus: (vehicleId: string, pendingStatus: VehicleStatus, reason: string, forceImmediate?: boolean) => void;
  approveVehicleStatus: (vehicleId: string) => void;
  rejectVehicleStatus: (vehicleId: string) => void;
  reassignVehicleIotId: (vehicleId: string, newIotId: string, reason: string) => void;
  updateVehicleOdometer: (vehicleId: string, odometerKm: number) => void;
  archiveVehicle: (vehicleId: string) => void;
  restoreVehicle: (vehicleId: string) => void;
  logInspection: (
    inspectionData: Omit<VehicleInspection, 'id' | 'inspected_at' | 'inspector_id' | 'inspector_name'>
  ) => void;

  // Daily Shift Logs (8.1)
  addDailyShiftLog: (log: Omit<DailyShiftLog, 'id' | 'created_at' | 'updated_at'>) => void;
  updateDailyShiftLog: (id: string, updates: Partial<DailyShiftLog>) => void;
  archiveDailyShiftLog: (id: string) => void;
  restoreDailyShiftLog: (id: string) => void;

  // Role-Based Group Communications (8.2)
  createChatChannel: (channel: Omit<ChatChannel, 'id' | 'created_at'>) => void;
  updateChatChannel: (id: string, updates: Partial<ChatChannel>) => void;
  archiveChatChannel: (id: string) => void;
  restoreChatChannel: (id: string) => void;
  deleteChatChannel: (id: string) => void; // Soft-delete alias
  sendChannelMessage: (msg: Omit<ChannelMessage, 'id' | 'created_at'>) => void;

  // 6. Spare Parts Catalog (Single "Store 1" Warehouse, Dispatch & Usage)
  addPart: (
    partData: Omit<PartInventory, 'id' | 'created_at'>
  ) => void;
  updatePart: (partId: string, partData: Partial<Omit<PartInventory, 'id' | 'created_at'>>) => void;
  archivePart: (partId: string) => void;
  restorePart: (partId: string) => void;
  issuePartFromStore1: (
    partId: string,
    quantity: number,
    recipientName: string,
    reason: string,
    hubId?: string,
    vehicleId?: string
  ) => void;
  adjustPhysicalStock: (hubId: string, partId: string, newPhysicalStock: number, reason?: string) => void;

  // 7. Job Cards Maintenance Engine (with Owner/Manager Auto-Approve Bypass)
  createJobCard: (
    cardData: Omit<JobCard, 'id' | 'ticket_number' | 'status' | 'created_at'>,
    partsList?: { part_id: string; quantity: number }[],
    forceImmediateApproval?: boolean
  ) => void;
  updateJobCard: (jobCardId: string, updates: Partial<JobCard>) => void;
  approveJobCard: (jobCardId: string, approvalNotes?: string) => void;
  rejectJobCard: (jobCardId: string, rejectionNotes: string) => void;
  archiveJobCard: (jobCardId: string) => void;
  restoreJobCard: (jobCardId: string) => void;

  // 8. Standard Operating Procedures (SOPs Engine)
  createSOP: (sopData: Omit<SOP, 'id' | 'version' | 'view_count' | 'acknowledged_by' | 'revisions' | 'created_at' | 'updated_at'>) => void;
  updateSOP: (sopId: string, updates: Partial<Omit<SOP, 'id' | 'revisions' | 'created_at'>>, changeSummary: string) => void;
  publishSOP: (sopId: string) => void;
  acknowledgeSOP: (sopId: string, profileId?: string) => void;
  archiveSOP: (sopId: string) => void;
  restoreSOP: (sopId: string) => void;
  deleteSOP: (sopId: string) => void; // Soft-delete alias

  // 9. Team Notes & Scratchpad with Disposal Lifecycle
  createNote: (noteData: Omit<TeamNote, 'id' | 'status' | 'author_id' | 'author_name' | 'author_role' | 'created_at' | 'updated_at'>) => void;
  updateNote: (noteId: string, noteData: Partial<Omit<TeamNote, 'id' | 'author_id' | 'author_name' | 'created_at'>>) => void;
  archiveNote: (noteId: string) => void;
  resolveNote: (noteId: string) => void;
  restoreNote: (noteId: string) => void;
  deleteNote: (noteId: string) => void; // Soft-delete alias
  bulkDisposeOldNotes: () => void;
  togglePinNote: (noteId: string) => void;

  // 10. Blocked Users
  addBlockedUser: (user: Omit<BlockedUser, 'id'>) => void;
  updateBlockedUser: (id: string, updates: Partial<BlockedUser>) => void;
  archiveBlockedUser: (id: string) => void;
  restoreBlockedUser: (id: string) => void;

  // State Reset
  resetToDefaultData: () => void;
}

// Helper to generate forensic audit log entries
function createAuditLog(
  currentUser: Profile | null,
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'ARCHIVE' | 'RESTORE',
  oldData?: any,
  newData?: any
): AuditLog {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    table_name: tableName,
    record_id: String(recordId),
    action,
    performed_by: currentUser?.id || 'system',
    performer_name: currentUser?.full_name || 'Staff Member',
    old_data: oldData ?? null,
    new_data: newData ?? null,
    timestamp: new Date().toISOString(),
  };
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      // Sidebar & Mobile Drawer State
      isSidebarCollapsed: false,
      toggleSidebarCollapse: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapse: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      isMobileDrawerOpen: false,
      toggleMobileDrawer: () =>
        set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),
      setMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),

      // Active User & RBAC
      currentUser: null as any,
      activeRoles: [],
      activeHubId: 'ALL',
      selectedHubIds: ['ALL'],
      clearedBadges: {},
      customRoles: INITIAL_ROLES,
      staffProfiles: INITIAL_PROFILES,

      toggleRole: (role) => {
        const { currentUser, activeRoles } = get();
        // SECURITY: Only check database-assigned roles. No hardcoded email bypass.
        const isUserOwner = Boolean(currentUser?.roles?.some((r) => r.code === 'owner'));
        if (!isUserOwner) {
          console.warn('Role preview switching is restricted to Super Admin (Owner).');
          return;
        }

        const current = activeRoles;
        const exists = current.includes(role);
        let updated: RoleCode[];
        if (exists) {
          updated = current.filter((r) => r !== role);
          if (updated.length === 0) updated = ['owner'];
        } else {
          updated = [...current, role];
        }
        set({ activeRoles: updated });
      },

      setActiveRoles: (roles) => set({ activeRoles: roles }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setActiveHubId: (hubId) => set({ activeHubId: hubId, selectedHubIds: [hubId] }),
      setSelectedHubIds: (hubIds) =>
        set({
          selectedHubIds: hubIds,
          activeHubId: hubIds.length === 1 ? hubIds[0] : hubIds.includes('ALL') ? 'ALL' : hubIds[0] || 'ALL',
        }),
      toggleHubSelection: (hubId) =>
        set((state) => {
          let updated: string[];
          if (hubId === 'ALL') {
            updated = ['ALL'];
          } else {
            const withoutAll = state.selectedHubIds.filter((id) => id !== 'ALL');
            if (withoutAll.includes(hubId)) {
              updated = withoutAll.filter((id) => id !== hubId);
              if (updated.length === 0) updated = ['ALL'];
            } else {
              updated = [...withoutAll, hubId];
            }
          }
          return {
            selectedHubIds: updated,
            activeHubId: updated.length === 1 ? updated[0] : updated.includes('ALL') ? 'ALL' : updated[0] || 'ALL',
          };
        }),
      selectAllHubs: () => set({ selectedHubIds: ['ALL'], activeHubId: 'ALL' }),
      clearAllHubs: () => set({ selectedHubIds: [], activeHubId: 'ALL' }),
      clearBadge: (key) => set((state) => ({ clearedBadges: { ...state.clearedBadges, [key]: true } })),

      // Role & Staff Admin
      addCustomRole: (roleData) => {
        const { customRoles, auditLogs, currentUser } = get();
        const newRole: Role = {
          ...roleData,
          id: `role-custom-${Date.now()}`,
          is_archived: false,
        };
        const newAudit = createAuditLog(currentUser, 'roles', newRole.id, 'INSERT', null, newRole);
        set({
          customRoles: [...customRoles, newRole],
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('roles', 'insert', newRole, { action: 'INSERT', new_data: newRole });
      },

      updateRolePermissions: (roleId, permissions) => {
        const { customRoles, auditLogs, currentUser } = get();
        const existing = customRoles.find((r) => r.id === roleId);
        const updatedRoles = customRoles.map((r) => (r.id === roleId ? { ...r, permissions } : r));
        const newAudit = createAuditLog(
          currentUser,
          'roles',
          roleId,
          'UPDATE',
          { permissions: existing?.permissions },
          { permissions }
        );
        set({ customRoles: updatedRoles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('roles', 'update', { id: roleId, permissions }, { action: 'UPDATE', old_data: existing, new_data: { permissions } });
      },

      addStaffProfile: (profileData) => {
        const { staffProfiles, auditLogs, currentUser } = get();
        const newProfile: Profile = {
          ...profileData,
          id: `usr-${Date.now()}`,
          is_active: true,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const newAudit = createAuditLog(currentUser, 'profiles', newProfile.id, 'INSERT', null, newProfile);
        set({
          staffProfiles: [...staffProfiles, newProfile],
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('profiles', 'insert', newProfile, { action: 'INSERT', new_data: newProfile });
      },

      updateStaffProfile: (id, updates) => {
        const { staffProfiles, auditLogs, currentUser } = get();
        const existing = staffProfiles.find((s) => s.id === id);
        const updatedStaff = staffProfiles.map((s) =>
          s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
        );
        const newAudit = createAuditLog(currentUser, 'profiles', id, 'UPDATE', existing, updates);
        set({ staffProfiles: updatedStaff, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('profiles', 'update', { id, ...updates, updated_at: new Date().toISOString() }, { action: 'UPDATE', old_data: existing, new_data: updates });
      },

      updateStaffRoles: (profileId, roleIds) => {
        const { staffProfiles, customRoles, auditLogs, currentUser } = get();
        const existing = staffProfiles.find((s) => s.id === profileId);
        const assignedRoles = customRoles.filter((r) => roleIds.includes(r.id) || roleIds.includes(r.code));
        const updatedStaff = staffProfiles.map((s) =>
          s.id === profileId ? { ...s, roles: assignedRoles, updated_at: new Date().toISOString() } : s
        );
        const newAudit = createAuditLog(
          currentUser,
          'profiles',
          profileId,
          'UPDATE',
          { roles: existing?.roles },
          { roles: assignedRoles }
        );
        set({ staffProfiles: updatedStaff, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('profiles', 'update', { id: profileId, updated_at: new Date().toISOString() }, { action: 'UPDATE', old_data: existing, new_data: { roles: assignedRoles } });
        for (const r of assignedRoles) {
          supabaseSync.pushMutation('profile_roles', 'insert', { profile_id: profileId, role_id: r.id });
        }
      },

      archiveStaffProfile: (id) => {
        const { staffProfiles, auditLogs, currentUser } = get();
        const existing = staffProfiles.find((s) => s.id === id);
        const updated = staffProfiles.map((s) =>
          s.id === id ? { ...s, is_active: false, is_archived: true, updated_at: new Date().toISOString() } : s
        );
        const newAudit = createAuditLog(currentUser, 'profiles', id, 'ARCHIVE', existing, { is_active: false, is_archived: true });
        set({ staffProfiles: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('profiles', 'archive', { id, is_active: false, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreStaffProfile: (id) => {
        const { staffProfiles, auditLogs, currentUser } = get();
        const existing = staffProfiles.find((s) => s.id === id);
        const updated = staffProfiles.map((s) =>
          s.id === id ? { ...s, is_active: true, is_archived: false, updated_at: new Date().toISOString() } : s
        );
        const newAudit = createAuditLog(currentUser, 'profiles', id, 'RESTORE', existing, { is_active: true, is_archived: false });
        set({ staffProfiles: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('profiles', 'restore', { id, is_active: true, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      // Entities Data
      hubs: INITIAL_HUBS,
      vehicles: INITIAL_VEHICLES,
      inspections: [],
      parts: INITIAL_PARTS,
      hubStock: INITIAL_HUB_STOCK,
      partUsageLogs: [],
      jobCards: INITIAL_JOB_CARDS,
      refunds: INITIAL_REFUNDS,
      objectives: INITIAL_OBJECTIVES,
      milestones: INITIAL_MILESTONES,
      tasks: INITIAL_TASKS,
      dailyShiftLogs: INITIAL_DAILY_SHIFT_LOGS,
      chatChannels: INITIAL_CHAT_CHANNELS,
      channelMessages: INITIAL_CHANNEL_MESSAGES,
      sops: INITIAL_SOPS,
      teamNotes: INITIAL_NOTES,
      blockedUsers: INITIAL_BLOCKED_USERS,
      auditLogs: INITIAL_AUDIT_LOGS,

      // ====================================================================
      // 1. REFUNDS ENGINE
      // ====================================================================
      createRefund: (refundData) => {
        const { refunds, auditLogs, currentUser } = get();
        const newRefundId = `ref-${Date.now()}`;
        const newRefund: Refund = {
          ...refundData,
          id: newRefundId,
          status: 'SUBMITTED',
          requested_by: currentUser?.id || 'usr-01',
          requester_name: currentUser?.full_name || 'Staff Member',
          requester_role: currentUser?.roles?.[0]?.label || 'Staff',
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'refunds', newRefundId, 'INSERT', null, newRefund);
        set({ refunds: [newRefund, ...refunds], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'insert', newRefund, { action: 'INSERT', new_data: newRefund });
      },

      verifyRefund: (refundId, remarks) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        const updated = refunds.map((r) =>
          r.id === refundId
            ? {
                ...r,
                status: 'VERIFIED' as const,
                approved_by: currentUser?.id || 'usr-01',
                internal_remarks: remarks || r.internal_remarks,
                updated_at: new Date().toISOString(),
              }
            : r
        );

        const newAudit = createAuditLog(currentUser, 'refunds', refundId, 'UPDATE', existing, { status: 'VERIFIED', remarks });
        set({ refunds: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'update', { id: refundId, status: 'VERIFIED', internal_remarks: remarks }, { action: 'UPDATE', old_data: existing });
      },

      settleRefund: (refundId, frappeReference) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        const refCode = frappeReference || existing?.settlement_reference || existing?.frappe_reference || `ERP-DISP-${Date.now()}`;
        const updated = refunds.map((r) =>
          r.id === refundId
            ? {
                ...r,
                status: 'SETTLED' as const,
                settled_at: new Date().toISOString(),
                settled_by_name: currentUser?.full_name || 'Staff Member',
                settlement_reference: refCode,
                frappe_reference: refCode,
                updated_at: new Date().toISOString(),
              }
            : r
        );

        const newAudit = createAuditLog(currentUser, 'refunds', refundId, 'UPDATE', existing, { status: 'SETTLED', settlement_reference: refCode, frappe_reference: refCode });
        set({ refunds: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'update', {
          id: refundId,
          status: 'SETTLED',
          settlement_reference: refCode,
          frappe_reference: refCode,
          settled_at: new Date().toISOString(),
          settled_by_name: currentUser?.full_name || 'Staff Member',
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: existing });
      },

      rejectRefund: (refundId, reason) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        const updated = refunds.map((r) =>
          r.id === refundId
            ? {
                ...r,
                status: 'REJECTED' as const,
                rejection_reason: reason,
                approved_by: currentUser?.id || 'usr-01',
                updated_at: new Date().toISOString(),
              }
            : r
        );

        const newAudit = createAuditLog(currentUser, 'refunds', refundId, 'UPDATE', existing, { status: 'REJECTED', rejection_reason: reason });
        set({ refunds: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'update', { id: refundId, status: 'REJECTED', rejection_reason: reason }, { action: 'UPDATE', old_data: existing });
      },

      archiveRefund: (refundId) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        const updated = refunds.map((r) =>
          r.id === refundId ? { ...r, is_archived: true, updated_at: new Date().toISOString() } : r
        );
        const newAudit = createAuditLog(currentUser, 'refunds', refundId, 'ARCHIVE', existing, { is_archived: true });
        set({ refunds: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'archive', { id: refundId, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreRefund: (refundId) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        const updated = refunds.map((r) =>
          r.id === refundId ? { ...r, is_archived: false, updated_at: new Date().toISOString() } : r
        );
        const newAudit = createAuditLog(currentUser, 'refunds', refundId, 'RESTORE', existing, { is_archived: false });
        set({ refunds: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'restore', { id: refundId, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      // ====================================================================
      // 2. HUBS & CHARGERS
      // ====================================================================
      addHub: (hubData) => {
        const { hubs, auditLogs, currentUser } = get();
        const newHubId = `hub-${Date.now()}`;
        const newHub: Hub = {
          ...hubData,
          id: newHubId,
          is_active: true,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'hubs', newHubId, 'INSERT', null, newHub);
        set({ hubs: [...hubs, newHub], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('hubs', 'insert', newHub, { action: 'INSERT', new_data: newHub });
      },

      updateHub: (hubId, hubData) => {
        const { hubs, auditLogs, currentUser } = get();
        const existing = hubs.find((h) => h.id === hubId);
        const updatedHubs = hubs.map((h) =>
          h.id === hubId
            ? { ...h, ...hubData, updated_at: new Date().toISOString() }
            : h
        );

        const newAudit = createAuditLog(currentUser, 'hubs', hubId, 'UPDATE', existing, hubData);
        set({ hubs: updatedHubs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('hubs', 'update', { id: hubId, ...hubData }, { action: 'UPDATE', old_data: existing });
      },

      archiveHub: (hubId) => {
        const { hubs, auditLogs, currentUser } = get();
        const existing = hubs.find((h) => h.id === hubId);
        const updated = hubs.map((h) =>
          h.id === hubId ? { ...h, is_active: false, is_archived: true, updated_at: new Date().toISOString() } : h
        );
        const newAudit = createAuditLog(currentUser, 'hubs', hubId, 'ARCHIVE', existing, { is_active: false, is_archived: true });
        set({ hubs: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('hubs', 'archive', { id: hubId, is_active: false, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreHub: (hubId) => {
        const { hubs, auditLogs, currentUser } = get();
        const existing = hubs.find((h) => h.id === hubId);
        const updated = hubs.map((h) =>
          h.id === hubId ? { ...h, is_active: true, is_archived: false, updated_at: new Date().toISOString() } : h
        );
        const newAudit = createAuditLog(currentUser, 'hubs', hubId, 'RESTORE', existing, { is_active: true, is_archived: false });
        set({ hubs: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('hubs', 'restore', { id: hubId, is_active: true, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      toggleChargerStatus: (hubId, portNumber, status, remarks) => {
        const { hubs, auditLogs, currentUser } = get();
        const targetHub = hubs.find((h) => h.id === hubId);
        if (!targetHub) return;

        const newLogId = `clog-${Date.now()}-${portNumber}`;
        const newLog = {
          id: newLogId,
          hub_id: hubId,
          charger_name: `Charger Port #${portNumber}`,
          connector_number: String(portNumber),
          status,
          reported_at: new Date().toISOString(),
          reported_by: currentUser?.full_name || 'Staff Member',
          remarks: remarks || undefined,
          is_archived: false,
        };

        const updatedHubs = hubs.map((h) => {
          if (h.id === hubId) {
            const currentLogs = h.charger_logs || [];
            const otherLogs = currentLogs.filter((l) => l.connector_number !== String(portNumber));
            const allLogs = [newLog, ...otherLogs];
            const activeCount = allLogs.filter((l) => l.status === 'ACTIVE').length;
            return {
              ...h,
              charging_points_active: Math.min(h.charging_points_total, activeCount),
              charger_logs: allLogs,
              updated_at: new Date().toISOString(),
            };
          }
          return h;
        });

        const newAudit = createAuditLog(currentUser, 'charger_logs', newLogId, 'INSERT', null, newLog);
        set({ hubs: updatedHubs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('charger_logs', 'insert', newLog, { action: 'INSERT', new_data: newLog });
        const updatedTargetHub = updatedHubs.find((h) => h.id === hubId);
        if (updatedTargetHub) {
          supabaseSync.pushMutation('hubs', 'update', {
            id: hubId,
            charging_points_active: updatedTargetHub.charging_points_active,
            updated_at: new Date().toISOString(),
          });
        }
      },

      logChargerStatus: (hubId, chargerName, connectorNumber, status, remarks) => {
        const { hubs, auditLogs, currentUser } = get();
        const newLogId = `clog-${Date.now()}`;
        const newLog = {
          id: newLogId,
          hub_id: hubId,
          charger_name: chargerName,
          connector_number: connectorNumber,
          status,
          reported_at: new Date().toISOString(),
          reported_by: currentUser?.full_name || 'Staff Member',
          remarks,
          is_archived: false,
        };

        const updatedHubs = hubs.map((h) => {
          if (h.id === hubId) {
            const existingLogs = h.charger_logs || [];
            return {
              ...h,
              charger_logs: [newLog, ...existingLogs],
              updated_at: new Date().toISOString(),
            };
          }
          return h;
        });

        const newAudit = createAuditLog(currentUser, 'charger_logs', newLogId, 'INSERT', null, newLog);
        set({ hubs: updatedHubs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('charger_logs', 'insert', newLog, { action: 'INSERT', new_data: newLog });
      },

      // ====================================================================
      // 3. OBJECTIVES, MILESTONES & TASKS ENGINE (3-TIER)
      // ====================================================================
      createObjective: (objectiveData) => {
        const { objectives, auditLogs, currentUser } = get();
        const newId = `obj-${Date.now()}`;
        const newObj: Objective = {
          ...objectiveData,
          id: newId,
          is_completed: false,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'objectives', newId, 'INSERT', null, newObj);
        set({ objectives: [newObj, ...objectives], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('objectives', 'insert', newObj, { action: 'INSERT', new_data: newObj });
      },

      archiveObjective: (id) => {
        const { objectives, auditLogs, currentUser } = get();
        const existing = objectives.find((o) => o.id === id);
        const updated = objectives.map((o) =>
          o.id === id ? { ...o, is_archived: true, updated_at: new Date().toISOString() } : o
        );
        const newAudit = createAuditLog(currentUser, 'objectives', id, 'ARCHIVE', existing, { is_archived: true });
        set({ objectives: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('objectives', 'archive', { id, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreObjective: (id) => {
        const { objectives, auditLogs, currentUser } = get();
        const existing = objectives.find((o) => o.id === id);
        const updated = objectives.map((o) =>
          o.id === id ? { ...o, is_archived: false, updated_at: new Date().toISOString() } : o
        );
        const newAudit = createAuditLog(currentUser, 'objectives', id, 'RESTORE', existing, { is_archived: false });
        set({ objectives: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('objectives', 'restore', { id, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      addMilestone: (milestoneData) => {
        const { milestones, auditLogs, currentUser } = get();
        const newId = `ms-${Date.now()}`;
        const newMs: Milestone = {
          ...milestoneData,
          id: newId,
          is_completed: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'milestones', newId, 'INSERT', null, newMs);
        set({ milestones: [...milestones, newMs], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('milestones', 'insert', newMs, { action: 'INSERT', new_data: newMs });
      },

      updateMilestone: (id, updates) => {
        const { milestones, auditLogs, currentUser } = get();
        const existing = milestones.find((m) => m.id === id);
        const updated = milestones.map((m) => (m.id === id ? { ...m, ...updates } : m));
        const newAudit = createAuditLog(currentUser, 'milestones', id, 'UPDATE', existing, updates);
        set({ milestones: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('milestones', 'update', { id, ...updates }, { action: 'UPDATE', old_data: existing });
      },

      archiveMilestone: (id) => {
        const { milestones, auditLogs, currentUser } = get();
        const existing = milestones.find((m) => m.id === id);
        const updated = milestones.map((m) =>
          m.id === id ? { ...m, is_archived: true } : m
        );
        const newAudit = createAuditLog(currentUser, 'milestones', id, 'ARCHIVE', existing, { is_archived: true });
        set({ milestones: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('milestones', 'archive', { id, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreMilestone: (id) => {
        const { milestones, auditLogs, currentUser } = get();
        const existing = milestones.find((m) => m.id === id);
        const updated = milestones.map((m) =>
          m.id === id ? { ...m, is_archived: false } : m
        );
        const newAudit = createAuditLog(currentUser, 'milestones', id, 'RESTORE', existing, { is_archived: false });
        set({ milestones: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('milestones', 'restore', { id, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      deleteMilestone: (id) => {
        // Enforce soft-delete archive
        get().archiveMilestone(id);
      },

      createTask: (taskData) => {
        const { tasks, auditLogs, currentUser } = get();
        const newId = `task-${Date.now()}`;
        const newTask: TaskItem = {
          ...taskData,
          id: newId,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          changelog: [
            {
              id: `chg-${Date.now()}`,
              task_id: newId,
              changed_by: currentUser?.id || 'usr-01',
              performer_name: currentUser?.full_name || 'Staff Member',
              field_changed: 'creation',
              old_value: 'None',
              new_value: 'Created',
              changed_at: new Date().toISOString(),
            },
          ],
        };

        const newAudit = createAuditLog(currentUser, 'tasks', newId, 'INSERT', null, newTask);
        set({ tasks: [newTask, ...tasks], auditLogs: [newAudit, ...auditLogs] });
        const { changelog: chgList, remarks: _rem, attachments: _att, ...parentTaskPayload } = newTask as any;
        supabaseSync.pushMutation('tasks', 'insert', parentTaskPayload, { action: 'INSERT', new_data: parentTaskPayload });
        if (chgList && chgList.length > 0) {
          for (const chg of chgList) {
            supabaseSync.pushMutation('task_changelog', 'insert', chg);
          }
        }
      },

      updateTask: (taskId, updates) => {
        const { tasks, auditLogs, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        const updated = tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
        );
        const newAudit = createAuditLog(currentUser, 'tasks', taskId, 'UPDATE', existing, updates);
        set({ tasks: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('tasks', 'update', { id: taskId, ...updates, updated_at: new Date().toISOString() }, { action: 'UPDATE', old_data: existing });
      },

      updateTaskStatus: (taskId, status) => {
        const { tasks, auditLogs, currentUser } = get();
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const oldStatus = task.status;
        const newEntry = {
          id: `chg-${Date.now()}`,
          task_id: taskId,
          changed_by: currentUser?.id || 'usr-01',
          performer_name: currentUser?.full_name || 'Staff Member',
          field_changed: 'status',
          old_value: oldStatus,
          new_value: status,
          changed_at: new Date().toISOString(),
        };

        const updatedTasks = tasks.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              status,
              completed_at: status === 'COMPLETED' ? new Date().toISOString() : t.completed_at,
              changelog: [newEntry, ...(t.changelog || [])],
              updated_at: new Date().toISOString(),
            };
          }
          return t;
        });

        const newAudit = createAuditLog(currentUser, 'tasks', taskId, 'UPDATE', { status: oldStatus }, { status });
        set({ tasks: updatedTasks, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('tasks', 'update', { id: taskId, status, updated_at: new Date().toISOString() }, { action: 'UPDATE', old_data: { status: oldStatus } });
      },

      archiveTask: (taskId) => {
        const { tasks, auditLogs, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        const updated = tasks.map((t) =>
          t.id === taskId ? { ...t, is_archived: true, status: 'ABANDONED' as const, updated_at: new Date().toISOString() } : t
        );
        const newAudit = createAuditLog(currentUser, 'tasks', taskId, 'ARCHIVE', existing, { is_archived: true, status: 'ABANDONED' });
        set({ tasks: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('tasks', 'archive', { id: taskId, is_archived: true, status: 'ABANDONED' }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreTask: (taskId) => {
        const { tasks, auditLogs, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        const updated = tasks.map((t) =>
          t.id === taskId ? { ...t, is_archived: false, status: 'TODO' as const, updated_at: new Date().toISOString() } : t
        );
        const newAudit = createAuditLog(currentUser, 'tasks', taskId, 'RESTORE', existing, { is_archived: false, status: 'TODO' });
        set({ tasks: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('tasks', 'restore', { id: taskId, is_archived: false, status: 'TODO' }, { action: 'RESTORE', old_data: existing });
      },

      deleteTask: (taskId) => {
        get().archiveTask(taskId);
      },

      addTaskRemark: (taskId, comment) => {
        const { tasks, auditLogs, currentUser } = get();
        const newRemark = {
          id: `rem-${Date.now()}`,
          task_id: taskId,
          author_id: currentUser?.id || 'usr-01',
          author_name: currentUser?.full_name || 'Staff Member',
          author_role: currentUser?.roles?.[0]?.label || 'Staff',
          comment,
          is_archived: false,
          created_at: new Date().toISOString(),
        };

        const updatedTasks = tasks.map((t) =>
          t.id === taskId
            ? { ...t, remarks: [...(t.remarks || []), newRemark], updated_at: new Date().toISOString() }
            : t
        );

        const newAudit = createAuditLog(currentUser, 'task_remarks', newRemark.id, 'INSERT', null, newRemark);
        set({ tasks: updatedTasks, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('task_remarks', 'insert', newRemark, { action: 'INSERT', new_data: newRemark });
      },

      addTaskAttachment: (taskId, attachment) => {
        const { tasks, auditLogs, currentUser } = get();
        const fullAttachment = {
          ...attachment,
          is_archived: false,
        };
        const updatedTasks = tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                attachments: [...(t.attachments || []), fullAttachment],
                updated_at: new Date().toISOString(),
              }
            : t
        );
        const newAudit = createAuditLog(currentUser, 'task_attachments', attachment.id, 'INSERT', null, fullAttachment);
        set({ tasks: updatedTasks, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('task_attachments', 'insert', fullAttachment, { action: 'INSERT', new_data: fullAttachment });
      },

      updateTaskAssignees: (taskId, assigneeIds) => {
        const { tasks, auditLogs, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        const updatedTasks = tasks.map((t) =>
          t.id === taskId ? { ...t, assigned_to: assigneeIds, updated_at: new Date().toISOString() } : t
        );
        const newAudit = createAuditLog(currentUser, 'tasks', taskId, 'UPDATE', { assigned_to: existing?.assigned_to }, { assigned_to: assigneeIds });
        set({ tasks: updatedTasks, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('tasks', 'update', { id: taskId, assigned_to: assigneeIds }, { action: 'UPDATE', old_data: existing });
      },

      updateTaskDates: (taskId, startDate, dueDate) => {
        const { tasks, auditLogs, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        const updatedTasks = tasks.map((t) =>
          t.id === taskId ? { ...t, start_date: startDate, due_date: dueDate, updated_at: new Date().toISOString() } : t
        );
        const newAudit = createAuditLog(currentUser, 'tasks', taskId, 'UPDATE', { start_date: existing?.start_date, due_date: existing?.due_date }, { start_date: startDate, due_date: dueDate });
        set({ tasks: updatedTasks, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('tasks', 'update', { id: taskId, start_date: startDate, due_date: dueDate }, { action: 'UPDATE', old_data: existing });
      },

      // Daily Shift Logs (8.1)
      addDailyShiftLog: (logData) => {
        const { dailyShiftLogs, auditLogs, currentUser } = get();
        const newId = `shift-${Date.now()}`;
        const newLog: DailyShiftLog = {
          ...logData,
          id: newId,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const dbShiftLogPayload = {
          id: newId,
          hub_id: logData.hub_id,
          hub_name: logData.hub_name || undefined,
          author_id: logData.author_id || currentUser?.id || 'usr-01',
          author_name: logData.author_name || logData.staff_name || currentUser?.full_name || 'Staff Member',
          author_role: logData.author_role || logData.staff_role || 'Staff',
          shift_date: logData.shift_date || logData.date || new Date().toISOString().split('T')[0],
          shift_type: logData.shift_type,
          accomplishments: logData.accomplishments,
          vehicles_serviced: logData.vehicles_serviced || 0,
          customer_issues_resolved: logData.customer_issues_resolved || 0,
          roadblocks: logData.roadblocks || logData.blockers || '',
          milestones_completed: logData.milestones_completed || '',
          handover_notes: logData.handover_notes || '',
          media_attachments: logData.media_attachments || [],
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const newAudit = createAuditLog(currentUser, 'daily_shift_logs', newId, 'INSERT', null, newLog);
        set({ dailyShiftLogs: [newLog, ...dailyShiftLogs], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('daily_shift_logs', 'insert', dbShiftLogPayload, { action: 'INSERT', new_data: dbShiftLogPayload });
      },

      updateDailyShiftLog: (id, updates) => {
        const { dailyShiftLogs, auditLogs, currentUser } = get();
        const existing = dailyShiftLogs.find((l) => l.id === id);
        const updatedLogs = dailyShiftLogs.map((l) =>
          l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
        );
        const newAudit = createAuditLog(currentUser, 'daily_shift_logs', id, 'UPDATE', existing, updates);
        set({ dailyShiftLogs: updatedLogs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('daily_shift_logs', 'update', { id, ...updates }, { action: 'UPDATE', old_data: existing });
      },

      archiveDailyShiftLog: (id) => {
        const { dailyShiftLogs, auditLogs, currentUser } = get();
        const existing = dailyShiftLogs.find((l) => l.id === id);
        const updated = dailyShiftLogs.map((l) =>
          l.id === id ? { ...l, is_archived: true, updated_at: new Date().toISOString() } : l
        );
        const newAudit = createAuditLog(currentUser, 'daily_shift_logs', id, 'ARCHIVE', existing, { is_archived: true });
        set({ dailyShiftLogs: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('daily_shift_logs', 'archive', { id, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreDailyShiftLog: (id) => {
        const { dailyShiftLogs, auditLogs, currentUser } = get();
        const existing = dailyShiftLogs.find((l) => l.id === id);
        const updated = dailyShiftLogs.map((l) =>
          l.id === id ? { ...l, is_archived: false, updated_at: new Date().toISOString() } : l
        );
        const newAudit = createAuditLog(currentUser, 'daily_shift_logs', id, 'RESTORE', existing, { is_archived: false });
        set({ dailyShiftLogs: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('daily_shift_logs', 'restore', { id, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      // Role-Based Group Communications (8.2)
      createChatChannel: (channelData) => {
        const { chatChannels, auditLogs, currentUser } = get();
        const newId = `chan-${Date.now()}`;
        const newChan: ChatChannel = {
          ...channelData,
          id: newId,
          is_archived: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const newAudit = createAuditLog(currentUser, 'chat_channels', newId, 'INSERT', null, newChan);
        set({ chatChannels: [...chatChannels, newChan], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('chat_channels', 'insert', newChan, { action: 'INSERT', new_data: newChan });
      },

      updateChatChannel: (id, updates) => {
        const { chatChannels, auditLogs, currentUser } = get();
        const existing = chatChannels.find((c) => c.id === id);
        if (!existing) return;

        const updatedChan = { ...existing, ...updates, updated_at: new Date().toISOString() };
        const updatedChannels = chatChannels.map((c) => (c.id === id ? updatedChan : c));
        const newAudit = createAuditLog(currentUser, 'chat_channels', id, 'UPDATE', existing, updates);
        set({ chatChannels: updatedChannels, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('chat_channels', 'update', updatedChan, { action: 'UPDATE', old_data: existing, new_data: updates });
      },

      archiveChatChannel: (id) => {
        const { chatChannels, auditLogs, currentUser } = get();
        const existing = chatChannels.find((c) => c.id === id);
        if (!existing) return;

        const updatedChannels = chatChannels.map((c) =>
          c.id === id ? { ...c, is_archived: true, is_active: false, updated_at: new Date().toISOString() } : c
        );
        const newAudit = createAuditLog(currentUser, 'chat_channels', id, 'ARCHIVE', existing, { is_archived: true, is_active: false });
        set({ chatChannels: updatedChannels, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('chat_channels', 'archive', { id, is_archived: true, is_active: false }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreChatChannel: (id) => {
        const { chatChannels, auditLogs, currentUser } = get();
        const existing = chatChannels.find((c) => c.id === id);
        if (!existing) return;

        const updatedChannels = chatChannels.map((c) =>
          c.id === id ? { ...c, is_archived: false, is_active: true, updated_at: new Date().toISOString() } : c
        );
        const newAudit = createAuditLog(currentUser, 'chat_channels', id, 'RESTORE', existing, { is_archived: false, is_active: true });
        set({ chatChannels: updatedChannels, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('chat_channels', 'restore', { id, is_archived: false, is_active: true }, { action: 'RESTORE', old_data: existing });
      },

      deleteChatChannel: (id) => {
        get().archiveChatChannel(id);
      },

      sendChannelMessage: (msgData) => {
        const { channelMessages, currentUser } = get();
        const newId = `msg-${Date.now()}`;
        const newMsg: ChannelMessage = {
          ...msgData,
          id: newId,
          content: msgData.content || msgData.message || '',
          message: msgData.content || msgData.message || '',
          is_hidden: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        };
        const dbMsgPayload = {
          id: newId,
          channel_id: msgData.channel_id,
          sender_id: msgData.sender_id || currentUser?.id || 'usr-01',
          sender_name: msgData.sender_name || currentUser?.full_name || 'Staff Member',
          sender_role: msgData.sender_role || 'Staff',
          sender_avatar: msgData.sender_avatar || currentUser?.avatar_url || null,
          content: msgData.content || msgData.message || '',
          attachments: msgData.attachments || [],
          is_archived: false,
          created_at: new Date().toISOString(),
        };
        set({ channelMessages: [...channelMessages, newMsg] });
        supabaseSync.pushMutation('channel_messages', 'insert', dbMsgPayload);
      },

      // ====================================================================
      // 4 & 5. VEHICLE MUTATIONS, EDIT & RAPID INSPECTIONS
      // ====================================================================
      updateVehicleCustomId: (vehicleId, customId) => {
        const { vehicles, auditLogs, currentUser } = get();
        const existing = vehicles.find((v) => v.id === vehicleId);
        if (!existing) return;

        const updated = vehicles.map((v) =>
          v.id === vehicleId ? { ...v, custom_vehicle_id: customId, updated_at: new Date().toISOString() } : v
        );

        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'UPDATE', { custom_vehicle_id: existing.custom_vehicle_id }, { custom_vehicle_id: customId });
        set({ vehicles: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', { id: vehicleId, custom_vehicle_id: customId }, { action: 'UPDATE', old_data: existing });
      },

      updateVehicle: (vehicleId, vehicleData) => {
        const { vehicles, auditLogs, currentUser } = get();
        const existing = vehicles.find((v) => v.id === vehicleId);
        if (!existing) return;

        const updatedVehicles = vehicles.map((v) =>
          v.id === vehicleId
            ? { ...v, ...vehicleData, updated_at: new Date().toISOString() }
            : v
        );

        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'UPDATE', existing, vehicleData);
        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', {
          id: vehicleId,
          ...vehicleData,
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: existing });
      },

      requestVehicleStatus: (vehicleId, pendingStatus, reason, forceImmediate) => {
        const { vehicles, auditLogs, currentUser, activeRoles } = get();
        const isAuthorized = activeRoles.includes('owner') || activeRoles.includes('manager');
        const shouldBypass = Boolean(forceImmediate && isAuthorized);
        const existing = vehicles.find((v) => v.id === vehicleId);

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === vehicleId) {
            return {
              ...v,
              current_status: shouldBypass ? pendingStatus : v.current_status,
              pending_status: shouldBypass ? null : pendingStatus,
              status_change_reason: reason,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(
          currentUser,
          'vehicles',
          vehicleId,
          'UPDATE',
          existing ? { current_status: existing.current_status, pending_status: existing.pending_status } : null,
          {
            current_status: shouldBypass ? pendingStatus : existing?.current_status,
            pending_status: shouldBypass ? null : pendingStatus,
            status_change_reason: reason,
          }
        );

        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', {
          id: vehicleId,
          current_status: shouldBypass ? pendingStatus : existing?.current_status,
          pending_status: shouldBypass ? null : pendingStatus,
          status_change_reason: reason,
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: existing, performed_by: currentUser?.id, performer_name: currentUser?.full_name });
      },

      approveVehicleStatus: (vehicleId) => {
        const { vehicles, auditLogs, currentUser } = get();
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (!vehicle || !vehicle.pending_status) return;

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === vehicleId) {
            return {
              ...v,
              current_status: v.pending_status!,
              pending_status: null,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'UPDATE', { current_status: vehicle.current_status, pending_status: vehicle.pending_status }, { current_status: vehicle.pending_status, pending_status: null });
        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', {
          id: vehicleId,
          current_status: vehicle.pending_status,
          pending_status: null,
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: vehicle, performed_by: currentUser?.id, performer_name: currentUser?.full_name });
      },

      rejectVehicleStatus: (vehicleId) => {
        const { vehicles, auditLogs, currentUser } = get();
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (!vehicle) return;

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === vehicleId) {
            return {
              ...v,
              pending_status: null,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'UPDATE', { pending_status: vehicle.pending_status }, { pending_status: null });
        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', {
          id: vehicleId,
          pending_status: null,
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: vehicle, performed_by: currentUser?.id, performer_name: currentUser?.full_name });
      },

      reassignVehicleIotId: (vehicleId, newIotId, reason) => {
        const { vehicles, auditLogs, currentUser } = get();
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (!vehicle) return;

        const oldIotId = vehicle.vehicle_id;
        const updatedVehicles = vehicles.map((v) => {
          if (v.id === vehicleId) {
            return {
              ...v,
              vehicle_id: newIotId,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'UPDATE', { vehicle_id: oldIotId }, { vehicle_id: newIotId, reason });
        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', {
          id: vehicleId,
          vehicle_id: newIotId,
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: vehicle, performed_by: currentUser?.id, performer_name: currentUser?.full_name });
      },

      updateVehicleOdometer: (vehicleId, odometerKm) => {
        const { vehicles, auditLogs, currentUser } = get();
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (!vehicle) return;

        const oldOdo = vehicle.odometer_km;
        const updatedVehicles = vehicles.map((v) => {
          if (v.id === vehicleId) {
            return {
              ...v,
              odometer_km: odometerKm,
              last_odometer_updated_at: new Date().toISOString(),
              last_odometer_updated_by: currentUser?.id || 'usr-01',
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'UPDATE', { odometer_km: oldOdo }, { odometer_km: odometerKm });
        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', {
          id: vehicleId,
          odometer_km: odometerKm,
          last_odometer_updated_at: new Date().toISOString(),
          last_odometer_updated_by: currentUser?.id || 'usr-01',
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: vehicle, performed_by: currentUser?.id, performer_name: currentUser?.full_name });
      },

      archiveVehicle: (vehicleId) => {
        const { vehicles, auditLogs, currentUser } = get();
        const existing = vehicles.find((v) => v.id === vehicleId);
        const updated = vehicles.map((v) =>
          v.id === vehicleId
            ? { ...v, is_active: false, is_archived: true, current_status: 'Not Available' as const, updated_at: new Date().toISOString() }
            : v
        );
        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'ARCHIVE', existing, { is_active: false, is_archived: true });
        set({ vehicles: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'archive', { id: vehicleId, is_active: false, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreVehicle: (vehicleId) => {
        const { vehicles, auditLogs, currentUser } = get();
        const existing = vehicles.find((v) => v.id === vehicleId);
        const updated = vehicles.map((v) =>
          v.id === vehicleId
            ? { ...v, is_active: true, is_archived: false, current_status: 'Available' as const, updated_at: new Date().toISOString() }
            : v
        );
        const newAudit = createAuditLog(currentUser, 'vehicles', vehicleId, 'RESTORE', existing, { is_active: true, is_archived: false });
        set({ vehicles: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'restore', { id: vehicleId, is_active: true, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      logInspection: (inspectionData) => {
        const { inspections, vehicles, auditLogs, currentUser, activeRoles } = get();
        const newId = `insp-${Date.now()}`;
        const isAuthorized = (activeRoles || []).includes('owner') || (activeRoles || []).includes('manager');

        const newInspection: VehicleInspection = {
          ...inspectionData,
          id: newId,
          is_archived: false,
          inspector_id: currentUser?.id || 'usr-01',
          inspector_name: currentUser?.full_name || 'Staff Member',
          inspected_at: new Date().toISOString(),
        };

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === inspectionData.vehicle_id) {
            return {
              ...v,
              odometer_km: inspectionData.odometer_km,
              last_odometer_updated_at: new Date().toISOString(),
              last_odometer_updated_by: currentUser?.id || 'usr-01',
              last_inspected_at: new Date().toISOString(),
              last_inspected_by: currentUser?.full_name || 'Staff Member',
              current_status: isAuthorized ? inspectionData.recommended_status : v.current_status,
              pending_status: isAuthorized ? null : inspectionData.recommended_status,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'vehicle_inspections', newId, 'INSERT', null, newInspection);
        set({
          inspections: [newInspection, ...inspections],
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('vehicle_inspections', 'insert', newInspection, { action: 'INSERT', new_data: newInspection });
      },

      // ====================================================================
      // 6. SPARE PARTS & SINGLE "STORE 1" DISPATCH
      // ====================================================================
      addPart: (partData) => {
        const { parts, hubStock, auditLogs, currentUser } = get();
        const newPartId = `p-${Date.now()}`;
        const newPart: PartInventory = {
          ...partData,
          id: newPartId,
          is_active: true,
          is_archived: false,
          created_at: new Date().toISOString(),
        };

        const initialStockEntry: HubPartStock = {
          id: `hs-store1-${newPartId}`,
          hub_id: 'hub-store-01',
          part_id: newPartId,
          physical_stock: 0,
          pending_allocated_stock: 0,
          min_threshold: partData.min_threshold || 5,
          is_archived: false,
          updated_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'parts', newPartId, 'INSERT', null, newPart);
        set({
          parts: [...parts, newPart],
          hubStock: [...hubStock, initialStockEntry],
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('parts', 'insert', newPart, { action: 'INSERT', new_data: newPart });
        supabaseSync.pushMutation('hub_part_stock', 'insert', initialStockEntry, { action: 'INSERT', new_data: initialStockEntry });
      },

      updatePart: (partId, partData) => {
        const { parts, auditLogs, currentUser } = get();
        const existing = parts.find((p) => p.id === partId);
        if (!existing) return;

        const updatedParts = parts.map((p) =>
          p.id === partId ? { ...p, ...partData } : p
        );

        const newAudit = createAuditLog(currentUser, 'parts', partId, 'UPDATE', existing, partData);
        set({ parts: updatedParts, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('parts', 'update', { id: partId, ...partData }, { action: 'UPDATE', old_data: existing });
      },

      archivePart: (partId) => {
        const { parts, auditLogs, currentUser } = get();
        const existing = parts.find((p) => p.id === partId);
        const updated = parts.map((p) =>
          p.id === partId ? { ...p, is_active: false, is_archived: true } : p
        );
        const newAudit = createAuditLog(currentUser, 'parts', partId, 'ARCHIVE', existing, { is_active: false, is_archived: true });
        set({ parts: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('parts', 'archive', { id: partId, is_active: false, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restorePart: (partId) => {
        const { parts, auditLogs, currentUser } = get();
        const existing = parts.find((p) => p.id === partId);
        const updated = parts.map((p) =>
          p.id === partId ? { ...p, is_active: true, is_archived: false } : p
        );
        const newAudit = createAuditLog(currentUser, 'parts', partId, 'RESTORE', existing, { is_active: true, is_archived: false });
        set({ parts: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('parts', 'restore', { id: partId, is_active: true, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      issuePartFromStore1: (partId, quantity, recipientName, reason, hubId, vehicleId) => {
        const { hubStock, partUsageLogs, auditLogs, currentUser } = get();
        const store1Stock = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === partId);
        if (!store1Stock) return;

        const updatedStock = hubStock.map((s) => {
          if (s.hub_id === 'hub-store-01' && s.part_id === partId) {
            return {
              ...s,
              physical_stock: Math.max(0, s.physical_stock - quantity),
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        });

        const newUsageLog: PartUsageLog = {
          id: `usg-${Date.now()}`,
          part_id: partId,
          hub_id: hubId || 'hub-store-01',
          vehicle_id: vehicleId || null,
          quantity,
          used_by_id: currentUser?.id || 'usr-01',
          used_by_name: currentUser?.full_name || 'Staff Member',
          recipient_name: recipientName,
          reason,
          is_archived: false,
          created_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'part_usage_logs', newUsageLog.id, 'INSERT', { physical_stock: store1Stock.physical_stock }, { physical_stock: Math.max(0, store1Stock.physical_stock - quantity), usage: newUsageLog });
        set({
          hubStock: updatedStock,
          partUsageLogs: [newUsageLog, ...partUsageLogs],
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('part_usage_logs', 'insert', newUsageLog, { action: 'INSERT', new_data: newUsageLog });
      },

      adjustPhysicalStock: (hubId, partId, newPhysicalStock, reason) => {
        const { hubStock, auditLogs, currentUser } = get();
        const targetHubId = hubId || 'hub-store-01';
        const stock = hubStock.find((s) => s.hub_id === targetHubId && s.part_id === partId);

        let updatedStock: HubPartStock[];
        if (stock) {
          updatedStock = hubStock.map((s) =>
            s.hub_id === targetHubId && s.part_id === partId
              ? { ...s, physical_stock: newPhysicalStock, updated_at: new Date().toISOString() }
              : s
          );
        } else {
          const newEntry: HubPartStock = {
            id: `hs-${targetHubId}-${partId}`,
            hub_id: targetHubId,
            part_id: partId,
            physical_stock: newPhysicalStock,
            pending_allocated_stock: 0,
            min_threshold: 5,
            is_archived: false,
            updated_at: new Date().toISOString(),
          };
          updatedStock = [...hubStock, newEntry];
        }

        const newAudit = createAuditLog(currentUser, 'hub_part_stock', `${targetHubId}-${partId}`, 'UPDATE', { physical_stock: stock?.physical_stock ?? 0 }, { physical_stock: newPhysicalStock, reason });
        set({ hubStock: updatedStock, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('hub_part_stock', 'update', { hub_id: targetHubId, part_id: partId, physical_stock: newPhysicalStock }, { action: 'UPDATE', old_data: stock });
      },

      // ====================================================================
      // 7. JOB CARDS ENGINE
      // ====================================================================
      createJobCard: (cardData, partsList, forceImmediateApproval) => {
        const { jobCards, parts, hubStock, vehicles, auditLogs, currentUser, activeRoles } = get();
        const isAuthorized =
          ((activeRoles || []).includes('owner') || (activeRoles || []).includes('manager')) &&
          Boolean(forceImmediateApproval);

        const newJobCardId = `job-${Date.now()}`;
        const newTicketNumber = jobCards.length > 0 ? Math.max(...jobCards.map((j) => j.ticket_number)) + 1 : 101;
        const initialStatus = isAuthorized ? 'APPROVED' : 'PENDING';

        const builtParts = (partsList || []).map((p, idx) => {
          const partDef = (parts || []).find((item) => item.id === p.part_id);
          return {
            id: `jcp-${Date.now()}-${idx}`,
            job_card_id: newJobCardId,
            part_id: p.part_id,
            quantity: p.quantity,
            unit_cost_snapshot: partDef?.unit_cost || 0,
            is_approved: isAuthorized,
            is_archived: false,
            created_at: new Date().toISOString(),
          };
        });

        const newJobCard: JobCard = {
          ...cardData,
          id: newJobCardId,
          ticket_number: newTicketNumber,
          status: initialStatus,
          approved_by: isAuthorized ? (currentUser?.id || 'usr-01') : null,
          approved_at: isAuthorized ? new Date().toISOString() : null,
          approval_notes: isAuthorized ? 'Self-approved upon ticket creation by authorized manager' : null,
          is_archived: false,
          created_at: new Date().toISOString(),
          parts: builtParts,
        };

        // Deduct from Store 1 warehouse
        let updatedStock = [...hubStock];
        if (builtParts.length > 0) {
          updatedStock = hubStock.map((s) => {
            if (s.hub_id === 'hub-store-01') {
              const matched = builtParts.find((bp) => bp.part_id === s.part_id);
              if (matched) {
                if (isAuthorized) {
                  return {
                    ...s,
                    physical_stock: Math.max(0, s.physical_stock - matched.quantity),
                    updated_at: new Date().toISOString(),
                  };
                } else {
                  return {
                    ...s,
                    pending_allocated_stock: s.pending_allocated_stock + matched.quantity,
                    updated_at: new Date().toISOString(),
                  };
                }
              }
            }
            return s;
          });
        }

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === cardData.vehicle_id) {
            const nextOdometer = cardData.odometer_km ? cardData.odometer_km : v.odometer_km;
            return {
              ...v,
              odometer_km: nextOdometer,
              last_odometer_updated_at: cardData.odometer_km ? new Date().toISOString() : v.last_odometer_updated_at,
              last_odometer_updated_by: cardData.odometer_km ? (currentUser?.id || 'usr-01') : v.last_odometer_updated_by,
              current_status: isAuthorized ? ('Under Repair' as const) : v.current_status,
              pending_status: isAuthorized ? null : ('Under Repair' as const),
              status_change_reason: cardData.issue_description,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'job_cards', newJobCardId, 'INSERT', null, {
          ticket_number: newTicketNumber,
          vehicle_id: cardData.vehicle_id,
          status: initialStatus,
        });

        set({
          jobCards: [newJobCard, ...jobCards],
          hubStock: updatedStock,
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
        const { parts: _parts, ...parentJobCard } = newJobCard;
        supabaseSync.pushMutation('job_cards', 'insert', parentJobCard, { action: 'INSERT', new_data: parentJobCard });
        for (const bp of builtParts) {
          supabaseSync.pushMutation('job_card_parts', 'insert', bp, { action: 'INSERT', new_data: bp });
        }
        for (const stockItem of updatedStock.filter((s) => s.hub_id === 'hub-store-01' && builtParts.some((bp) => bp.part_id === s.part_id))) {
          supabaseSync.pushMutation('hub_part_stock', 'update', {
            id: stockItem.id,
            physical_stock: stockItem.physical_stock,
            pending_allocated_stock: stockItem.pending_allocated_stock,
            updated_at: stockItem.updated_at,
          });
        }
        const updatedTargetVeh = updatedVehicles.find((v) => v.id === cardData.vehicle_id);
        if (updatedTargetVeh) {
          supabaseSync.pushMutation('vehicles', 'update', {
            id: updatedTargetVeh.id,
            odometer_km: updatedTargetVeh.odometer_km,
            current_status: updatedTargetVeh.current_status,
            pending_status: updatedTargetVeh.pending_status,
            status_change_reason: updatedTargetVeh.status_change_reason,
            updated_at: updatedTargetVeh.updated_at,
          });
        }
      },

      updateJobCard: (jobCardId, updates) => {
        const { jobCards, auditLogs, currentUser } = get();
        const existing = jobCards.find((j) => j.id === jobCardId);
        if (!existing) return;

        const updatedJobCards = jobCards.map((j) =>
          j.id === jobCardId ? { ...j, ...updates } : j
        );

        const newAudit = createAuditLog(currentUser, 'job_cards', jobCardId, 'UPDATE', existing, updates);
        set({ jobCards: updatedJobCards, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('job_cards', 'update', { id: jobCardId, ...updates }, { action: 'UPDATE', old_data: existing });
      },

      approveJobCard: (jobCardId, approvalNotes) => {
        const { jobCards, hubStock, vehicles, auditLogs, currentUser } = get();
        const job = jobCards.find((j) => j.id === jobCardId);
        if (!job) return;

        let updatedStock = [...hubStock];
        if (job.parts && job.parts.length > 0) {
          updatedStock = hubStock.map((s) => {
            if (s.hub_id === 'hub-store-01') {
              const matchedPart = job.parts?.find((p) => p.part_id === s.part_id);
              if (matchedPart) {
                return {
                  ...s,
                  physical_stock: Math.max(0, s.physical_stock - matchedPart.quantity),
                  pending_allocated_stock: Math.max(0, s.pending_allocated_stock - matchedPart.quantity),
                  updated_at: new Date().toISOString(),
                };
              }
            }
            return s;
          });
        }

        const updatedJobCards = jobCards.map((j) => {
          if (j.id === jobCardId) {
            return {
              ...j,
              status: 'APPROVED' as const,
              approved_by: currentUser?.id || 'usr-01',
              approved_at: new Date().toISOString(),
              approval_notes: approvalNotes || 'Manager sign-off completed.',
              parts: j.parts?.map((p) => ({ ...p, is_approved: true })),
            };
          }
          return j;
        });

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === job.vehicle_id) {
            return {
              ...v,
              current_status: 'Available' as const,
              pending_status: null,
              status_change_reason: null,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'job_cards', jobCardId, 'UPDATE', { status: 'PENDING' }, { status: 'APPROVED', approval_notes: approvalNotes });
        set({
          jobCards: updatedJobCards,
          hubStock: updatedStock,
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('job_cards', 'update', { id: jobCardId, status: 'APPROVED', approved_by: currentUser?.id || 'usr-01', approved_at: new Date().toISOString(), approval_notes: approvalNotes || 'Manager sign-off completed.' }, { action: 'UPDATE', old_data: job });
        for (const stockItem of updatedStock.filter((s) => s.hub_id === 'hub-store-01' && (job.parts || []).some((bp) => bp.part_id === s.part_id))) {
          supabaseSync.pushMutation('hub_part_stock', 'update', {
            id: stockItem.id,
            physical_stock: stockItem.physical_stock,
            pending_allocated_stock: stockItem.pending_allocated_stock,
            updated_at: stockItem.updated_at,
          });
        }
        const updatedTargetVeh = updatedVehicles.find((v) => v.id === job.vehicle_id);
        if (updatedTargetVeh) {
          supabaseSync.pushMutation('vehicles', 'update', {
            id: updatedTargetVeh.id,
            current_status: updatedTargetVeh.current_status,
            pending_status: updatedTargetVeh.pending_status,
            status_change_reason: updatedTargetVeh.status_change_reason,
            updated_at: updatedTargetVeh.updated_at,
          });
        }
      },

      rejectJobCard: (jobCardId, rejectionNotes) => {
        const { jobCards, hubStock, vehicles, auditLogs, currentUser } = get();
        const job = jobCards.find((j) => j.id === jobCardId);
        if (!job) return;

        let updatedStock = [...hubStock];
        if (job.parts && job.parts.length > 0) {
          updatedStock = hubStock.map((s) => {
            if (s.hub_id === 'hub-store-01') {
              const matchedPart = job.parts?.find((p) => p.part_id === s.part_id);
              if (matchedPart) {
                return {
                  ...s,
                  pending_allocated_stock: Math.max(0, s.pending_allocated_stock - matchedPart.quantity),
                  updated_at: new Date().toISOString(),
                };
              }
            }
            return s;
          });
        }

        const updatedJobCards = jobCards.map((j) => {
          if (j.id === jobCardId) {
            return {
              ...j,
              status: 'REJECTED' as const,
              approved_by: currentUser?.id || 'usr-01',
              approved_at: new Date().toISOString(),
              approval_notes: rejectionNotes,
            };
          }
          return j;
        });

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === job.vehicle_id) {
            return {
              ...v,
              pending_status: null,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit = createAuditLog(currentUser, 'job_cards', jobCardId, 'UPDATE', { status: 'PENDING' }, { status: 'REJECTED', rejection_notes: rejectionNotes });
        set({
          jobCards: updatedJobCards,
          hubStock: updatedStock,
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('job_cards', 'update', { id: jobCardId, status: 'REJECTED', approved_by: currentUser?.id || 'usr-01', approved_at: new Date().toISOString(), approval_notes: rejectionNotes }, { action: 'UPDATE', old_data: job });
        for (const stockItem of updatedStock.filter((s) => s.hub_id === 'hub-store-01' && (job.parts || []).some((bp) => bp.part_id === s.part_id))) {
          supabaseSync.pushMutation('hub_part_stock', 'update', {
            id: stockItem.id,
            pending_allocated_stock: stockItem.pending_allocated_stock,
            updated_at: stockItem.updated_at,
          });
        }
        const updatedTargetVeh = updatedVehicles.find((v) => v.id === job.vehicle_id);
        if (updatedTargetVeh) {
          supabaseSync.pushMutation('vehicles', 'update', {
            id: updatedTargetVeh.id,
            pending_status: updatedTargetVeh.pending_status,
            updated_at: updatedTargetVeh.updated_at,
          });
        }
      },

      archiveJobCard: (jobCardId) => {
        const { jobCards, auditLogs, currentUser } = get();
        const existing = jobCards.find((j) => j.id === jobCardId);
        const updated = jobCards.map((j) =>
          j.id === jobCardId ? { ...j, is_archived: true } : j
        );
        const newAudit = createAuditLog(currentUser, 'job_cards', jobCardId, 'ARCHIVE', existing, { is_archived: true });
        set({ jobCards: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('job_cards', 'archive', { id: jobCardId, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreJobCard: (jobCardId) => {
        const { jobCards, auditLogs, currentUser } = get();
        const existing = jobCards.find((j) => j.id === jobCardId);
        const updated = jobCards.map((j) =>
          j.id === jobCardId ? { ...j, is_archived: false } : j
        );
        const newAudit = createAuditLog(currentUser, 'job_cards', jobCardId, 'RESTORE', existing, { is_archived: false });
        set({ jobCards: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('job_cards', 'restore', { id: jobCardId, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      // ====================================================================
      // 8. STANDARD OPERATING PROCEDURES (SOPs)
      // ====================================================================
      createSOP: (sopData) => {
        const { sops, auditLogs, currentUser } = get();
        const newId = `sop-${Date.now()}`;
        const newSOP: SOP = {
          ...sopData,
          id: newId,
          version: '1.0',
          view_count: 1,
          acknowledged_by: currentUser?.id ? [currentUser.id] : [],
          is_archived: false,
          revisions: [
            {
              version: '1.0',
              updated_at: new Date().toISOString(),
              updated_by_name: currentUser?.full_name || 'Staff Member',
              change_summary: 'Initial document creation',
              content: sopData.content,
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'sops', newId, 'INSERT', null, newSOP);
        set({ sops: [newSOP, ...sops], auditLogs: [newAudit, ...auditLogs] });
        const { revisions, ...parentSOP } = newSOP;
        supabaseSync.pushMutation('sops', 'insert', parentSOP, { action: 'INSERT', new_data: parentSOP });
        if (newSOP.revisions && newSOP.revisions.length > 0) {
          for (const rev of newSOP.revisions) {
            supabaseSync.pushMutation('sop_revisions', 'insert', { ...rev, sop_id: newId });
          }
        }
      },

      updateSOP: (sopId, updates, changeSummary) => {
        const { sops, auditLogs, currentUser } = get();
        const existing = sops.find((s) => s.id === sopId);
        if (!existing) return;

        const currentMajor = parseFloat(existing.version) || 1.0;
        const nextVersion = (currentMajor + 0.1).toFixed(1);

        const newRevision = {
          version: nextVersion,
          updated_at: new Date().toISOString(),
          updated_by_name: currentUser?.full_name || 'Staff Member',
          change_summary: changeSummary || 'General procedure refinement',
          content: updates.content || existing.content,
        };

        const updatedSOPs = sops.map((s) => {
          if (s.id === sopId) {
            return {
              ...s,
              ...updates,
              version: nextVersion,
              revisions: [newRevision, ...s.revisions],
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        });

        const newAudit = createAuditLog(currentUser, 'sops', sopId, 'UPDATE', { version: existing.version }, { version: nextVersion, changeSummary });
        set({ sops: updatedSOPs, auditLogs: [newAudit, ...auditLogs] });
        const { revisions: _revs, ...parentUpdates } = updates as any;
        supabaseSync.pushMutation('sops', 'update', { id: sopId, version: nextVersion, ...parentUpdates, updated_at: new Date().toISOString() }, { action: 'UPDATE', old_data: existing });
        supabaseSync.pushMutation('sop_revisions', 'insert', { ...newRevision, sop_id: sopId });
      },

      publishSOP: (sopId) => {
        const { sops, auditLogs, currentUser } = get();
        const updatedSOPs = sops.map((s) =>
          s.id === sopId
            ? { ...s, status: 'PUBLISHED' as const, is_archived: false, updated_at: new Date().toISOString() }
            : s
        );

        const newAudit = createAuditLog(currentUser, 'sops', sopId, 'UPDATE', { status: 'DRAFT' }, { status: 'PUBLISHED' });
        set({ sops: updatedSOPs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('sops', 'update', { id: sopId, status: 'PUBLISHED', is_archived: false }, { action: 'UPDATE' });
      },

      acknowledgeSOP: (sopId, profileId) => {
        const { sops, currentUser } = get();
        const targetId = profileId || currentUser?.id || 'usr-01';

        const updatedSOPs = sops.map((s) => {
          if (s.id === sopId) {
            const acknowledged = s.acknowledged_by || [];
            if (!acknowledged.includes(targetId)) {
              return {
                ...s,
                acknowledged_by: [...acknowledged, targetId],
                view_count: (s.view_count || 0) + 1,
              };
            }
          }
          return s;
        });

        set({ sops: updatedSOPs });
        const targetSOP = updatedSOPs.find((s) => s.id === sopId);
        if (targetSOP) {
          supabaseSync.pushMutation('sops', 'update', {
            id: sopId,
            acknowledged_by: targetSOP.acknowledged_by,
            view_count: targetSOP.view_count,
            updated_at: new Date().toISOString(),
          });
        }
      },

      archiveSOP: (sopId) => {
        const { sops, auditLogs, currentUser } = get();
        const existing = sops.find((s) => s.id === sopId);
        if (!existing) return;

        const updatedSOPs = sops.map((s) =>
          s.id === sopId
            ? { ...s, status: 'ARCHIVED' as const, is_archived: true, updated_at: new Date().toISOString() }
            : s
        );

        const newAudit = createAuditLog(currentUser, 'sops', sopId, 'ARCHIVE', existing, { status: 'ARCHIVED', is_archived: true });
        set({ sops: updatedSOPs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('sops', 'archive', { id: sopId, status: 'ARCHIVED', is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreSOP: (sopId) => {
        const { sops, auditLogs, currentUser } = get();
        const existing = sops.find((s) => s.id === sopId);
        if (!existing) return;

        const updatedSOPs = sops.map((s) =>
          s.id === sopId
            ? { ...s, status: 'PUBLISHED' as const, is_archived: false, updated_at: new Date().toISOString() }
            : s
        );

        const newAudit = createAuditLog(currentUser, 'sops', sopId, 'RESTORE', existing, { status: 'PUBLISHED', is_archived: false });
        set({ sops: updatedSOPs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('sops', 'restore', { id: sopId, status: 'PUBLISHED', is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      deleteSOP: (sopId) => {
        get().archiveSOP(sopId);
      },

      // ====================================================================
      // 9. TEAM NOTES & SCRATCHPAD WITH DISPOSAL LIFECYCLE
      // ====================================================================
      createNote: (noteData) => {
        const { teamNotes, auditLogs, currentUser } = get();
        const newId = `note-${Date.now()}`;
        const newNote: TeamNote = {
          ...noteData,
          id: newId,
          status: 'ACTIVE',
          is_archived: false,
          author_id: currentUser?.id || 'usr-01',
          author_name: currentUser?.full_name || 'Staff Member',
          author_role: currentUser?.roles?.[0]?.label || 'Operations Staff',
          resolved_at: null,
          resolved_by_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit = createAuditLog(currentUser, 'team_notes', newId, 'INSERT', null, newNote);
        set({ teamNotes: [newNote, ...teamNotes], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('team_notes', 'insert', newNote, { action: 'INSERT', new_data: newNote });
      },

      updateNote: (noteId, noteData) => {
        const { teamNotes, auditLogs, currentUser } = get();
        const existing = teamNotes.find((n) => n.id === noteId);
        const updatedNotes = teamNotes.map((n) =>
          n.id === noteId
            ? { ...n, ...noteData, updated_at: new Date().toISOString() }
            : n
        );
        const newAudit = createAuditLog(currentUser, 'team_notes', noteId, 'UPDATE', existing, noteData);
        set({ teamNotes: updatedNotes, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('team_notes', 'update', {
          id: noteId,
          ...noteData,
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: existing });
      },

      archiveNote: (noteId) => {
        const { teamNotes, auditLogs, currentUser } = get();
        const existing = teamNotes.find((n) => n.id === noteId);
        const updated = teamNotes.map((n) =>
          n.id === noteId ? { ...n, status: 'ARCHIVED' as const, is_archived: true, is_pinned: false, updated_at: new Date().toISOString() } : n
        );
        const newAudit = createAuditLog(currentUser, 'team_notes', noteId, 'ARCHIVE', existing, { status: 'ARCHIVED', is_archived: true });
        set({ teamNotes: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('team_notes', 'archive', {
          id: noteId,
          status: 'ARCHIVED',
          is_archived: true,
          is_pinned: false,
          updated_at: new Date().toISOString(),
        }, { action: 'ARCHIVE', old_data: existing });
      },

      resolveNote: (noteId) => {
        const { teamNotes, auditLogs, currentUser } = get();
        const existing = teamNotes.find((n) => n.id === noteId);
        const updated = teamNotes.map((n) =>
          n.id === noteId
            ? {
                ...n,
                status: 'RESOLVED' as const,
                is_pinned: false,
                resolved_at: new Date().toISOString(),
                resolved_by_name: currentUser?.full_name || 'Staff Member',
                updated_at: new Date().toISOString(),
              }
            : n
        );
        const newAudit = createAuditLog(currentUser, 'team_notes', noteId, 'UPDATE', existing, { status: 'RESOLVED' });
        set({ teamNotes: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('team_notes', 'update', {
          id: noteId,
          status: 'RESOLVED',
          is_pinned: false,
          resolved_at: new Date().toISOString(),
          resolved_by_name: currentUser?.full_name || 'Staff Member',
          updated_at: new Date().toISOString(),
        }, { action: 'UPDATE', old_data: existing });
      },

      restoreNote: (noteId) => {
        const { teamNotes, auditLogs, currentUser } = get();
        const existing = teamNotes.find((n) => n.id === noteId);
        const updated = teamNotes.map((n) =>
          n.id === noteId ? { ...n, status: 'ACTIVE' as const, is_archived: false, updated_at: new Date().toISOString() } : n
        );
        const newAudit = createAuditLog(currentUser, 'team_notes', noteId, 'RESTORE', existing, { status: 'ACTIVE', is_archived: false });
        set({ teamNotes: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('team_notes', 'restore', {
          id: noteId,
          status: 'ACTIVE',
          is_archived: false,
          updated_at: new Date().toISOString(),
        }, { action: 'RESTORE', old_data: existing });
      },

      deleteNote: (noteId) => {
        get().archiveNote(noteId);
      },

      bulkDisposeOldNotes: () => {
        const { teamNotes, auditLogs, currentUser } = get();
        const updated = teamNotes.map((n) =>
          n.status === 'RESOLVED' || n.status === 'ARCHIVED'
            ? { ...n, status: 'ARCHIVED' as const, is_archived: true, updated_at: new Date().toISOString() }
            : n
        );
        const newAudit = createAuditLog(currentUser, 'team_notes', 'bulk', 'ARCHIVE', null, { action: 'bulkDispose' });
        set({ teamNotes: updated, auditLogs: [newAudit, ...auditLogs] });
        for (const n of updated.filter((item) => item.status === 'ARCHIVED' && item.is_archived)) {
          supabaseSync.pushMutation('team_notes', 'update', {
            id: n.id,
            status: 'ARCHIVED',
            is_archived: true,
            updated_at: new Date().toISOString(),
          });
        }
      },

      togglePinNote: (noteId) => {
        const { teamNotes, auditLogs, currentUser } = get();
        const existing = teamNotes.find((n) => n.id === noteId);
        const updatedNotes = teamNotes.map((n) =>
          n.id === noteId ? { ...n, is_pinned: !n.is_pinned, updated_at: new Date().toISOString() } : n
        );
        const newAudit = createAuditLog(currentUser, 'team_notes', noteId, 'UPDATE', { is_pinned: existing?.is_pinned }, { is_pinned: !existing?.is_pinned });
        set({ teamNotes: updatedNotes, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('team_notes', 'update', { id: noteId, is_pinned: !existing?.is_pinned });
      },

      // ====================================================================
      // 10. BLOCKED USERS
      // ====================================================================
      addBlockedUser: (userData) => {
        const { blockedUsers, auditLogs, currentUser } = get();
        const newId = `blk-${Date.now()}`;
        const newBlocked: BlockedUser = {
          ...userData,
          id: newId,
          is_archived: false,
        };
        const newAudit = createAuditLog(currentUser, 'blocked_users', newId, 'INSERT', null, newBlocked);
        set({ blockedUsers: [newBlocked, ...blockedUsers], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('blocked_users', 'insert', newBlocked, { action: 'INSERT', new_data: newBlocked });
      },

      updateBlockedUser: (id, updates) => {
        const { blockedUsers, auditLogs, currentUser } = get();
        const existing = blockedUsers.find((b) => b.id === id);
        const updated = blockedUsers.map((b) => (b.id === id ? { ...b, ...updates } : b));
        const newAudit = createAuditLog(currentUser, 'blocked_users', id, 'UPDATE', existing, updates);
        set({ blockedUsers: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('blocked_users', 'update', { id, ...updates }, { action: 'UPDATE', old_data: existing });
      },

      archiveBlockedUser: (id) => {
        const { blockedUsers, auditLogs, currentUser } = get();
        const existing = blockedUsers.find((b) => b.id === id);
        const updated = blockedUsers.map((b) =>
          b.id === id ? { ...b, is_archived: true } : b
        );
        const newAudit = createAuditLog(currentUser, 'blocked_users', id, 'ARCHIVE', existing, { is_archived: true });
        set({ blockedUsers: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('blocked_users', 'archive', { id, is_archived: true }, { action: 'ARCHIVE', old_data: existing });
      },

      restoreBlockedUser: (id) => {
        const { blockedUsers, auditLogs, currentUser } = get();
        const existing = blockedUsers.find((b) => b.id === id);
        const updated = blockedUsers.map((b) =>
          b.id === id ? { ...b, is_archived: false } : b
        );
        const newAudit = createAuditLog(currentUser, 'blocked_users', id, 'RESTORE', existing, { is_archived: false });
        set({ blockedUsers: updated, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('blocked_users', 'restore', { id, is_archived: false }, { action: 'RESTORE', old_data: existing });
      },

      // State Reset to Real Mumbai Baseline
      resetToDefaultData: () => {
        set({
          hubs: INITIAL_HUBS,
          vehicles: INITIAL_VEHICLES,
          inspections: [],
          parts: INITIAL_PARTS,
          hubStock: INITIAL_HUB_STOCK,
          partUsageLogs: [],
          jobCards: INITIAL_JOB_CARDS,
          refunds: INITIAL_REFUNDS,
          objectives: INITIAL_OBJECTIVES,
          milestones: INITIAL_MILESTONES,
          tasks: INITIAL_TASKS,
          dailyShiftLogs: INITIAL_DAILY_SHIFT_LOGS,
          chatChannels: INITIAL_CHAT_CHANNELS,
          channelMessages: INITIAL_CHANNEL_MESSAGES,
          sops: INITIAL_SOPS,
          teamNotes: INITIAL_NOTES,
          blockedUsers: INITIAL_BLOCKED_USERS,
          auditLogs: INITIAL_AUDIT_LOGS,
          customRoles: INITIAL_ROLES,
          staffProfiles: INITIAL_PROFILES,
          selectedHubIds: ['ALL'],
          activeHubId: 'ALL',
          clearedBadges: {},
          activeRoles: get().activeRoles,
          currentUser: get().currentUser,
          isSidebarCollapsed: false,
        });
      },
    }),
    {
      name: 'ezev-ops-mumbai-v6',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        activeRoles: state.activeRoles,
        currentUser: state.currentUser,
        selectedHubIds: state.selectedHubIds,
        clearedBadges: state.clearedBadges,
        customRoles: state.customRoles,
        staffProfiles: state.staffProfiles,
        hubs: state.hubs,
        vehicles: state.vehicles,
        inspections: state.inspections,
        parts: state.parts,
        hubStock: state.hubStock,
        partUsageLogs: state.partUsageLogs,
        jobCards: state.jobCards,
        refunds: state.refunds,
        objectives: state.objectives,
        milestones: state.milestones,
        tasks: state.tasks,
        dailyShiftLogs: state.dailyShiftLogs,
        chatChannels: state.chatChannels,
        channelMessages: state.channelMessages,
        sops: state.sops,
        teamNotes: state.teamNotes,
        blockedUsers: state.blockedUsers,
        // SECURITY (HIGH-07): Do not persist forensic auditLogs in localStorage
      }),
    }
  )
);
