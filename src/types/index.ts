export type RoleCode = 'owner' | 'manager' | 'rsa' | 'mechanic' | string;

export type PermissionKey =
  | 'vehicle:view'
  | 'vehicle:request_state'
  | 'vehicle:approve_state'
  | 'vehicle:reassign_iot'
  | 'vehicle:edit'
  | 'job:create'
  | 'job:complete'
  | 'job:approve'
  | 'job:edit'
  | 'inventory:request'
  | 'inventory:approve'
  | 'part:edit'
  | 'refund:create'
  | 'refund:approve'
  | 'task:manage'
  | 'task:execute'
  | 'task:edit'
  | 'roles:manage'
  | 'role:switch'
  | 'hubs:manage'
  | 'hub:edit'
  | 'sops:manage'
  | 'notes:manage'
  | 'data:view_all';

export type VehicleStatus =
  | 'Available'
  | 'Needs Maintenance'
  | 'Under Repair'
  | 'Not Available';

export type ScooterModel = 'CS Model' | 'Ola Model' | 'Single Light Model';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RefundPayoutType = 'EzEv Wallet' | 'Bank Payout';

export type RefundStatus = 'SUBMITTED' | 'VERIFIED' | 'SETTLED' | 'REJECTED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'ABANDONED';

export type HubType = 'BIKE_HUB' | 'STOCK_HUB';

export type ChargerStatus =
  | 'ACTIVE'
  | 'CONNECTOR_NOT_WORKING'
  | 'CONNECTOR_DAMAGED'
  | 'CHARGER_DAMAGED'
  | 'POWER_LINE_ISSUE'
  | 'OFFLINE_TRIPPED';

export interface ChargerLog {
  id: string;
  hub_id: string;
  charger_name: string;
  connector_number?: string;
  status: ChargerStatus;
  reported_at: string;
  reported_by: string;
  remarks?: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  phone: string; // Indian format +91-XXXXX-XXXXX
  avatar_url?: string;
  assigned_hub_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles?: Role[];
}

export interface Role {
  id: string;
  code: RoleCode;
  label: string;
  description?: string;
  permissions?: PermissionKey[];
  is_system?: boolean;
}

export interface Permission {
  id: string;
  code: PermissionKey;
  module: string;
  label?: string;
  description?: string;
}

