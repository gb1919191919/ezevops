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
  Permission,
  SOP,
  TeamNote,
  BlockedUser,
  VehicleInspection,
  PartUsageLog,
} from '@/types';
import { INITIAL_PERMISSIONS_LIST } from '@/lib/rbac';

export const INITIAL_ROLES: Role[] = [
  { id: 'role-01', code: 'owner', label: 'Super Admin (Owner)', description: 'Full system sovereignty, master audits, and financial oversight', is_system: true },
  { id: 'role-02', code: 'manager', label: 'Hub Operations Manager', description: 'Approvals, hub inventory, staff scheduling, dispute verification', is_system: true },
  { id: 'role-03', code: 'rsa', label: 'Roadside Assistance (RSA)', description: 'Rapid field inspection, towing, roadside recovery, battery sweeps', is_system: true },
  { id: 'role-04', code: 'mechanic', label: 'Hub Maintenance Mechanic', description: 'Job tickets, defect inspections, part requests, safety audits', is_system: true },
];

export const INITIAL_PERMISSIONS: Permission[] = INITIAL_PERMISSIONS_LIST.map((p, idx) => ({
  id: `perm-${String(idx + 1).padStart(2, '0')}`,
  code: p.code,
  module: p.module,
  label: p.label,
  description: p.description,
}));

// ====================================================================
// 1. REAL TEAM MEMBERS (added_data/Team.xlsx)
// ====================================================================
export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'usr-01',
    email: 'bhuvnesh3568@gmail.com',
    full_name: 'Bhuvnesh Kumar',
    phone: '+91 70560 55476',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    roles: [INITIAL_ROLES[0]], // Super Admin (Owner)
  },
  {
    id: 'usr-02',
    email: 'yugdeep@ezev.in',
    full_name: 'Yugdeep Handa',
    phone: '+91 82981 47755',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    roles: [INITIAL_ROLES[0], INITIAL_ROLES[1]], // Super Admin / Operations
  },
  {
    id: 'usr-03',
    email: 'zaffar.patel@ezev.in',
    full_name: 'Zaffar Patel',
    phone: '+91 96198 56561',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120',
    assigned_hub_id: 'hub-mum-09',
    is_active: true,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    roles: [INITIAL_ROLES[1], INITIAL_ROLES[2]], // Operations Manager & RSA Lead
  },
  {
    id: 'usr-04',
    email: 'ashish.vaishya@ezev.in',
    full_name: 'Ashish Vaishya',
    phone: '+91 82866 45521',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
    assigned_hub_id: 'hub-mum-09',
    is_active: true,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    roles: [INITIAL_ROLES[1], INITIAL_ROLES[2]], // Operations Manager & Field Triage
  },
  {
    id: 'usr-05',
    email: 'ankita.gangwani@ezev.in',
    full_name: 'Ankita Gangwani',
    phone: '+91 90502 19307',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
    is_active: true,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    roles: [INITIAL_ROLES[1]], // Accounts & Refunds Manager
  },
  {
    id: 'usr-06',
    email: 'rajkumar.mandal@ezev.in',
    full_name: 'Rajkumar Mandal',
    phone: '+91 62392 49085',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120',
    assigned_hub_id: 'hub-store-01',
    is_active: true,
    created_at: '2026-02-05T00:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    roles: [INITIAL_ROLES[2], INITIAL_ROLES[3]], // RSA & Chief Field Mechanic
  },
  {
    id: 'usr-07',
    email: 'ritik.mandal@ezev.in',
    full_name: 'Ritik Mandal',
    phone: '+91 77398 74590',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120',
    assigned_hub_id: 'hub-store-01',
    is_active: true,
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    roles: [INITIAL_ROLES[2], INITIAL_ROLES[3]], // RSA Field Specialist
  },
];

