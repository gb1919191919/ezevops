import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Hub,
  Vehicle,
  PartInventory,
  HubPartStock,
  PartUsageLog,
  VehicleInspection,
  JobCard,
  Refund,
  Objective,
  TaskItem,
  AuditLog,
  Profile,
  Role,
  RoleCode,
  PermissionKey,
  VehicleStatus,
  TaskStatus,
  ChargerStatus,
  SOP,
  SOPStatus,
  TeamNote,
  NoteCategory,
  NoteStatus,
  BlockedUser,
} from '@/types';
import {
  INITIAL_HUBS,
  INITIAL_VEHICLES,
  INITIAL_PARTS,
  INITIAL_HUB_STOCK,
  INITIAL_JOB_CARDS,
  INITIAL_REFUNDS,
  INITIAL_OBJECTIVES,
  INITIAL_TASKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PROFILES,
  INITIAL_ROLES,
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

  // Active Session & Multi-Role RBAC State
  currentUser: Profile;
  activeRoles: RoleCode[];
  activeHubId: string | 'ALL';
  customRoles: Role[];
  staffProfiles: Profile[];
  toggleRole: (role: RoleCode) => void;
  setActiveRoles: (roles: RoleCode[]) => void;
  setCurrentUser: (user: Profile) => void;
  setActiveHubId: (hubId: string | 'ALL') => void;

  // Role & User Administration
  addCustomRole: (role: Omit<Role, 'id'>) => void;
  updateRolePermissions: (roleId: string, permissions: PermissionKey[]) => void;
  addStaffProfile: (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => void;
  updateStaffRoles: (profileId: string, roleIds: string[]) => void;

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
  tasks: TaskItem[];
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

  // 2. Hubs & Charger Operations (Full Edit, Add Hub, Quick Charger Toggle)
  addHub: (hubData: Omit<Hub, 'id' | 'created_at' | 'updated_at'>) => void;
  updateHub: (hubId: string, hubData: Partial<Omit<Hub, 'id' | 'created_at'>>) => void;
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

  // 3. Objectives & Hierarchical Tasks Engine ('ABANDONED' status support)
  createObjective: (objectiveData: Omit<Objective, 'id' | 'created_at' | 'is_completed'>) => void;
  createTask: (taskData: Omit<TaskItem, 'id' | 'created_at' | 'updated_at' | 'remarks' | 'changelog'>) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  addTaskRemark: (taskId: string, comment: string) => void;
  updateTaskAssignees: (taskId: string, assigneeIds: string[]) => void;
  updateTaskDates: (taskId: string, startDate?: string, dueDate?: string) => void;

  // 4 & 5. Vehicle Mutations, Odometer, Edit & Rapid Inspection
  updateVehicle: (vehicleId: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'created_at'>>) => void;
  requestVehicleStatus: (vehicleId: string, pendingStatus: VehicleStatus, reason: string, forceImmediate?: boolean) => void;
  approveVehicleStatus: (vehicleId: string) => void;
  rejectVehicleStatus: (vehicleId: string) => void;
  reassignVehicleIotId: (vehicleId: string, newIotId: string, reason: string) => void;
  updateVehicleOdometer: (vehicleId: string, odometerKm: number) => void;
  logInspection: (
    inspectionData: Omit<VehicleInspection, 'id' | 'inspected_at' | 'inspector_id' | 'inspector_name'>
  ) => void;

  // 6. Spare Parts Catalog (Single "Store 1" Warehouse, Dispatch & Usage)
  addPart: (
    partData: Omit<PartInventory, 'id' | 'created_at'>
  ) => void;
  updatePart: (partId: string, partData: Partial<Omit<PartInventory, 'id' | 'created_at'>>) => void;
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

  // 8. Standard Operating Procedures (SOPs Engine)
  createSOP: (sopData: Omit<SOP, 'id' | 'version' | 'view_count' | 'acknowledged_by' | 'revisions' | 'created_at' | 'updated_at'>) => void;
  updateSOP: (sopId: string, updates: Partial<Omit<SOP, 'id' | 'revisions' | 'created_at'>>, changeSummary: string) => void;
  publishSOP: (sopId: string) => void;
  acknowledgeSOP: (sopId: string, profileId?: string) => void;
  deleteSOP: (sopId: string) => void;

  // 9. Team Notes & Scratchpad with Disposal Lifecycle
  createNote: (noteData: Omit<TeamNote, 'id' | 'status' | 'author_id' | 'author_name' | 'author_role' | 'created_at' | 'updated_at'>) => void;
  updateNote: (noteId: string, noteData: Partial<Omit<TeamNote, 'id' | 'author_id' | 'author_name' | 'created_at'>>) => void;
  archiveNote: (noteId: string) => void;
  resolveNote: (noteId: string) => void;
  restoreNote: (noteId: string) => void;
  deleteNote: (noteId: string) => void;
  bulkDisposeOldNotes: () => void;
  togglePinNote: (noteId: string) => void;

  // 10. Blocked Users
  addBlockedUser: (user: Omit<BlockedUser, 'id'>) => void;
  updateBlockedUser: (id: string, updates: Partial<BlockedUser>) => void;

  // State Reset
  resetToDefaultData: () => void;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      // Sidebar State
      isSidebarCollapsed: false,
      toggleSidebarCollapse: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapse: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      // Active User & RBAC
      currentUser: null as any,
      activeRoles: [],
      activeHubId: 'ALL',
      customRoles: INITIAL_ROLES,
      staffProfiles: INITIAL_PROFILES,

      toggleRole: (role) => {
        const { currentUser, activeRoles } = get();
        const isUserOwner =
          Boolean(currentUser?.roles?.some((r) => r.code === 'owner')) ||
          currentUser?.email === 'bhuvnesh3568@gmail.com' ||
          activeRoles.includes('owner');
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
      setActiveHubId: (hubId) => set({ activeHubId: hubId }),

      // Role & Staff Admin
      addCustomRole: (roleData) =>
        set((state) => {
          const newRole: Role = {
            ...roleData,
            id: `role-custom-${Date.now()}`,
          };
          return { customRoles: [...state.customRoles, newRole] };
        }),

      updateRolePermissions: (roleId, permissions) =>
        set((state) => ({
          customRoles: state.customRoles.map((r) =>
            r.id === roleId || r.code === roleId ? { ...r, permissions } : r
          ),
        })),

      addStaffProfile: (staffData) =>
        set((state) => {
          const newProfile: Profile = {
            ...staffData,
            id: `usr-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return { staffProfiles: [...state.staffProfiles, newProfile] };
        }),

      updateStaffRoles: (profileId, roleIds) =>
        set((state) => ({
          staffProfiles: state.staffProfiles.map((p) => {
            if (p.id === profileId) {
              const matchedRoles = state.customRoles.filter((r) =>
                roleIds.includes(r.id) || roleIds.includes(r.code)
              );
              return { ...p, roles: matchedRoles, updated_at: new Date().toISOString() };
            }
            return p;
          }),
        })),

      // Entities
      hubs: INITIAL_HUBS,
      vehicles: INITIAL_VEHICLES,
      inspections: [],
      parts: INITIAL_PARTS,
      hubStock: INITIAL_HUB_STOCK,
      partUsageLogs: [],
      jobCards: INITIAL_JOB_CARDS,
      refunds: INITIAL_REFUNDS,
      objectives: INITIAL_OBJECTIVES,
      tasks: INITIAL_TASKS,
      sops: INITIAL_SOPS,
      teamNotes: INITIAL_NOTES,
      blockedUsers: INITIAL_BLOCKED_USERS,
      auditLogs: INITIAL_AUDIT_LOGS,

      // ====================================================================
      // 1. REFUNDS ENGINE (Supports up to 3 decimal points)
      // ====================================================================
      createRefund: (refundData) => {
        const { refunds, auditLogs, currentUser, activeRoles } = get();
        const newId = `r-${Date.now()}`;
        const isAuthorized = activeRoles.includes('owner') || activeRoles.includes('manager');
        const initialStatus = isAuthorized ? 'VERIFIED' : 'SUBMITTED';

        const newRefund: Refund = {
          ...refundData,
          id: newId,
          amount: parseFloat(Number(refundData.amount).toFixed(3)),
          status: initialStatus,
          requested_by: currentUser.id,
          requester_name: currentUser.full_name,
          requester_role: currentUser.roles?.[0]?.label || 'Operations Manager',
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'refunds',
          record_id: newId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newRefund,
          timestamp: new Date().toISOString(),
        };

        set({
          refunds: [newRefund, ...refunds],
          auditLogs: [newAudit, ...auditLogs],
        });
        supabaseSync.pushMutation('refunds', 'insert', newRefund);
      },

      verifyRefund: (refundId, remarks) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        if (!existing) return;

        const updatedRefunds = refunds.map((r) =>
          r.id === refundId
            ? {
                ...r,
                status: 'VERIFIED' as const,
                internal_remarks: remarks || r.internal_remarks,
                updated_at: new Date().toISOString(),
              }
            : r
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'refunds',
          record_id: refundId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { status: existing.status },
          new_data: { status: 'VERIFIED', internal_remarks: remarks },
          timestamp: new Date().toISOString(),
        };

        set({ refunds: updatedRefunds, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'update', {
          id: refundId,
          status: 'VERIFIED',
          internal_remarks: remarks || existing.internal_remarks,
          updated_at: new Date().toISOString(),
        });
      },

      settleRefund: (refundId, frappeReference) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        if (!existing) return;

        const autoFrappeRef =
          frappeReference ||
          `FRAP-MUM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

        const updatedRefunds = refunds.map((r) =>
          r.id === refundId
            ? {
                ...r,
                status: 'SETTLED' as const,
                frappe_reference: autoFrappeRef,
                settled_at: new Date().toISOString(),
                settled_by_name: currentUser.full_name,
                approved_by: currentUser.id,
                updated_at: new Date().toISOString(),
              }
            : r
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'refunds',
          record_id: refundId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { status: existing.status },
          new_data: { status: 'SETTLED', frappe_reference: autoFrappeRef, settled_at: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        };

        set({ refunds: updatedRefunds, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'update', {
          id: refundId,
          status: 'SETTLED',
          frappe_reference: autoFrappeRef,
          settled_at: new Date().toISOString(),
          settled_by_name: currentUser.full_name,
          approved_by: currentUser.id,
          updated_at: new Date().toISOString(),
        });
      },

      rejectRefund: (refundId, reason) => {
        const { refunds, auditLogs, currentUser } = get();
        const existing = refunds.find((r) => r.id === refundId);
        if (!existing) return;

        const updatedRefunds = refunds.map((r) =>
          r.id === refundId
            ? {
                ...r,
                status: 'REJECTED' as const,
                rejection_reason: reason,
                updated_at: new Date().toISOString(),
              }
            : r
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'refunds',
          record_id: refundId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { status: existing.status },
          new_data: { status: 'REJECTED', rejection_reason: reason },
          timestamp: new Date().toISOString(),
        };

        set({ refunds: updatedRefunds, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('refunds', 'update', {
          id: refundId,
          status: 'REJECTED',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        });
      },

      // ====================================================================
      // 2. HUBS & CHARGER OPERATIONS
      // ====================================================================
      addHub: (hubData) => {
        const { hubs, auditLogs, currentUser } = get();
        const newId = `hub-${Date.now()}`;
        const newHub: Hub = {
          ...hubData,
          id: newId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'hubs',
          record_id: newId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newHub,
          timestamp: new Date().toISOString(),
        };

        set({ hubs: [...hubs, newHub], auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('hubs', 'insert', newHub);
      },

      updateHub: (hubId, hubData) => {
        const { hubs, auditLogs, currentUser } = get();
        const existing = hubs.find((h) => h.id === hubId);
        if (!existing) return;

        const updatedHubs = hubs.map((h) =>
          h.id === hubId
            ? { ...h, ...hubData, updated_at: new Date().toISOString() }
            : h
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'hubs',
          record_id: hubId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: existing,
          new_data: hubData,
          timestamp: new Date().toISOString(),
        };

        set({ hubs: updatedHubs, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('hubs', 'update', {
          id: hubId,
          ...hubData,
          updated_at: new Date().toISOString(),
        });
      },

      toggleChargerStatus: (hubId, portNumber, status, remarks) => {
        const { hubs, auditLogs, currentUser } = get();
        const targetHub = hubs.find((h) => h.id === hubId);
        if (!targetHub) return;

        const portKey = `P${portNumber}`;
        const existingLogs = targetHub.charger_logs || [];
        const existingLogIndex = existingLogs.findIndex((l) => l.connector_number === portKey);

        let updatedLogs = [...existingLogs];
        const newLogEntry = {
          id: `cl-${Date.now()}-${portNumber}`,
          hub_id: hubId,
          charger_name: `Charger Bay ${portNumber}`,
          connector_number: portKey,
          status,
          reported_at: new Date().toISOString(),
          reported_by: currentUser.full_name,
          remarks: remarks || undefined,
        };

        if (existingLogIndex >= 0) {
          updatedLogs[existingLogIndex] = newLogEntry;
        } else {
          updatedLogs.push(newLogEntry);
        }

        const faultyCount = updatedLogs.filter((l) => l.status !== 'ACTIVE').length;
        const activeCount = Math.max(0, targetHub.charging_points_total - faultyCount);

        const updatedHubs = hubs.map((h) =>
          h.id === hubId
            ? {
                ...h,
                charging_points_active: activeCount,
                charger_logs: updatedLogs,
                updated_at: new Date().toISOString(),
              }
            : h
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'charger_logs',
          record_id: `${hubId}-${portKey}`,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newLogEntry,
          timestamp: new Date().toISOString(),
        };

        set({ hubs: updatedHubs, auditLogs: [newAudit, ...auditLogs] });
      },

      logChargerStatus: (hubId, chargerName, connectorNumber, status, remarks) => {
        const { hubs, auditLogs, currentUser } = get();
        const targetHub = hubs.find((h) => h.id === hubId);
        if (!targetHub) return;

        const newLog = {
          id: `cl-${Date.now()}`,
          hub_id: hubId,
          charger_name: chargerName,
          connector_number: connectorNumber,
          status,
          reported_at: new Date().toISOString(),
          reported_by: currentUser.full_name,
          remarks,
        };

        const updatedHubs = hubs.map((h) => {
          if (h.id === hubId) {
            const logs = h.charger_logs || [];
            const activeDelta = status === 'ACTIVE' ? 1 : -1;
            const newActive = Math.min(
              h.charging_points_total,
              Math.max(0, h.charging_points_active + activeDelta)
            );
            return {
              ...h,
              charging_points_active: newActive,
              charger_logs: [newLog, ...logs],
              updated_at: new Date().toISOString(),
            };
          }
          return h;
        });

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'charger_logs',
          record_id: newLog.id,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newLog,
          timestamp: new Date().toISOString(),
        };

        set({ hubs: updatedHubs, auditLogs: [newAudit, ...auditLogs] });
      },

      // ====================================================================
      // 3. OBJECTIVES & TASKS ENGINE
      // ====================================================================
      createObjective: (objectiveData) => {
        const { objectives, auditLogs, currentUser } = get();
        const newId = `obj-${Date.now()}`;
        const newObj: Objective = {
          ...objectiveData,
          id: newId,
          is_completed: false,
          created_at: new Date().toISOString(),
        };

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'objectives',
          record_id: newId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newObj,
          timestamp: new Date().toISOString(),
        };

        set({ objectives: [newObj, ...objectives], auditLogs: [newAudit, ...auditLogs] });
      },

      createTask: (taskData) => {
        const { tasks, auditLogs, currentUser } = get();
        const newId = `tsk-${Date.now()}`;
        const newTask: TaskItem = {
          ...taskData,
          id: newId,
          remarks: [],
          changelog: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'tasks',
          record_id: newId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newTask,
          timestamp: new Date().toISOString(),
        };

        set({ tasks: [newTask, ...tasks], auditLogs: [newAudit, ...auditLogs] });
      },

      updateTask: (taskId, updates) => {
        const { tasks, auditLogs, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        if (!existing) return;

        const updatedTasks = tasks.map((t) =>
          t.id === taskId
            ? { ...t, ...updates, updated_at: new Date().toISOString() }
            : t
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'tasks',
          record_id: taskId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: existing,
          new_data: updates,
          timestamp: new Date().toISOString(),
        };

        set({ tasks: updatedTasks, auditLogs: [newAudit, ...auditLogs] });
      },

      updateTaskStatus: (taskId, status) => {
        const { tasks, auditLogs, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        if (!existing) return;

        const changelogEntry = {
          id: `chg-${Date.now()}`,
          task_id: taskId,
          changed_by: currentUser.id,
          performer_name: currentUser.full_name,
          field_changed: 'status',
          old_value: existing.status,
          new_value: status,
          changed_at: new Date().toISOString(),
        };

        const updatedTasks = tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status,
                completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
                changelog: [changelogEntry, ...(t.changelog || [])],
                updated_at: new Date().toISOString(),
              }
            : t
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'tasks',
          record_id: taskId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { status: existing.status },
          new_data: { status },
          timestamp: new Date().toISOString(),
        };

        set({ tasks: updatedTasks, auditLogs: [newAudit, ...auditLogs] });
      },

      addTaskRemark: (taskId, comment) => {
        const { tasks, currentUser } = get();
        const newRemark = {
          id: `rem-${Date.now()}`,
          task_id: taskId,
          author_id: currentUser.id,
          author_name: currentUser.full_name,
          author_role: currentUser.roles?.[0]?.label,
          comment,
          created_at: new Date().toISOString(),
        };

        const updatedTasks = tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                remarks: [...(t.remarks || []), newRemark],
                updated_at: new Date().toISOString(),
              }
            : t
        );

        set({ tasks: updatedTasks });
      },

      updateTaskAssignees: (taskId, assigneeIds) => {
        const { tasks, currentUser } = get();
        const existing = tasks.find((t) => t.id === taskId);
        if (!existing) return;

        const changelogEntry = {
          id: `chg-${Date.now()}`,
          task_id: taskId,
          changed_by: currentUser.id,
          performer_name: currentUser.full_name,
          field_changed: 'assigned_to',
          old_value: existing.assigned_to.join(', '),
          new_value: assigneeIds.join(', '),
          changed_at: new Date().toISOString(),
        };

        const updatedTasks = tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                assigned_to: assigneeIds,
                changelog: [changelogEntry, ...(t.changelog || [])],
                updated_at: new Date().toISOString(),
              }
            : t
        );

        set({ tasks: updatedTasks });
      },

      updateTaskDates: (taskId, startDate, dueDate) => {
        const { tasks } = get();
        const updatedTasks = tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                start_date: startDate !== undefined ? startDate : t.start_date,
                due_date: dueDate !== undefined ? dueDate : t.due_date,
                updated_at: new Date().toISOString(),
              }
            : t
        );
        set({ tasks: updatedTasks });
      },

      // ====================================================================
      // 4 & 5. VEHICLE MUTATIONS, EDIT & RAPID INSPECTIONS
      // ====================================================================
      updateVehicle: (vehicleId, vehicleData) => {
        const { vehicles, auditLogs, currentUser } = get();
        const existing = vehicles.find((v) => v.id === vehicleId);
        if (!existing) return;

        const updatedVehicles = vehicles.map((v) =>
          v.id === vehicleId
            ? { ...v, ...vehicleData, updated_at: new Date().toISOString() }
            : v
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'vehicles',
          record_id: vehicleId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: existing,
          new_data: vehicleData,
          timestamp: new Date().toISOString(),
        };

        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
        supabaseSync.pushMutation('vehicles', 'update', {
          id: vehicleId,
          ...vehicleData,
          updated_at: new Date().toISOString(),
        });
      },

      requestVehicleStatus: (vehicleId, pendingStatus, reason, forceImmediate) => {
        const { vehicles, auditLogs, currentUser, activeRoles } = get();
        const isAuthorized = activeRoles.includes('owner') || activeRoles.includes('manager');
        const shouldBypass = Boolean(forceImmediate && isAuthorized);

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

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'vehicles',
          record_id: vehicleId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: {
            current_status: shouldBypass ? pendingStatus : undefined,
            pending_status: shouldBypass ? null : pendingStatus,
            status_change_reason: reason,
          },
          timestamp: new Date().toISOString(),
        };

        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
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

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'vehicles',
          record_id: vehicleId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { current_status: vehicle.current_status, pending_status: vehicle.pending_status },
          new_data: { current_status: vehicle.pending_status, pending_status: null },
          timestamp: new Date().toISOString(),
        };

        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
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

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'vehicles',
          record_id: vehicleId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { pending_status: vehicle.pending_status },
          new_data: { pending_status: null },
          timestamp: new Date().toISOString(),
        };

        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
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

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'vehicles',
          record_id: vehicleId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { vehicle_id: oldIotId },
          new_data: { vehicle_id: newIotId, reason },
          timestamp: new Date().toISOString(),
        };

        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
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
              last_odometer_updated_by: currentUser.id,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'vehicles',
          record_id: vehicleId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { odometer_km: oldOdo },
          new_data: { odometer_km: odometerKm },
          timestamp: new Date().toISOString(),
        };

        set({ vehicles: updatedVehicles, auditLogs: [newAudit, ...auditLogs] });
      },

      logInspection: (inspectionData) => {
        const { inspections, vehicles, auditLogs, currentUser, activeRoles } = get();
        const newId = `insp-${Date.now()}`;
        const isAuthorized = activeRoles.includes('owner') || activeRoles.includes('manager');

        const newInspection: VehicleInspection = {
          ...inspectionData,
          id: newId,
          inspector_id: currentUser.id,
          inspector_name: currentUser.full_name,
          inspected_at: new Date().toISOString(),
        };

        const updatedVehicles = vehicles.map((v) => {
          if (v.id === inspectionData.vehicle_id) {
            return {
              ...v,
              odometer_km: inspectionData.odometer_km,
              last_odometer_updated_at: new Date().toISOString(),
              last_odometer_updated_by: currentUser.id,
              last_inspected_at: new Date().toISOString(),
              last_inspected_by: currentUser.full_name,
              current_status: isAuthorized ? inspectionData.recommended_status : v.current_status,
              pending_status: isAuthorized ? null : inspectionData.recommended_status,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'inspections',
          record_id: newId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newInspection,
          timestamp: new Date().toISOString(),
        };

        set({
          inspections: [newInspection, ...inspections],
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
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
          created_at: new Date().toISOString(),
        };

        // All stock is held exclusively in "Store 1"
        const initialStockEntry: HubPartStock = {
          id: `hs-store1-${newPartId}`,
          hub_id: 'hub-store-01',
          part_id: newPartId,
          physical_stock: 0,
          pending_allocated_stock: 0,
          min_threshold: partData.min_threshold || 5,
          updated_at: new Date().toISOString(),
        };

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'parts',
          record_id: newPartId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newPart,
          timestamp: new Date().toISOString(),
        };

        set({
          parts: [...parts, newPart],
          hubStock: [...hubStock, initialStockEntry],
          auditLogs: [newAudit, ...auditLogs],
        });
      },

      updatePart: (partId, partData) => {
        const { parts, auditLogs, currentUser } = get();
        const existing = parts.find((p) => p.id === partId);
        if (!existing) return;

        const updatedParts = parts.map((p) =>
          p.id === partId ? { ...p, ...partData } : p
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'parts',
          record_id: partId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: existing,
          new_data: partData,
          timestamp: new Date().toISOString(),
        };

        set({ parts: updatedParts, auditLogs: [newAudit, ...auditLogs] });
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
          used_by_id: currentUser.id,
          used_by_name: currentUser.full_name,
          recipient_name: recipientName,
          reason,
          created_at: new Date().toISOString(),
        };

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'part_usage_logs',
          record_id: newUsageLog.id,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { physical_stock: store1Stock.physical_stock },
          new_data: { physical_stock: Math.max(0, store1Stock.physical_stock - quantity), usage: newUsageLog },
          timestamp: new Date().toISOString(),
        };

        set({
          hubStock: updatedStock,
          partUsageLogs: [newUsageLog, ...partUsageLogs],
          auditLogs: [newAudit, ...auditLogs],
        });
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
            updated_at: new Date().toISOString(),
          };
          updatedStock = [...hubStock, newEntry];
        }

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'hub_part_stock',
          record_id: `${targetHubId}-${partId}`,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { physical_stock: stock?.physical_stock ?? 0 },
          new_data: { physical_stock: newPhysicalStock, reason },
          timestamp: new Date().toISOString(),
        };

        set({ hubStock: updatedStock, auditLogs: [newAudit, ...auditLogs] });
      },

      // ====================================================================
      // 7. JOB CARDS ENGINE
      // ====================================================================
      createJobCard: (cardData, partsList, forceImmediateApproval) => {
        const { jobCards, parts, hubStock, vehicles, auditLogs, currentUser, activeRoles } = get();
        const isAuthorized =
          (activeRoles.includes('owner') || activeRoles.includes('manager')) &&
          Boolean(forceImmediateApproval);

        const newJobCardId = `job-${Date.now()}`;
        const newTicketNumber = jobCards.length > 0 ? Math.max(...jobCards.map((j) => j.ticket_number)) + 1 : 101;
        const initialStatus = isAuthorized ? 'APPROVED' : 'PENDING';

        const builtParts = (partsList || []).map((p, idx) => {
          const partDef = parts.find((item) => item.id === p.part_id);
          return {
            id: `jcp-${Date.now()}-${idx}`,
            job_card_id: newJobCardId,
            part_id: p.part_id,
            quantity: p.quantity,
            unit_cost_snapshot: partDef?.unit_cost || 0,
            is_approved: isAuthorized,
            created_at: new Date().toISOString(),
          };
        });

        const newJobCard: JobCard = {
          ...cardData,
          id: newJobCardId,
          ticket_number: newTicketNumber,
          status: initialStatus,
          approved_by: isAuthorized ? currentUser.id : null,
          approved_at: isAuthorized ? new Date().toISOString() : null,
          approval_notes: isAuthorized ? 'Self-approved upon ticket creation by authorized manager' : null,
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
              last_odometer_updated_by: cardData.odometer_km ? currentUser.id : v.last_odometer_updated_by,
              current_status: isAuthorized ? ('Available' as const) : v.current_status,
              pending_status: isAuthorized ? null : ('Under Repair' as const),
              status_change_reason: isAuthorized ? null : cardData.issue_description,
              updated_at: new Date().toISOString(),
            };
          }
          return v;
        });

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'job_cards',
          record_id: newJobCardId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: {
            ticket_number: newTicketNumber,
            vehicle_id: cardData.vehicle_id,
            status: initialStatus,
          },
          timestamp: new Date().toISOString(),
        };

        set({
          jobCards: [newJobCard, ...jobCards],
          hubStock: updatedStock,
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
      },

      updateJobCard: (jobCardId, updates) => {
        const { jobCards, auditLogs, currentUser } = get();
        const existing = jobCards.find((j) => j.id === jobCardId);
        if (!existing) return;

        const updatedJobCards = jobCards.map((j) =>
          j.id === jobCardId ? { ...j, ...updates } : j
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'job_cards',
          record_id: jobCardId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: existing,
          new_data: updates,
          timestamp: new Date().toISOString(),
        };

        set({ jobCards: updatedJobCards, auditLogs: [newAudit, ...auditLogs] });
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
              approved_by: currentUser.id,
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

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'job_cards',
          record_id: jobCardId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { status: 'PENDING' },
          new_data: { status: 'APPROVED', approval_notes: approvalNotes },
          timestamp: new Date().toISOString(),
        };

        set({
          jobCards: updatedJobCards,
          hubStock: updatedStock,
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
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
              approved_by: currentUser.id,
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

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'job_cards',
          record_id: jobCardId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { status: 'PENDING' },
          new_data: { status: 'REJECTED', rejection_notes: rejectionNotes },
          timestamp: new Date().toISOString(),
        };

        set({
          jobCards: updatedJobCards,
          hubStock: updatedStock,
          vehicles: updatedVehicles,
          auditLogs: [newAudit, ...auditLogs],
        });
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
          acknowledged_by: [currentUser.id],
          revisions: [
            {
              version: '1.0',
              updated_at: new Date().toISOString(),
              updated_by_name: currentUser.full_name,
              change_summary: 'Initial document creation',
              content: sopData.content,
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'sops',
          record_id: newId,
          action: 'INSERT',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: null,
          new_data: newSOP,
          timestamp: new Date().toISOString(),
        };

        set({ sops: [newSOP, ...sops], auditLogs: [newAudit, ...auditLogs] });
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
          updated_by_name: currentUser.full_name,
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

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'sops',
          record_id: sopId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { version: existing.version },
          new_data: { version: nextVersion, changeSummary },
          timestamp: new Date().toISOString(),
        };

        set({ sops: updatedSOPs, auditLogs: [newAudit, ...auditLogs] });
      },

      publishSOP: (sopId) => {
        const { sops, auditLogs, currentUser } = get();
        const updatedSOPs = sops.map((s) =>
          s.id === sopId
            ? { ...s, status: 'PUBLISHED' as const, updated_at: new Date().toISOString() }
            : s
        );

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'sops',
          record_id: sopId,
          action: 'UPDATE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: { status: 'DRAFT' },
          new_data: { status: 'PUBLISHED' },
          timestamp: new Date().toISOString(),
        };

        set({ sops: updatedSOPs, auditLogs: [newAudit, ...auditLogs] });
      },

      acknowledgeSOP: (sopId, profileId) => {
        const { sops, currentUser } = get();
        const targetId = profileId || currentUser.id;

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
      },

      deleteSOP: (sopId) => {
        const { sops, auditLogs, currentUser } = get();
        const existing = sops.find((s) => s.id === sopId);
        if (!existing) return;

        const updatedSOPs = sops.filter((s) => s.id !== sopId);

        const newAudit: AuditLog = {
          id: `audit-${Date.now()}`,
          table_name: 'sops',
          record_id: sopId,
          action: 'SOFT_DELETE',
          performed_by: currentUser.id,
          performer_name: currentUser.full_name,
          old_data: existing,
          new_data: null,
          timestamp: new Date().toISOString(),
        };

        set({ sops: updatedSOPs, auditLogs: [newAudit, ...auditLogs] });
      },

      // ====================================================================
      // 9. TEAM NOTES & SCRATCHPAD WITH DISPOSAL LIFECYCLE
      // ====================================================================
      createNote: (noteData) => {
        const { teamNotes, currentUser } = get();
        const newId = `note-${Date.now()}`;
        const newNote: TeamNote = {
          ...noteData,
          id: newId,
          status: 'ACTIVE',
          author_id: currentUser.id,
          author_name: currentUser.full_name,
          author_role: currentUser.roles?.[0]?.label || 'Operations Staff',
          resolved_at: null,
          resolved_by_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ teamNotes: [newNote, ...teamNotes] });
        supabaseSync.pushMutation('team_notes', 'insert', newNote);
      },

      updateNote: (noteId, noteData) => {
        const { teamNotes } = get();
        const updatedNotes = teamNotes.map((n) =>
          n.id === noteId
            ? { ...n, ...noteData, updated_at: new Date().toISOString() }
            : n
        );
        set({ teamNotes: updatedNotes });
        supabaseSync.pushMutation('team_notes', 'update', {
          id: noteId,
          ...noteData,
          updated_at: new Date().toISOString(),
        });
      },

      archiveNote: (noteId) => {
        const { teamNotes } = get();
        const updated = teamNotes.map((n) =>
          n.id === noteId ? { ...n, status: 'ARCHIVED' as const, is_pinned: false, updated_at: new Date().toISOString() } : n
        );
        set({ teamNotes: updated });
        supabaseSync.pushMutation('team_notes', 'update', {
          id: noteId,
          status: 'ARCHIVED',
          is_pinned: false,
          updated_at: new Date().toISOString(),
        });
      },

      resolveNote: (noteId) => {
        const { teamNotes, currentUser } = get();
        const updated = teamNotes.map((n) =>
          n.id === noteId
            ? {
                ...n,
                status: 'RESOLVED' as const,
                is_pinned: false,
                resolved_at: new Date().toISOString(),
                resolved_by_name: currentUser.full_name,
                updated_at: new Date().toISOString(),
              }
            : n
        );
        set({ teamNotes: updated });
        supabaseSync.pushMutation('team_notes', 'update', {
          id: noteId,
          status: 'RESOLVED',
          is_pinned: false,
          resolved_at: new Date().toISOString(),
          resolved_by_name: currentUser.full_name,
          updated_at: new Date().toISOString(),
        });
      },

      restoreNote: (noteId) => {
        const { teamNotes } = get();
        const updated = teamNotes.map((n) =>
          n.id === noteId ? { ...n, status: 'ACTIVE' as const, updated_at: new Date().toISOString() } : n
        );
        set({ teamNotes: updated });
        supabaseSync.pushMutation('team_notes', 'update', {
          id: noteId,
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
        });
      },

      deleteNote: (noteId) => {
        const { teamNotes } = get();
        set({ teamNotes: teamNotes.filter((n) => n.id !== noteId) });
        supabaseSync.pushMutation('team_notes', 'delete', { id: noteId });
      },

      bulkDisposeOldNotes: () => {
        const { teamNotes } = get();
        // Remove notes that are RESOLVED or ARCHIVED
        set({ teamNotes: teamNotes.filter((n) => n.status === 'ACTIVE') });
      },

      togglePinNote: (noteId) => {
        const { teamNotes } = get();
        const updatedNotes = teamNotes.map((n) =>
          n.id === noteId ? { ...n, is_pinned: !n.is_pinned, updated_at: new Date().toISOString() } : n
        );
        set({ teamNotes: updatedNotes });
      },

      // ====================================================================
      // 10. BLOCKED USERS
      // ====================================================================
      addBlockedUser: (userData) => {
        const { blockedUsers } = get();
        const newId = `blk-${Date.now()}`;
        const newBlocked: BlockedUser = {
          ...userData,
          id: newId,
        };
        set({ blockedUsers: [newBlocked, ...blockedUsers] });
        supabaseSync.pushMutation('blocked_users', 'insert', newBlocked);
      },

      updateBlockedUser: (id, updates) => {
        const { blockedUsers } = get();
        const updated = blockedUsers.map((b) => (b.id === id ? { ...b, ...updates } : b));
        set({ blockedUsers: updated });
        supabaseSync.pushMutation('blocked_users', 'update', { id, ...updates });
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
          tasks: INITIAL_TASKS,
          sops: INITIAL_SOPS,
          teamNotes: INITIAL_NOTES,
          blockedUsers: INITIAL_BLOCKED_USERS,
          auditLogs: INITIAL_AUDIT_LOGS,
          customRoles: INITIAL_ROLES,
          staffProfiles: INITIAL_PROFILES,
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
        tasks: state.tasks,
        sops: state.sops,
        teamNotes: state.teamNotes,
        blockedUsers: state.blockedUsers,
        auditLogs: state.auditLogs,
      }),
    }
  )
);