export interface Hub {
  id: string;
  name: string;
  code: string;
  type: HubType;
  address: string;
  city: string;
  poc_name: string;
  poc_phone: string;
  day_guard_name?: string;
  day_guard_phone?: string;
  night_guard_name?: string;
  night_guard_phone?: string;
  day_guard_details?: string;
  night_guard_details?: string;
  charging_points_total: number;
  charging_points_active: number;
  charger_logs?: ChargerLog[];
  is_active: boolean;
  is_warehouse?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleInspection {
  id: string;
  vehicle_id: string;
  hub_id: string;
  inspector_id: string;
  inspector_name: string;
  odometer_km: number;
  brakes_passed: boolean;
  throttle_passed: boolean;
  tyres_passed: boolean;
  lights_passed: boolean;
  stand_sensor_passed: boolean;
  bms_health_passed: boolean;
  recommended_status: VehicleStatus;
  notes?: string;
  inspected_at: string;
}

export interface Vehicle {
  id: string;
  custom_vehicle_id?: string; // Editable Vehicle ID (e.g. 'VEH/01' or 'veh-01')
  vehicle_id: string; // 14-15 digit numerical string (IoT IMEI/ID, e.g., '860141073062442')
  vin: string; // Chassis/VIN string (e.g. 'MD625CK192847101')
  key_number: string; // 4-digit alphanumeric code (e.g. 'B001', 'K104')
  model: ScooterModel; // 'CS Model' | 'Ola Model' | 'Single Light Model'
  current_hub_id: string;
  current_status: VehicleStatus;
  pending_status: VehicleStatus | null;
  status_change_reason: string | null;
  odometer_km: number | null; // Only updated when someone logs distance or inspection
  last_odometer_updated_at: string | null;
  last_odometer_updated_by: string | null;
  last_inspected_at?: string | null;
  last_inspected_by?: string | null;
  total_maintenance_spend?: number; // Total cumulative maintenance spend in INR
  active_days_count?: number; // Active days over rolling 30-day window (e.g. 23)
  uptime_percentage?: number; // Calculated availability score (e.g. 76.6)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hub?: Hub;
}

export interface PartInventory {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  unit_cost: number; // in INR (₹)
  min_threshold?: number;
  supplier?: string;
  is_active: boolean;
  created_at: string;
}

export interface PartUsageLog {
  id: string;
  part_id: string;
  hub_id: string;
  vehicle_id?: string | null;
  quantity: number;
  used_by_id: string;
  used_by_name: string;
  recipient_name?: string;
  reason: string;
  created_at: string;
  part?: PartInventory;
}

export interface HubPartStock {
  id: string;
  hub_id: string;
  part_id: string;
  physical_stock: number;
  pending_allocated_stock: number;
  min_threshold: number;
  updated_at: string;
  part?: PartInventory;
  hub?: Hub;
}

export interface JobCardPart {
  id: string;
  job_card_id: string;
  part_id: string;
  quantity: number;
  unit_cost_snapshot: number;
  is_approved: boolean;
  created_at: string;
  part?: PartInventory;
}

export interface JobCard {
  id: string;
  ticket_number: number;
  vehicle_id: string;
  reported_by: string;
  assigned_mechanic_id: string;
  hub_id: string;
  odometer_km?: number | null;
  issue_description: string;
  solution_applied?: string | null;
  photos_url?: string[];
  status: ApprovalStatus;
  approved_by?: string | null;
  approval_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
  approved_at?: string | null;
  vehicle?: Vehicle;
  reporter?: Profile;
  mechanic?: Profile;
  approver?: Profile;
  hub?: Hub;
  parts?: JobCardPart[];
}

export interface Refund {
  id: string;
  user_phone: string;
  ride_id: string;
  ride_date: string;
  amount: number; // in INR (₹), supports up to 3 decimal digits
  payout_type: RefundPayoutType; // 'EzEv Wallet' | 'Bank Payout'
  reason: string;
  internal_remarks?: string | null;
  frappe_reference?: string | null;
  status: RefundStatus;
  requested_by: string;
  requester_name: string;
  requester_role: string;
  approved_by?: string | null;
  settled_at?: string | null;
  settled_by_name?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  approver?: Profile;
}

export interface TaskRemark {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  author_role?: string;
  comment: string;
  created_at: string;
}

export interface TaskChangelogEntry {
  id: string;
  task_id: string;
  changed_by: string;
  performer_name: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_at: string;
}

export interface Milestone {
  id: string;
  objective_id: string;
  title: string;
  description?: string;
  target_date?: string;
  is_completed: boolean;
  order_index?: number;
  created_at?: string;
}

export interface TaskAttachment {
  id: string;
  file_name: string;
  file_url: string; // Data URI, file path, or object storage URL
  file_size_kb?: number;
  file_type?: string;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  start_date?: string;
  target_date: string;
  hub_id: string;
  created_by: string;
  is_completed: boolean;
  milestones?: Milestone[];
  remarks?: TaskRemark[];
  created_at: string;
  hub?: Hub;
  creator?: Profile;
  tasks?: TaskItem[];
}

export interface TaskItem {
  id: string;
  objective_id: string;
  milestone_id?: string | null;
  title: string;
  description?: string;
  assigned_to: string[];
  priority: TaskPriority;
  status: TaskStatus;
  vehicle_scope?: 'ALL' | 'SPECIFIC' | 'NONE';
  vehicle_id?: string | null; // Primary vehicle if single
  vehicle_ids?: string[]; // Multi-vehicle association
  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  created_by: string;
  attachments?: TaskAttachment[];
  remarks?: TaskRemark[];
  changelog?: TaskChangelogEntry[];
  created_at: string;
  updated_at: string;
  assignees?: Profile[];
  vehicle?: Vehicle;
  objective?: Objective;
  milestone?: Milestone;
}

// ====================================================================
// DAILY WORK LOG / SHIFT LOG MODEL (8.1)
// ====================================================================
export type ShiftType = 'MORNING' | 'EVENING' | 'NIGHT' | 'GENERAL';

export interface DailyShiftLog {
  id: string;
  date: string; // YYYY-MM-DD
  shift_type: ShiftType;
  hub_id: string;
  staff_name: string;
  staff_role: string;
  accomplishments: string;
  vehicles_serviced: number;
  customer_issues_resolved: number;
  blockers?: string;
  handover_notes?: string;
  created_at: string;
  updated_at?: string;
}

// ====================================================================
// ROLE-BASED GROUP COMMUNICATIONS MODEL (8.2)
// ====================================================================
export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  is_system?: boolean; // true for Operations, Mechanics, Accounts
  is_private?: boolean;
  allowed_roles?: string[];
  created_by?: string;
  created_at: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_avatar?: string;
  message: string;
  attachments?: { name: string; url: string; type: string }[];
  created_at: string;
}

// ====================================================================
// STANDARD OPERATING PROCEDURES (SOP) MODEL
// ====================================================================
export type SOPStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface SOPRevision {
  version: string;
  updated_at: string;
  updated_by_name: string;
  change_summary: string;
  content: string;
}

export interface SOP {
  id: string;
  code: string;
  title: string;
  category: string;
  version: string;
  status: SOPStatus;
  content: string; // Markdown / step-by-step instructions
  summary: string;
  author_id: string;
  author_name: string;
  access_roles: string[]; // e.g. ['owner', 'manager', 'rsa', 'mechanic']
  view_count: number;
  acknowledged_by: string[]; // Array of Profile IDs who have acknowledged reading
  revisions: SOPRevision[];
  created_at: string;
  updated_at: string;
}

// ====================================================================
// TEAM NOTES / SCRATCHPAD MODEL WITH DISPOSAL LIFECYCLE
// ====================================================================
export type NoteCategory =
  | 'GENERAL'
  | 'SHIFT_HANDOVER'
  | 'URGENT'
  | 'HUB_NOTICE'
  | 'MECHANICAL'
  | 'ROUGH';

export type NoteStatus = 'ACTIVE' | 'ARCHIVED' | 'RESOLVED';

export interface TeamNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  status: NoteStatus;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  tags?: string[];
  hub_id?: string | null;
  is_pinned: boolean;
  author_id: string;
  author_name: string;
  author_role: string;
  resolved_at?: string | null;
  resolved_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// BLOCKED USERS & RECOVERY MODEL
// ====================================================================
export type RecoveryStatus = 'Pending' | 'Recovered';

export interface BlockedUser {
  id: string;
  employee_name: string;
  date: string;
  user_email: string;
  user_name: string;
  phone: string;
  vehicle_no: string;
  reason: string;
  recovery_status: RecoveryStatus;
  recovery_amount: number;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'SOFT_DELETE' | 'DELETE_ATTEMPT';
  performed_by?: string | null;
  performer_name?: string | null;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  timestamp: string;
}