// ====================================================================
// 2. REAL MUMBAI HUBS & CENTRAL WAREHOUSE "STORE 1"
// ====================================================================
export const INITIAL_HUBS: Hub[] = [
  {
    id: 'hub-store-01',
    name: 'Store 1',
    code: 'STORE-01',
    type: 'STOCK_HUB', // SINGLE Central Spare Parts Warehouse for the entire fleet
    city: 'Mumbai',
    address: 'Central Spare Parts Warehouse, 24th Avenue, Shree Ram Nagar, Andheri West, Mumbai - 400058',
    poc_name: 'Rajkumar Mandal / Ritik Mandal',
    poc_phone: '+91 62392 49085',
    day_guard_name: 'Jayash',
    day_guard_phone: '+91 91373 96039',
    night_guard_name: 'Mangesh',
    night_guard_phone: '+91 98213 24903',
    charging_points_total: 16,
    charging_points_active: 16,
    is_warehouse: true,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-01',
    name: 'Della By Hive',
    code: 'HUB-MUM-DEL',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Bhagatsingh Rd, Navpada, Kamala, Vile Parle West, Mumbai - 400056',
    poc_name: 'Somnath / Shirin / Siddhant',
    poc_phone: '+91 89205 12687',
    day_guard_name: 'Uma Shankar / Abdul',
    day_guard_phone: '+91 98673 25140',
    night_guard_name: 'Santosh Tiwari',
    night_guard_phone: '+91 91270 92767',
    charging_points_total: 12,
    charging_points_active: 12,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-02',
    name: 'Aster By Hive',
    code: 'HUB-MUM-AST',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: '5, N S Rd No. 5, Vallabh Nagar Society, Juhu, Mumbai - 400056',
    poc_name: 'Komal Negi',
    poc_phone: '+91 77150 24068',
    day_guard_name: 'Nadim / Santosh',
    day_guard_phone: '+91 88795 85795',
    night_guard_name: 'Shradda',
    night_guard_phone: '+91 84510 34561',
    charging_points_total: 8,
    charging_points_active: 0,
    charger_logs: [
      {
        id: 'cl-ast-01',
        hub_id: 'hub-mum-02',
        charger_name: 'Main Supply Board',
        connector_number: 'All Connectors',
        status: 'OFFLINE_TRIPPED',
        reported_at: '2026-08-26T18:00:00Z',
        reported_by: 'Komal Negi',
        remarks: 'Main supply switchboard tripped during rain',
      },
    ],
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-03',
    name: 'Oblik by Livlit',
    code: 'HUB-MUM-OBL',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Near Juhu Circle, Vile Parle West, Mumbai - 400056',
    poc_name: 'Naaz',
    poc_phone: '+91 85911 88225',
    day_guard_name: 'Shashank / Sarvesh',
    day_guard_phone: '+91 99563 86214',
    night_guard_name: 'Shashank',
    night_guard_phone: '+91 99563 86214',
    charging_points_total: 8,
    charging_points_active: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-04',
    name: 'H Square Bay',
    code: 'HUB-MUM-HSB',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Bay Area, Juhu Tara Road, Mumbai - 400049',
    poc_name: 'Deepa / Aditi',
    poc_phone: '+91 83569 95024',
    day_guard_name: 'Jitendar',
    day_guard_phone: '+91 98894 04089',
    night_guard_name: 'Rakesh',
    night_guard_phone: '+91 98000 85638',
    charging_points_total: 10,
    charging_points_active: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-05',
    name: 'H Square Juhu',
    code: 'HUB-MUM-HSJ',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Juhu Jawa Showroom, Juhu, Mumbai - 400049',
    poc_name: 'Jagdish (Manager)',
    poc_phone: '+91 89280 53977',
    day_guard_name: 'Ashok',
    day_guard_phone: '+91 84607 03880',
    night_guard_name: 'Shahin',
    night_guard_phone: '+91 80974 34606',
    charging_points_total: 10,
    charging_points_active: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-06',
    name: 'Hive Aurus Chapter 2',
    code: 'HUB-MUM-AUR2',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Shree Mangal Corp, S. Ponda Rd, Vile Parle, Mumbai - 400056',
    poc_name: "Chanchal Ma'am",
    poc_phone: '+91 90046 76110',
    day_guard_name: 'Radhika',
    day_guard_phone: '+91 98191 48272',
    night_guard_name: 'Mumtaz',
    night_guard_phone: '+91 89288 97182',
    charging_points_total: 12,
    charging_points_active: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-08',
    name: 'Hive Aurus Chapter 4',
    code: 'HUB-MUM-AUR4',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Link Road Extension, Andheri West, Mumbai - 400058',
    poc_name: 'Subham / Abhishek',
    poc_phone: '+91 91247 96463',
    day_guard_name: 'Ritesh',
    day_guard_phone: '+91 91373 96040',
    night_guard_name: 'Manoj',
    night_guard_phone: '+91 98213 24904',
    charging_points_total: 10,
    charging_points_active: 10,
    is_active: true,
    created_at: '2026-01-05T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-09',
    name: 'NMIMS Back Gate',
    code: 'HUB-MUM-NMI',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'NMIMS University Back Gate, V.L. Mehta Road, Vile Parle West, Mumbai - 400056',
    poc_name: 'Zaffar / Ashish',
    poc_phone: '+91 96198 56561',
    day_guard_name: 'Prince',
    day_guard_phone: '+91 89821 91213',
    night_guard_name: 'Prince',
    night_guard_phone: '+91 89821 91213',
    charging_points_total: 16,
    charging_points_active: 16,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-10',
    name: 'Aurua Chpt 1',
    code: 'HUB-MUM-AUR1',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: '5, N S Rd No. 5, Vallabh Nagar Society, Juhu, Mumbai - 400056',
    poc_name: 'Tina',
    poc_phone: '+91 77374 11689',
    day_guard_name: 'Parveen',
    day_guard_phone: '+91 72768 24151',
    night_guard_name: 'Parveen',
    night_guard_phone: '+91 72768 24151',
    charging_points_total: 10,
    charging_points_active: 10,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-11',
    name: 'Anugrah by LivLit',
    code: 'HUB-MUM-ANU',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Opp Criticare Hospital, Vile Parle West, Mumbai - 400056',
    poc_name: 'Nilesh / Trupti Parekh',
    poc_phone: '+91 79901 69147',
    day_guard_name: 'Guptaji',
    day_guard_phone: '+91 84472 13458',
    night_guard_name: 'Guptaji',
    night_guard_phone: '+91 84472 13458',
    charging_points_total: 12,
    charging_points_active: 12,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-12',
    name: 'Bayside by HIVE',
    code: 'HUB-MUM-BAY',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Road No. 5 End, Juhu Scheme, Mumbai - 400049',
    poc_name: 'Varsha',
    poc_phone: '+91 90041 01982',
    day_guard_name: 'Juhi',
    day_guard_phone: '+91 91537 11664',
    night_guard_name: 'Yashmeen',
    night_guard_phone: '+91 87262 82049',
    charging_points_total: 10,
    charging_points_active: 10,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
  {
    id: 'hub-mum-13',
    name: 'Ganga Niwas',
    code: 'HUB-MUM-GAN',
    type: 'BIKE_HUB',
    city: 'Mumbai',
    address: 'Station Road, Vile Parle East, Mumbai - 400057',
    poc_name: 'Nilesh',
    poc_phone: '+91 79901 69147',
    day_guard_name: 'Ramu',
    day_guard_phone: '+91 98210 12345',
    night_guard_name: 'Shyam',
    night_guard_phone: '+91 98210 12346',
    charging_points_total: 8,
    charging_points_active: 8,
    is_active: true,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-08-27T00:00:00Z',
  },
];

// ====================================================================
// 3. REAL 40 VEHICLES WITH 15-DIGIT IOT IDs & MATCHING KEY NUMBERS
// ====================================================================
const VEHICLE_CONFIGS = [
  { id: 'veh-01', key: '6917', iot: '860141073026917', model: 'CS Model' as const, hub: 'hub-mum-01', status: 'Available' as const, km: 3420 },
  { id: 'veh-02', key: '5646', iot: '860141073025646', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Needs Maintenance' as const, reason: 'Recovered from Churchgate, brake and battery audit', km: 6240 },
  { id: 'veh-03', key: '2087', iot: '860141073022087', model: 'Ola Model' as const, hub: 'hub-mum-02', status: 'Available' as const, km: 4180 },
  { id: 'veh-04', key: '5596', iot: '860141073025596', model: 'CS Model' as const, hub: 'hub-mum-03', status: 'Available' as const, km: 2950 },
  { id: 'veh-05', key: '5729', iot: '860141073025729', model: 'CS Model' as const, hub: 'hub-mum-04', status: 'Available' as const, km: 5120 },
  { id: 'veh-06', key: '9640', iot: '860141073029640', model: 'Single Light Model' as const, hub: 'hub-mum-05', status: 'Under Repair' as const, reason: 'Front rim bent, requires rim straightening and disc alignment', km: 7830 },
  { id: 'veh-07', key: '5349', iot: '860141073025349', model: 'CS Model' as const, hub: 'hub-store-01', status: 'Available' as const, km: 3640 },
  { id: 'veh-08', key: '5554', iot: '860141073025554', model: 'Ola Model' as const, hub: 'hub-mum-11', status: 'Needs Maintenance' as const, reason: 'Left body damage, panel replacement and inspection', km: 8200 },
  { id: 'veh-09', key: '5321', iot: '860141073045321', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 2150 },
  { id: 'veh-10', key: '5281', iot: '860141073025281', model: 'Ola Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 4890 },
  { id: 'veh-11', key: '6040', iot: '860141073026040', model: 'Single Light Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 3100 },
  { id: 'veh-12', key: '5471', iot: '860141073025471', model: 'CS Model' as const, hub: 'hub-mum-05', status: 'Available' as const, km: 5400 },
  { id: 'veh-13', key: '5414', iot: '860141073025414', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 1800 },
  { id: 'veh-14', key: '5745', iot: '860141073025745', model: 'Ola Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 6200 },
  { id: 'veh-15', key: '6172', iot: '860141073026172', model: 'CS Model' as const, hub: 'hub-mum-11', status: 'Available' as const, km: 4300 },
  { id: 'veh-16', key: '6461', iot: '860141073026461', model: 'Single Light Model' as const, hub: 'hub-mum-09', status: 'Needs Maintenance' as const, reason: 'Rear brake cable loose', km: 7100 },
  { id: 'veh-17', key: '3760', iot: '860141073073760', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Not Available' as const, reason: 'Inactive telemetry testing', km: 2900 },
  { id: 'veh-18', key: '6214', iot: '860141073026214', model: 'Ola Model' as const, hub: 'hub-mum-08', status: 'Available' as const, km: 5200 },
  { id: 'veh-19', key: '2467', iot: '860141073052467', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 3800 },
  { id: 'veh-20', key: '6073', iot: '860141073026073', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 4400 },
  { id: 'veh-21', key: '5588', iot: '860141073025588', model: 'Single Light Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 6100 },
  { id: 'veh-22', key: '2880', iot: '860141073042880', model: 'Ola Model' as const, hub: 'hub-mum-03', status: 'Not Available' as const, reason: 'Inactive reserve unit', km: 1950 },
  { id: 'veh-23', key: '3914', iot: '860141073023914', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 3300 },
  { id: 'veh-24', key: '5356', iot: '860141073025356', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 4700 },
  { id: 'veh-25', key: '5703', iot: '860141073025703', model: 'Ola Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 5800 },
  { id: 'veh-26', key: '5059', iot: '860141073025059', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 2400 },
  { id: 'veh-27', key: '5679', iot: '860141073025679', model: 'Single Light Model' as const, hub: 'hub-mum-09', status: 'Needs Maintenance' as const, reason: 'Horn button intermittent', km: 6900 },
  { id: 'veh-28', key: '6388', iot: '860141073026388', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 3100 },
  { id: 'veh-29', key: '6032', iot: '860141073026032', model: 'Ola Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 4200 },
  { id: 'veh-30', key: '6099', iot: '860141073026099', model: 'CS Model' as const, hub: 'hub-mum-01', status: 'Available' as const, km: 1600 },
  { id: 'veh-31', key: '2657', iot: '860141073052657', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Not Available' as const, reason: 'Decommissioned test unit', km: 5300 },
  { id: 'veh-32', key: '2087', iot: '860141073052087', model: 'Single Light Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 3750 },
  { id: 'veh-33', key: '2293', iot: '860141073052293', model: 'Ola Model' as const, hub: 'hub-mum-09', status: 'Not Available' as const, reason: 'Pending inspection', km: 4600 },
  { id: 'veh-34', key: '1167', iot: '860141073001167', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 2800 },
  { id: 'veh-35', key: '6484', iot: '860141073056484', model: 'CS Model' as const, hub: 'hub-mum-08', status: 'Available' as const, km: 3900 },
  { id: 'veh-36', key: '2442', iot: '860141073052442', model: 'Ola Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 5100 },
  { id: 'veh-37', key: '1915', iot: '860141073051915', model: 'CS Model' as const, hub: 'hub-mum-09', status: 'Under Repair' as const, reason: 'Throttle assembly replacement in progress', km: 6400 },
  { id: 'veh-38', key: '2640', iot: '860141073052640', model: 'Single Light Model' as const, hub: 'hub-mum-09', status: 'Needs Maintenance' as const, reason: 'Brake pad wear past threshold', km: 7200 },
  { id: 'veh-39', key: '2434', iot: '860141073052434', model: 'CS Model' as const, hub: 'hub-mum-05', status: 'Available' as const, km: 1400 },
  { id: 'veh-40', key: '1514', iot: '860141073001514', model: 'Ola Model' as const, hub: 'hub-mum-09', status: 'Available' as const, km: 4900 },
];

export const INITIAL_VEHICLES: Vehicle[] = VEHICLE_CONFIGS.map((cfg) => ({
  id: cfg.id,
  vehicle_id: cfg.iot,
  vin: `MD625CK19284${cfg.key}`,
  key_number: cfg.key,
  model: cfg.model,
  current_hub_id: cfg.hub,
  current_status: cfg.status,
  pending_status: null,
  status_change_reason: cfg.reason || null,
  odometer_km: cfg.km,
  last_odometer_updated_at: '2026-08-27T10:00:00Z',
  last_odometer_updated_by: 'usr-03',
  last_inspected_at: '2026-08-26T15:00:00Z',
  last_inspected_by: 'usr-06',
  is_active: true,
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-08-27T10:00:00Z',
}));

// ====================================================================
// 4. REAL INVENTORY CATALOG (added_data/inventroy)
// ====================================================================
export const INITIAL_PARTS: PartInventory[] = [
  { id: 'p-01', sku: 'EZEV-BRK-PAD-01', name: 'Disc Pad Set', category: 'Brakes', description: 'Pakshal / SMH ceramic brake disc pad set', unit_cost: 150, min_threshold: 10, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-02', sku: 'EZEV-IND-LGT-01', name: 'Indicator Light', category: 'Electrical', description: 'Amber LED indicator light unit', unit_cost: 20, min_threshold: 20, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-03', sku: 'EZEV-THR-123-01', name: 'Throttle 123 (3-Speed)', category: 'Controls', description: 'Pakshal Auto parts 3-speed acceleration throttle grip', unit_cost: 380, min_threshold: 4, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-04', sku: 'EZEV-HRN-48V-01', name: 'Horn 48V', category: 'Electrical', description: 'Electric high-decibel horn unit', unit_cost: 120, min_threshold: 5, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-05', sku: 'EZEV-BRK-CBL-01', name: 'Brake Cable', category: 'Brakes', description: 'Steel braided brake inner & outer cable', unit_cost: 300, min_threshold: 6, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-06', sku: 'EZEV-BRK-BLB-01', name: 'Brake Bulb', category: 'Electrical', description: 'Rear tail brake bulb', unit_cost: 10, min_threshold: 15, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-07', sku: 'EZEV-IND-BTN-01', name: 'Indicator Button', category: 'Controls', description: 'Pakshal handlebar indicator switch button', unit_cost: 60, min_threshold: 5, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-08', sku: 'EZEV-NUT-WSH-13', name: '13 No. Spring Washer (Pack 200)', category: 'Fasteners', description: 'Chassis spring washer packet', unit_cost: 70, min_threshold: 5, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-09', sku: 'EZEV-BLT-1016', name: '10x16 Collar Bolt (Pack 100)', category: 'Fasteners', description: 'Hex flanged collar bolt packet', unit_cost: 130, min_threshold: 4, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-10', sku: 'EZEV-BLT-1205', name: '12x1/2 Collar Bolt (Pack 50)', category: 'Fasteners', description: 'Flanged collar bolts 12x1/2 inch', unit_cost: 115, min_threshold: 4, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-11', sku: 'EZEV-BLT-1210', name: '12x1 Collar Bolt (Pack 50)', category: 'Fasteners', description: 'Flanged collar bolts 12x1 inch', unit_cost: 130, min_threshold: 4, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-12', sku: 'EZEV-BAT-BLT-08', name: '8 No. Battery Nut Bolt Set', category: 'Fasteners', description: 'Battery terminal nut and bolt kit', unit_cost: 85, min_threshold: 5, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-13', sku: 'EZEV-PNC-PTC-20', name: 'Patches BP-1 (Box of 20)', category: 'Tyres', description: 'Cold vulcanizing tyre puncture patches', unit_cost: 480, min_threshold: 3, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-14', sku: 'EZEV-PNC-OMN-25', name: 'Yellow Omni Strips (Box of 25)', category: 'Tyres', description: 'Puncture repair sealing string strips', unit_cost: 220, min_threshold: 3, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-15', sku: 'EZEV-PNC-SOL-01', name: 'Omni Solution Tube', category: 'Tyres', description: 'Rubber cement vulcanizing fluid', unit_cost: 50, min_threshold: 5, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-16', sku: 'EZEV-PNC-VLV-10', name: 'Tyre Valve (10 Pcs)', category: 'Tyres', description: 'Brass core tubeless wheel valve set', unit_cost: 300, min_threshold: 4, supplier: 'Pakshal Auto Parts', is_active: true, created_at: '2026-07-29T00:00:00Z' },
  { id: 'p-17', sku: 'EZEV-SWT-KIT-30', name: 'Switches N/M & Headlight Kit', category: 'Controls', description: 'SMH E Ventures multi-switch cluster', unit_cost: 80, min_threshold: 6, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-18', sku: 'EZEV-THR-WTR-01', name: 'Throttle 123 (Waterproof SMH)', category: 'Controls', description: 'SMH E Ventures waterproof hall sensor throttle', unit_cost: 150, min_threshold: 4, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-19', sku: 'EZEV-DRM-PLT-01', name: 'Drum Plate Swing Arm', category: 'Chassis', description: 'Rear drum brake swing arm mounting plate', unit_cost: 420, min_threshold: 3, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-20', sku: 'EZEV-ELC-MCB-01', name: 'MCB (Miniature Circuit Breaker)', category: 'Electrical', description: 'SMH E Ventures DC battery safety cutout MCB', unit_cost: 90, min_threshold: 5, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-21', sku: 'EZEV-LCK-SHT-01', name: 'Shutter Lock Set', category: 'Chassis', description: 'Anti-theft shutter ignition lock set', unit_cost: 520, min_threshold: 2, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-22', sku: 'EZEV-LVR-DRM-01', name: 'Drum Lever Assy Set', category: 'Brakes', description: 'SMH Drum brake handle lever set', unit_cost: 300, min_threshold: 4, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-23', sku: 'EZEV-STR-CON-01', name: 'Coneset Steering Bearing', category: 'Chassis', description: 'Front fork steering head ball bearing set', unit_cost: 150, min_threshold: 5, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-24', sku: 'EZEV-ELC-DCC-01', name: 'DC Converter (Waterproof)', category: 'Electrical', description: 'SMH E Ventures 48V to 12V waterproof step-down converter', unit_cost: 220, min_threshold: 4, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-25', sku: 'EZEV-LGT-HLD-01', name: 'Tail Light Holder', category: 'Electrical', description: 'Tail light bulb connector socket bracket', unit_cost: 60, min_threshold: 5, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-26', sku: 'EZEV-WIR-KIT-01', name: 'Wire Kit Main Harness', category: 'Electrical', description: 'Main frame electrical wiring kit', unit_cost: 150, min_threshold: 4, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-27', sku: 'EZEV-STN-SPR-01', name: 'Side Stand Spring', category: 'Chassis', description: 'Side stand return tension spring', unit_cost: 15, min_threshold: 10, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
  { id: 'p-28', sku: 'EZEV-LCK-STU-01', name: 'Seat Lock U-Type Catch', category: 'Chassis', description: 'U-type underseat compartment lock latch', unit_cost: 60, min_threshold: 4, supplier: 'SMH E Ventures', is_active: true, created_at: '2026-07-31T00:00:00Z' },
];

// ====================================================================
// 5. SINGLE PHYSICAL INVENTORY STORE: "Store 1" (hub-store-01)
// ====================================================================
const STORE_1_STOCK_CONFIG: Record<string, number> = {
  'p-01': 55,  // Disc Pad Set
  'p-02': 140, // Indicator Light
  'p-03': 12,  // Throttle 123
  'p-04': 20,  // Horn 48V
  'p-05': 18,  // Brake Cable
  'p-06': 35,  // Brake Bulb
  'p-07': 14,  // Indicator Button
  'p-08': 8,   // 13 No. Spring Washer
  'p-09': 10,  // 10x16 Collar Bolt
  'p-10': 12,  // 12x1/2 Collar Bolt
  'p-11': 14,  // 12x1 Collar Bolt
  'p-12': 16,  // 8 No. Battery Nut Bolt
  'p-13': 15,  // Patches BP-1
  'p-14': 20,  // Yellow Omni Strips
  'p-15': 18,  // Omni Solution Tube
  'p-16': 16,  // Tyre Valve
  'p-17': 22,  // Switches N/M Kit
  'p-18': 15,  // Throttle 123 SMH
  'p-19': 8,   // Drum Plate
  'p-20': 18,  // MCB
  'p-21': 6,   // Shutter Lock Set
  'p-22': 12,  // Drum Lever Assy
  'p-23': 14,  // Coneset Steering
  'p-24': 15,  // DC Converter
  'p-25': 20,  // Tail Light Holder
  'p-26': 10,  // Wire Kit Main Harness
  'p-27': 30,  // Side Stand Spring
  'p-28': 16,  // Seat Lock U-Type
};

export const INITIAL_HUB_STOCK: HubPartStock[] = INITIAL_PARTS.map((part) => ({
  id: `hs-store1-${part.id}`,
  hub_id: 'hub-store-01', // Store 1 ONLY
  part_id: part.id,
  physical_stock: STORE_1_STOCK_CONFIG[part.id] ?? 20,
  pending_allocated_stock: 0,
  min_threshold: part.min_threshold || 5,
  updated_at: '2026-08-27T00:00:00Z',
}));

// ====================================================================
// 6. ALL 41 REAL CUSTOMER REFUND DISPUTE CASES (added_data/refundds)
// ====================================================================
const RAW_REFUNDS = [
  { id: 'r-01', date: '2026-07-29', phone: '9871305639', amt: 26.25, status: 'SETTLED' as const, req: 'User', type: 'EzEv Wallet' as const, reason: 'Ashish didnt give bike because user creates disturbance at Public hub' },
  { id: 'r-02', date: '2026-07-29', phone: '8171784227', amt: 26.25, status: 'SETTLED' as const, req: 'User', type: 'EzEv Wallet' as const, reason: 'Bike had issues' },
  { id: 'r-03', date: '2026-07-27', phone: '7694085885', amt: 26.25, status: 'SETTLED' as const, req: 'Ankit Bhaiya', type: 'EzEv Wallet' as const, reason: 'Base Charge Refund' },
  { id: 'r-04', date: '2026-07-27', phone: '7778088909', amt: 26.25, status: 'SETTLED' as const, req: 'Ankit Bhaiya', type: 'EzEv Wallet' as const, reason: 'Base Charge Refund' },
  { id: 'r-05', date: '2026-08-02', phone: '7304003536', amt: 420.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Customer left scootie 7:20 am on Resume' },
  { id: 'r-06', date: '2026-08-02', phone: '9830022696', amt: 193.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Customer left scootie 2:41 am on Pause (Key 2087)' },
  { id: 'r-07', date: '2026-08-02', phone: '9136079505', amt: 47.25, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Customer left scootie 8:29 am on Pause (Key 5596)' },
  { id: 'r-08', date: '2026-08-02', phone: '9324773610', amt: 538.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Customer left scootie 4:52 am on Resume (Key 5729)' },
  { id: 'r-09', date: '2026-08-02', phone: '9150617666', amt: 51.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Customer sending details on WhatsApp' },
  { id: 'r-10', date: '2026-08-03', phone: '8269675500', amt: 268.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Customer got ride back with rim bent issue and left bike on Pause (Key 9640)' },
  { id: 'r-11', date: '2026-08-02', phone: '8780083670', amt: 26.63, status: 'SETTLED' as const, req: 'Ankit Bhaiya', type: 'EzEv Wallet' as const, reason: 'Base Charge Refund' },
  { id: 'r-12', date: '2026-07-16', phone: '8780083670', amt: 14.00, status: 'SETTLED' as const, req: 'Ankit Bhaiya', type: 'EzEv Wallet' as const, reason: 'Anugrah - Parking time was 50 mins, but charged extra' },
  { id: 'r-13', date: '2026-07-17', phone: '8780083670', amt: 8.00, status: 'SETTLED' as const, req: 'Ankit Bhaiya', type: 'EzEv Wallet' as const, reason: 'Anugrah - Parking time was 30 mins, but charged extra' },
  { id: 'r-14', date: '2026-08-05', phone: '6284565258', amt: 50.00, status: 'REJECTED' as const, req: 'Ankit Bhaiya', type: 'EzEv Wallet' as const, reason: 'Declined: Anugrah user forgot to end ride' },
  { id: 'r-15', date: '2026-08-06', phone: '7458983910', amt: 226.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Aurus Chpt 3 - Parking time was 23 min, but charged extra. Customer left scootie 23:08 on Resume (Key 5349)' },
  { id: 'r-16', date: '2026-08-06', phone: '9875556957', amt: 105.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'NMIMS - Charged extra between 20:08 to 20:48. Customer paused scooter but it did not pause' },
  { id: 'r-17', date: '2026-08-08', phone: '9356002633', amt: 26.25, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Refund Base charge' },
  { id: 'r-18', date: '2026-08-08', phone: '7037133606', amt: 26.25, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Refund Base charge' },
  { id: 'r-19', date: '2026-08-09', phone: '9371262497', amt: 26.25, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Refund Base charge' },
  { id: 'r-20', date: '2026-08-09', phone: '7073570147', amt: 26.25, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Refund Base charge' },
  { id: 'r-21', date: '2026-08-10', phone: '9374735336', amt: 171.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'RSA waale time ka Refund' },
  { id: 'r-22', date: '2026-08-11', phone: '8866597953', amt: 132.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Standing in Anugrah for 8 hours' },
  { id: 'r-23', date: '2026-08-12', phone: '7717379955', amt: 6.00, status: 'SETTLED' as const, req: 'Ankit Bhaiya', type: 'EzEv Wallet' as const, reason: 'Sobo network issue, android access' },
  { id: 'r-24', date: '2026-08-14', phone: '7046211613', amt: 40.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Rim bent issue on trip' },
  { id: 'r-25', date: '2026-08-15', phone: '9363476441', amt: 63.79, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Bike was not charging thus testing, nor changing status' },
  { id: 'r-26', date: '2026-08-07', phone: '9770835092', amt: 497.46, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Customer says was charged wrong on long session' },
  { id: 'r-27', date: '2026-08-16', phone: '7408408070', amt: 200.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'They were 3 rides in all. Customer says he had paused but was charged more' },
  { id: 'r-28', date: '2026-08-16', phone: '9727616455', amt: 90.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Customer had left scooty, but ride didnt end due to network issue' },
  { id: 'r-29', date: '2026-08-16', phone: '8899986900', amt: 68.35, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Scooty faulty need to refund' },
  { id: 'r-30', date: '2026-08-19', phone: '8905511966', amt: 59.45, status: 'SETTLED' as const, req: 'Ashish', type: 'EzEv Wallet' as const, reason: 'Network Issue scooty not getting on' },
  { id: 'r-31', date: '2026-08-20', phone: '8405000619', amt: 26.25, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Refund as booked without permission' },
  { id: 'r-32', date: '2026-08-20', phone: '9589315149', amt: 45.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Took scooty on rent 12:53 AM showing extra running time after pause' },
  { id: 'r-33', date: '2026-08-18', phone: '6266720022', amt: 35.00, status: 'SETTLED' as const, req: 'Zaffar', type: 'EzEv Wallet' as const, reason: 'Put vehicle in charge but forgot to switch off from phone' },
  { id: 'r-34', date: '2026-08-23', phone: '9509926417', amt: 86.81, status: 'SETTLED' as const, req: 'Zaffar', type: 'Bank Payout' as const, reason: 'Payout: Wants to deactivate the account' },
  { id: 'r-35', date: '2026-08-15', phone: '7767000056', amt: 26.25, status: 'SETTLED' as const, req: 'Bhuvnesh', type: 'EzEv Wallet' as const, reason: '4 mins ride, scooter had startup issue' },
  { id: 'r-36', date: '2026-08-25', phone: '9871305639', amt: 26.91, status: 'SETTLED' as const, req: 'Bhuvnesh', type: 'EzEv Wallet' as const, reason: 'Key 5554 bike had damages and user replaced bike in 5mins' },
  { id: 'r-37', date: '2026-08-25', phone: '8235058703', amt: 30.16, status: 'SETTLED' as const, req: 'Bhuvnesh', type: 'EzEv Wallet' as const, reason: 'Bike had issue on pickup' },
  { id: 'r-38', date: '2026-08-26', phone: '9835490560', amt: 26.25, status: 'SUBMITTED' as const, req: 'Ashish', type: 'EzEv Wallet' as const, reason: 'Bike Not starting display Not getting on in App ride started (YTS)' },
  { id: 'r-39', date: '2026-08-26', phone: '7058332474', amt: 26.25, status: 'SUBMITTED' as const, req: 'Ashish', type: 'EzEv Wallet' as const, reason: 'Bike had server issue not starting, display not getting on (YTS)' },
  { id: 'r-40', date: '2026-08-27', phone: '9825011157', amt: 26.25, status: 'SUBMITTED' as const, req: 'Ashish', type: 'EzEv Wallet' as const, reason: 'Bike had server issue not starting, display not getting on (YTS)' },
  { id: 'r-41', date: '2026-08-27', phone: '9724190000', amt: 32.50, status: 'SUBMITTED' as const, req: 'Ashish', type: 'EzEv Wallet' as const, reason: 'Bike not pause in app showing paused because of App glitch (YTS)' },
];

export const INITIAL_REFUNDS: Refund[] = RAW_REFUNDS.map((r, idx) => ({
  id: r.id,
  user_phone: `+91 ${r.phone}`,
  ride_id: `RIDE-MUM-2026-${String(idx + 101).padStart(4, '0')}`,
  ride_date: r.date,
  amount: r.amt,
  payout_type: r.type,
  reason: r.reason,
  internal_remarks: r.status === 'SETTLED' ? 'Verified in IoT telemetry & approved' : 'Awaiting confirmation from Hub POC',
  frappe_reference: r.status === 'SETTLED' ? `FRAP-MUM-2026-${String(idx + 8001).padStart(5, '0')}` : null,
  status: r.status,
  requested_by: r.req === 'Bhuvnesh' ? 'usr-01' : r.req === 'Zaffar' ? 'usr-03' : r.req === 'Ashish' ? 'usr-04' : 'usr-05',
  requester_name: r.req === 'Bhuvnesh' ? 'Bhuvnesh Kumar' : r.req === 'Zaffar' ? 'Zaffar Patel' : r.req === 'Ashish' ? 'Ashish Vaishya' : r.req,
  requester_role: r.req === 'Bhuvnesh' ? 'Super Admin' : 'Operations Manager',
  approved_by: r.status === 'SETTLED' ? 'usr-01' : null,
  settled_at: r.status === 'SETTLED' ? `${r.date}T18:00:00Z` : null,
  settled_by_name: r.status === 'SETTLED' ? 'Bhuvnesh Kumar' : null,
  created_at: `${r.date}T10:00:00Z`,
  updated_at: `${r.date}T18:00:00Z`,
}));

// ====================================================================
// 7. REAL BLOCKED USERS (added_data/blocked users)
// ====================================================================
export const INITIAL_BLOCKED_USERS: BlockedUser[] = [
  {
    id: 'blk-01',
    employee_name: 'Zaffar Patel',
    date: '2026-08-26',
    user_email: '917016411890@example.com',
    user_name: 'Dwarkesh Kansagara',
    phone: '+91 63772 93303',
    vehicle_no: '5646',
    reason: 'Left bike in Churchgate. Regular user made excuse of low battery (10% battery was available). Informed user that account is blocked for 15 days, unblockable upon payment of Rs. 200 vehicle collection charges or auto-unblocked on 16th day.',
    recovery_status: 'Pending',
    recovery_amount: 200,
  },
];

// ====================================================================
// 8. PRODUCTION SOP DOCUMENTS (Mock/Standard Template SOPs Preserved)
// ====================================================================
export const INITIAL_SOPS: SOP[] = [
  {
    id: 'sop-01',
    code: 'SOP-OPS-001',
    title: 'Roadside Breakdown & Towing Protocol',
    category: 'Operations',
    version: '1.2',
    status: 'PUBLISHED',
    summary: 'Standard operating procedure for RSA dispatch, roadside triage, towing, and IoT vehicle state locking.',
    author_id: 'usr-01',
    author_name: 'Bhuvnesh Kumar',
    access_roles: ['owner', 'manager', 'rsa', 'mechanic'],
    view_count: 42,
    acknowledged_by: ['usr-03', 'usr-04', 'usr-06', 'usr-07'],
    content: `## 1. Objective
Establish safe, rapid, and verifiable procedures when an EzEv electric vehicle suffers a roadside failure or battery depletion.

## 2. Immediate Field Triage
1. **Locate & Ping**: Confirm 15-digit IoT GPS ping. Check if battery SOC is below 10%.
2. **Customer Safety**: Direct the customer to a safe pavement zone away from active traffic.
3. **App Staging**: Mark vehicle status as **Under Repair** / **RSA In Transit** on the command app.

## 3. Vehicle Retrieval & Towing
- Verify that key number and VIN match the assigned ticket.
- Securely load the EV onto the RSA vehicle using certified nylon tie-down straps.
- Transport vehicle directly to **Store 1** for diagnostic inspection.

## 4. Ticket Resolution
- Log drop-off timestamp, odometer reading, and battery condition in the maintenance job card.`,
    revisions: [
      {
        version: '1.2',
        updated_at: '2026-08-20T10:00:00Z',
        updated_by_name: 'Bhuvnesh Kumar',
        change_summary: 'Added mandatory 15-digit IoT ping verification step before van dispatch',
        content: 'Revised triage sequence to include GPS packet validation.',
      },
      {
        version: '1.0',
        updated_at: '2026-01-15T00:00:00Z',
        updated_by_name: 'Bhuvnesh Kumar',
        change_summary: 'Initial release of RSA Towing Protocol',
        content: 'Initial operational baseline document.',
      },
    ],
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
  },
  {
    id: 'sop-02',
    code: 'SOP-BAT-002',
    title: 'Battery Swap & Charging Bay Safety SOP',
    category: 'Safety',
    version: '2.0',
    status: 'PUBLISHED',
    summary: 'Safety protocol for 48V battery swapping, MCB isolation, connector maintenance, and fire safety.',
    author_id: 'usr-02',
    author_name: 'Yugdeep Handa',
    access_roles: ['owner', 'manager', 'rsa', 'mechanic'],
    view_count: 58,
    acknowledged_by: ['usr-01', 'usr-03', 'usr-04', 'usr-06', 'usr-07'],
    content: `## 1. Scope
Applies to all charging hubs (Della, NMIMS, Store 1, Anugrah, Bayside).

## 2. Pre-Swap Safety Checklist
- Ensure hands are dry and insulated nitrile gloves are worn.
- Verify MCB breaker is in **OFF** position before disconnecting Anderson power harnesses.
- Inspect battery casing for swelling, odor, or moisture ingress.

## 3. Charging Dock Connection
- Align the 48V charging connector firmly until mechanical lock clicks.
- Check LED indicator: **RED** (Charging), **GREEN** (Fully Charged >95%).
- If a connector sparks or shows corrosion, isolate the port immediately and report in Charger Logs.`,
    revisions: [
      {
        version: '2.0',
        updated_at: '2026-08-10T14:00:00Z',
        updated_by_name: 'Yugdeep Handa',
        change_summary: 'Upgraded fire extinguisher proximity checklist and MCB isolation steps',
        content: 'Added strict MCB cutoff rule prior to connector plug-in.',
      },
    ],
    created_at: '2026-01-20T00:00:00Z',
    updated_at: '2026-08-10T14:00:00Z',
  },
  {
    id: 'sop-03',
    code: 'SOP-SEC-003',
    title: 'Hub Closing & Night Security Handover SOP',
    category: 'Security',
    version: '1.1',
    status: 'PUBLISHED',
    summary: 'Guidelines for night watchman shift handover, vehicle count reconciliation, and charger security.',
    author_id: 'usr-03',
    author_name: 'Zaffar Patel',
    access_roles: ['owner', 'manager', 'rsa'],
    view_count: 31,
    acknowledged_by: ['usr-01', 'usr-04'],
    content: `## 1. Daily Night Handover (20:00 to 21:00)
1. **Reconciliation**: Count all physical EVs at the hub and match against the live app Hub Inventory.
2. **Charger Verification**: Ensure active chargers are powered ON only for parked EVs below 80% SOC.
3. **Guard Contact Check**: Confirm Night Watchman (e.g. Santosh Tiwari @ Della, Mangesh @ Store 1) is on-site and has emergency contact numbers saved.

## 2. Emergency Escalations
In case of unauthorized tampering or vehicle movement after 23:00, notify Operations Manager immediately via WhatsApp and lock IoT ignition.`,
    revisions: [
      {
        version: '1.1',
        updated_at: '2026-08-01T09:00:00Z',
        updated_by_name: 'Zaffar Patel',
        change_summary: 'Added night guard phone validation and charger wattage cutoff guideline',
        content: 'Updated security escalation steps.',
      },
    ],
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-08-01T09:00:00Z',
  },
  {
    id: 'sop-04',
    code: 'SOP-DIS-004',
    title: 'Customer Dispute Resolution & Payout SOP',
    category: 'Finance',
    version: '1.0',
    status: 'PUBLISHED',
    summary: 'Rules for verifying pause-time glitches, battery drops, and executing instant Frappe ERP refunds.',
    author_id: 'usr-05',
    author_name: 'Ankita Gangwani',
    access_roles: ['owner', 'manager'],
    view_count: 45,
    acknowledged_by: ['usr-01', 'usr-03', 'usr-04'],
    content: `## 1. Eligibility Criteria
- Base charge refunds for immediate cancellations (<5 mins) with no ride distance.
- Parking/Pause time overcharges where telemetry confirms vehicle stood stationary inside hub radius.
- Account deactivations requesting remaining wallet balance payout.

## 2. Settlement Execution
- Refunds under ₹100 may be settled directly by Operations Managers.
- Bank payouts (> ₹200) require secondary verification of UPI / Account details.
- Record auto-generated Frappe voucher reference on settlement.`,
    revisions: [
      {
        version: '1.0',
        updated_at: '2026-02-15T00:00:00Z',
        updated_by_name: 'Ankita Gangwani',
        change_summary: 'Initial release of customer dispute policy',
        content: 'Baseline dispute criteria and wallet refund workflows.',
      },
    ],
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
  },
];

// ====================================================================
// 9. TEAM NOTES & SCRATCHPAD WITH DISPOSAL LIFECYCLE
// ====================================================================
export const INITIAL_NOTES: TeamNote[] = [
  {
    id: 'note-01',
    title: 'Aster Hub Charger Main Switch Tripped - Electrician Dispatched',
    content: 'Komal Negi reported that Aster HIVE charger board tripped during rain at 18:00. Power is OFF for safety. Electrician Mohan scheduled for 10:00 AM visit tomorrow.',
    category: 'URGENT',
    status: 'ACTIVE',
    priority: 'URGENT',
    tags: ['Electrical', 'Charger', 'Rain'],
    hub_id: 'hub-mum-02',
    is_pinned: true,
    author_id: 'usr-03',
    author_name: 'Zaffar Patel',
    author_role: 'Operations Manager',
    created_at: '2026-08-26T18:30:00Z',
    updated_at: '2026-08-26T18:30:00Z',
  },
  {
    id: 'note-02',
    title: 'Churchgate Recovery Case #5646 - Dwarkesh Kansagara User Blocked',
    content: 'Bike 5646 was recovered from Churchgate station by Rajkumar. User claimed 0% battery but 10% was available. 15-day block applied in system. ₹200 penalty recovery fee pending.',
    category: 'SHIFT_HANDOVER',
    status: 'ACTIVE',
    priority: 'HIGH',
    tags: ['Recovery', 'Churchgate', 'Blocked User'],
    hub_id: 'hub-mum-09',
    is_pinned: true,
    author_id: 'usr-03',
    author_name: 'Zaffar Patel',
    author_role: 'Operations Manager',
    created_at: '2026-08-26T20:15:00Z',
    updated_at: '2026-08-26T20:15:00Z',
  },
  {
    id: 'note-03',
    title: 'Store 1 Central Warehouse Spares Re-Order Note',
    content: 'Stock of 13 No. Spring Washers (2 packs left) and Brake Cables (12 units) at Store 1. Need to place replenishment order with Pakshal Auto parts by Friday.',
    category: 'MECHANICAL',
    status: 'ACTIVE',
    priority: 'NORMAL',
    tags: ['Inventory', 'Pakshal', 'Fasteners'],
    hub_id: 'hub-store-01',
    is_pinned: false,
    author_id: 'usr-06',
    author_name: 'Rajkumar Mandal',
    author_role: 'Mechanic',
    created_at: '2026-08-27T09:00:00Z',
    updated_at: '2026-08-27T09:00:00Z',
  },
  {
    id: 'note-04',
    title: 'NMIMS Student Peak Hour Fleet Staging',
    content: 'Ensure minimum 12 Available bikes at NMIMS Back Gate hub before 11:30 AM class breaks. Move 4 units from Aurus 1 if count drops below 6.',
    category: 'HUB_NOTICE',
    status: 'ACTIVE',
    priority: 'HIGH',
    tags: ['Fleet Staging', 'Peak Hours', 'NMIMS'],
    hub_id: 'hub-mum-09',
    is_pinned: false,
    author_id: 'usr-04',
    author_name: 'Ashish Vaishya',
    author_role: 'Operations Manager',
    created_at: '2026-08-27T10:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
  },
  {
    id: 'note-05',
    title: 'Previous Day Battery Terminal Tightening Routine - Completed',
    content: 'All battery Anderson terminals on CS Model vehicles inspected and lubricated at Store 1 workshop. Shift completed without issue.',
    category: 'SHIFT_HANDOVER',
    status: 'RESOLVED',
    priority: 'NORMAL',
    tags: ['Completed', 'Maintenance'],
    hub_id: 'hub-store-01',
    is_pinned: false,
    author_id: 'usr-07',
    author_name: 'Ritik Mandal',
    author_role: 'RSA Field Specialist',
    resolved_at: '2026-08-26T22:00:00Z',
    resolved_by_name: 'Ritik Mandal',
    created_at: '2026-08-26T16:00:00Z',
    updated_at: '2026-08-26T22:00:00Z',
  },
];

// ====================================================================
// 10. RECENT JOB CARDS & AUDITS
// ====================================================================
export const INITIAL_JOB_CARDS: JobCard[] = [
  {
    id: 'job-mum-01',
    ticket_number: 101,
    vehicle_id: 'veh-06',
    reported_by: 'usr-03',
    assigned_mechanic_id: 'usr-06',
    hub_id: 'hub-mum-05',
    odometer_km: 7830,
    issue_description: 'Front rim bent from pothole impact, brake rotor rubbing against caliper (Key 9640)',
    solution_applied: 'Straightened rim on hydraulic press, replaced front brake disc pads and aligned caliper',
    status: 'APPROVED',
    approved_by: 'usr-01',
    approval_notes: 'Spares committed from Store 1. Vehicle certified safe for road use.',
    created_at: '2026-08-26T14:00:00Z',
    resolved_at: '2026-08-27T09:30:00Z',
    approved_at: '2026-08-27T09:45:00Z',
    parts: [
      { id: 'jcp-01', job_card_id: 'job-mum-01', part_id: 'p-01', quantity: 1, unit_cost_snapshot: 150, is_approved: true, created_at: '2026-08-26T14:00:00Z' },
    ],
  },
  {
    id: 'job-mum-02',
    ticket_number: 102,
    vehicle_id: 'veh-37',
    reported_by: 'usr-04',
    assigned_mechanic_id: 'usr-07',
    hub_id: 'hub-mum-01',
    odometer_km: 6400,
    issue_description: 'Throttle 3-speed switch broken, vehicle stutters on mode 2 acceleration (Key 1915)',
    solution_applied: null,
    status: 'PENDING',
    approved_by: null,
    approval_notes: null,
    created_at: '2026-08-27T08:00:00Z',
    resolved_at: null,
    approved_at: null,
    parts: [
      { id: 'jcp-02', job_card_id: 'job-mum-02', part_id: 'p-03', quantity: 1, unit_cost_snapshot: 380, is_approved: false, created_at: '2026-08-27T08:00:00Z' },
    ],
  },
];

export const INITIAL_OBJECTIVES: Objective[] = [
  {
    id: 'obj-mum-01',
    title: 'Mumbai Monsoon Hub Drainage & Charger Inspection',
    description: 'Audit all hubs and Store 1 for waterlogging safety, breaker integrity, and cable insulation checks.',
    start_date: '2026-08-20',
    target_date: '2026-08-31',
    hub_id: 'hub-store-01',
    created_by: 'usr-01',
    is_completed: false,
    created_at: '2026-08-20T00:00:00Z',
  },
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'tsk-mum-01',
    objective_id: 'obj-mum-01',
    title: 'Test Aster Hub MCB breaker & repair tripped line',
    description: 'Coordinate with electrician Mohan to reset breaker and check moisture seal on ports.',
    assigned_to: ['usr-03', 'usr-06'],
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    vehicle_id: null,
    start_date: '2026-08-26T18:00:00Z',
    due_date: '2026-08-28T12:00:00Z',
    completed_at: null,
    created_by: 'usr-01',
    remarks: [
      {
        id: 'rem-01',
        task_id: 'tsk-mum-01',
        author_id: 'usr-03',
        author_name: 'Zaffar Patel',
        author_role: 'Operations Manager',
        comment: 'Electrician confirmed for 10:00 AM tomorrow.',
        created_at: '2026-08-26T18:45:00Z',
      },
    ],
    created_at: '2026-08-26T18:00:00Z',
    updated_at: '2026-08-26T18:45:00Z',
  },
  {
    id: 'tsk-mum-02',
    objective_id: 'obj-mum-01',
    title: 'Replace worn disc pads on Key 5554 (Ola Model)',
    description: 'Inspect front & rear brake calipers at Anugrah hub before releasing to public pool.',
    assigned_to: ['usr-06'],
    priority: 'HIGH',
    status: 'TODO',
    vehicle_id: 'veh-08',
    start_date: '2026-08-27T08:00:00Z',
    due_date: '2026-08-28T18:00:00Z',
    completed_at: null,
    created_by: 'usr-01',
    remarks: [],
    created_at: '2026-08-27T08:00:00Z',
    updated_at: '2026-08-27T08:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-01',
    table_name: 'vehicles',
    record_id: 'veh-02',
    action: 'UPDATE',
    performed_by: 'usr-03',
    performer_name: 'Zaffar Patel',
    old_data: { current_status: 'Available', hub: 'Churchgate' },
    new_data: { current_status: 'Needs Maintenance', hub: 'NMIMS Back Gate' },
    timestamp: '2026-08-26T20:15:00Z',
  },
  {
    id: 'aud-02',
    table_name: 'refunds',
    record_id: 'r-05',
    action: 'UPDATE',
    performed_by: 'usr-01',
    performer_name: 'Bhuvnesh Kumar',
    old_data: { status: 'SUBMITTED' },
    new_data: { status: 'SETTLED', frappe_reference: 'FRAP-MUM-2026-08005' },
    timestamp: '2026-08-02T18:00:00Z',
  },
];

// ====================================================================
// 12. INITIAL STRATEGIC MILESTONES (3-Tier Hierarchy)
// ====================================================================
export const INITIAL_MILESTONES: any[] = [
  {
    id: 'mls-01',
    objective_id: 'obj-mum-01',
    title: 'Stage 1: Complete Store 1 Brake Pad Restock & Fast Audits',
    description: 'Ensure 30+ sets of Disc Pads are dispatched to high-traffic hubs (Churchgate, NMIMS).',
    target_date: '2026-08-29',
    is_completed: false,
    order_index: 1,
    created_at: '2026-08-27T08:00:00Z',
  },
  {
    id: 'mls-02',
    objective_id: 'obj-mum-01',
    title: 'Stage 2: 100% Rapid Inspection sweep of CS & Ola fleet',
    description: 'Complete brake, throttle, and BMS checks on all 40 active Mumbai scooters.',
    target_date: '2026-08-31',
    is_completed: false,
    order_index: 2,
    created_at: '2026-08-27T08:00:00Z',
  },
];

// ====================================================================
// 13. INITIAL DAILY SHIFT LOGS (8.1)
// ====================================================================
export const INITIAL_DAILY_SHIFT_LOGS: any[] = [
  {
    id: 'shift-01',
    author_id: 'usr-03',
    author_name: 'Zaffar Patel',
    author_role: 'Hub Operations Manager',
    hub_id: 'hub-mum-01',
    hub_name: 'Churchgate Station East',
    shift_date: '2026-08-27',
    shift_type: 'MORNING',
    accomplishments: 'Completed morning battery swap for 12 Ola EVs; inspected Churchgate charging point #2.',
    roadblocks: 'Charging bay #3 power connector loose; reported to maintenance team.',
    milestones_completed: 'Dispatched 5 Available scooters to Mithibai college cluster.',
    handover_notes: 'Keys B001 and K104 are fully charged on Bay 1.',
    created_at: '2026-08-27T13:30:00Z',
    updated_at: '2026-08-27T13:30:00Z',
  },
  {
    id: 'shift-02',
    author_id: 'usr-06',
    author_name: 'Ramesh Vishwakarma',
    author_role: 'Hub Maintenance Mechanic',
    hub_id: 'hub-mum-02',
    hub_name: 'NMIMS Back Gate (Vile Parle)',
    shift_date: '2026-08-27',
    shift_type: 'EVENING',
    accomplishments: 'Replaced rear brake pads on Key 5554; verified throttle voltage and test-rode.',
    roadblocks: 'Need 4 more sets of brake levers from Store 1 warehouse.',
    milestones_completed: 'Resolved Job Card #1002 and staged vehicle for release.',
    handover_notes: 'Tools returned to Store 1 cabinet.',
    created_at: '2026-08-27T20:00:00Z',
    updated_at: '2026-08-27T20:00:00Z',
  },
];

// ====================================================================
// 14. INITIAL CHAT CHANNELS & BROADCASTS (8.2)
// ====================================================================
export const INITIAL_CHAT_CHANNELS: any[] = [
  {
    id: 'chan-ops',
    name: 'Operations Channel',
    description: 'General fleet movements, hub shifts, battery swaps, and operational broadcasts',
    is_system: true,
    allowed_roles: ['owner', 'manager', 'rsa', 'mechanic'],
    created_by: 'usr-01',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'chan-mech',
    name: 'Mechanics Channel',
    description: 'Job card updates, defect reports, spare part requisitions, and technical SOPs',
    is_system: true,
    allowed_roles: ['owner', 'manager', 'mechanic'],
    created_by: 'usr-01',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'chan-acc',
    name: 'Accounts Channel',
    description: 'Refund disputes verification, bank payouts, wallet reversals, and financial reconciliations',
    is_system: true,
    allowed_roles: ['owner', 'manager'],
    created_by: 'usr-01',
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_CHANNEL_MESSAGES: any[] = [
  {
    id: 'msg-01',
    channel_id: 'chan-ops',
    sender_id: 'usr-01',
    sender_name: 'Bhuvnesh Kumar',
    sender_role: 'Super Admin (Owner)',
    content: 'Welcome team. All 13 Mumbai hubs are now live on the EzEv Ops platform. Please ensure daily shift logs are submitted at the end of each shift.',
    created_at: '2026-08-27T09:00:00Z',
  },
  {
    id: 'msg-02',
    channel_id: 'chan-mech',
    sender_id: 'usr-06',
    sender_name: 'Ramesh Vishwakarma',
    sender_role: 'Hub Maintenance Mechanic',
    content: 'Job Card #1002 disc pad replacement completed. Scooter is ready for release back to NMIMS hub.',
    created_at: '2026-08-27T19:45:00Z',
  },
  {
    id: 'msg-03',
    channel_id: 'chan-acc',
    sender_id: 'usr-02',
    sender_name: 'Yugdeep Handa',
    sender_role: 'Hub Operations Manager',
    content: 'Verified 3 customer refund disputes from yesterday ride cancellations. Ready for final settlement review.',
    created_at: '2026-08-27T14:10:00Z',
  },
];

