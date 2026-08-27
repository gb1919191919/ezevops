-- ====================================================================
-- EZEV OPS ENTERPRISE POSTGRESQL SCHEMA (DDL)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums & Custom Types
DO $$ BEGIN
    CREATE TYPE role_code AS ENUM ('owner', 'manager', 'rsa', 'mechanic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM ('Available', 'Needs Maintenance', 'Under Repair', 'Not Available');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE scooter_model AS ENUM ('CS Model', 'Ola Model', 'Single Light Model');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE refund_payout_type AS ENUM ('EzEv Wallet', 'Bank Payout');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('SUBMITTED', 'VERIFIED', 'SETTLED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE hub_type AS ENUM ('BIKE_HUB', 'STOCK_HUB');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE charger_status AS ENUM ('ACTIVE', 'CONNECTOR_NOT_WORKING', 'CONNECTOR_DAMAGED', 'CHARGER_DAMAGED', 'POWER_LINE_ISSUE', 'OFFLINE_TRIPPED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE sop_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE note_category AS ENUM ('GENERAL', 'SHIFT_HANDOVER', 'URGENT', 'HUB_NOTICE', 'MECHANICAL', 'ROUGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE note_status AS ENUM ('ACTIVE', 'ARCHIVED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE recovery_status AS ENUM ('Pending', 'Recovered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Hubs Table (Includes Single Central Warehouse: Store 1)
CREATE TABLE IF NOT EXISTS public.hubs (
    id TEXT PRIMARY KEY DEFAULT 'hub-' || uuid_generate_v4()::text,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    type hub_type NOT NULL DEFAULT 'BIKE_HUB',
    city TEXT NOT NULL DEFAULT 'Mumbai',
    address TEXT NOT NULL,
    poc_name TEXT NOT NULL,
    poc_phone TEXT NOT NULL,
    day_guard_name TEXT,
    day_guard_phone TEXT,
    night_guard_name TEXT,
    night_guard_phone TEXT,
    day_guard_details TEXT,
    night_guard_details TEXT,
    charging_points_total INTEGER NOT NULL DEFAULT 10,
    charging_points_active INTEGER NOT NULL DEFAULT 10,
    is_warehouse BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Charger Logs Table
CREATE TABLE IF NOT EXISTS public.charger_logs (
    id TEXT PRIMARY KEY DEFAULT 'cl-' || uuid_generate_v4()::text,
    hub_id TEXT REFERENCES public.hubs(id) ON DELETE CASCADE,
    charger_name TEXT NOT NULL,
    connector_number TEXT,
    status charger_status NOT NULL DEFAULT 'ACTIVE',
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reported_by TEXT NOT NULL,
    remarks TEXT
);

-- 5. Staff Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY DEFAULT 'usr-' || uuid_generate_v4()::text,
    auth_user_id UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar_url TEXT,
    assigned_hub_id TEXT REFERENCES public.hubs(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Roles and Permissions Table
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY DEFAULT 'role-' || uuid_generate_v4()::text,
    code role_code NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.profile_roles (
    profile_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id TEXT REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, role_id)
);

-- 7. Vehicles Fleet Table (15-Digit IoT IDs)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY DEFAULT 'veh-' || uuid_generate_v4()::text,
    vehicle_id TEXT NOT NULL UNIQUE, -- 14-15 digit numerical IoT IMEI string
    vin TEXT NOT NULL,
    key_number TEXT NOT NULL,
    model scooter_model NOT NULL DEFAULT 'CS Model',
    current_hub_id TEXT REFERENCES public.hubs(id) ON DELETE SET NULL,
    current_status vehicle_status NOT NULL DEFAULT 'Available',
    pending_status vehicle_status,
    status_change_reason TEXT,
    odometer_km INTEGER,
    last_odometer_updated_at TIMESTAMPTZ,
    last_odometer_updated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_inspected_at TIMESTAMPTZ,
    last_inspected_by TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Vehicle Inspections Table
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
    id TEXT PRIMARY KEY DEFAULT 'insp-' || uuid_generate_v4()::text,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
    hub_id TEXT REFERENCES public.hubs(id) ON DELETE CASCADE,
    inspector_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    inspector_name TEXT NOT NULL,
    odometer_km INTEGER NOT NULL,
    brakes_passed BOOLEAN NOT NULL DEFAULT TRUE,
    throttle_passed BOOLEAN NOT NULL DEFAULT TRUE,
    tyres_passed BOOLEAN NOT NULL DEFAULT TRUE,
    lights_passed BOOLEAN NOT NULL DEFAULT TRUE,
    stand_sensor_passed BOOLEAN NOT NULL DEFAULT TRUE,
    bms_health_passed BOOLEAN NOT NULL DEFAULT TRUE,
    recommended_status vehicle_status NOT NULL DEFAULT 'Available',
    notes TEXT,
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Spare Parts Catalog & Single "Store 1" Warehouse
CREATE TABLE IF NOT EXISTS public.parts (
    id TEXT PRIMARY KEY DEFAULT 'p-' || uuid_generate_v4()::text,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_threshold INTEGER NOT NULL DEFAULT 5,
    supplier TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hub_part_stock (
    id TEXT PRIMARY KEY DEFAULT 'hs-' || uuid_generate_v4()::text,
    hub_id TEXT REFERENCES public.hubs(id) ON DELETE CASCADE, -- Single Warehouse: 'hub-store-01'
    part_id TEXT REFERENCES public.parts(id) ON DELETE CASCADE,
    physical_stock INTEGER NOT NULL DEFAULT 0,
    pending_allocated_stock INTEGER NOT NULL DEFAULT 0,
    min_threshold INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (hub_id, part_id)
);

CREATE TABLE IF NOT EXISTS public.part_usage_logs (
    id TEXT PRIMARY KEY DEFAULT 'usg-' || uuid_generate_v4()::text,
    part_id TEXT REFERENCES public.parts(id) ON DELETE CASCADE,
    hub_id TEXT REFERENCES public.hubs(id) ON DELETE CASCADE,
    vehicle_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    used_by_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    used_by_name TEXT NOT NULL,
    recipient_name TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Job Cards Table
CREATE TABLE IF NOT EXISTS public.job_cards (
    id TEXT PRIMARY KEY DEFAULT 'job-' || uuid_generate_v4()::text,
    ticket_number SERIAL UNIQUE,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
    reported_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_mechanic_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    hub_id TEXT REFERENCES public.hubs(id) ON DELETE CASCADE,
    odometer_km INTEGER,
    issue_description TEXT NOT NULL,
    solution_applied TEXT,
    photos_url TEXT[],
    status approval_status NOT NULL DEFAULT 'PENDING',
    approved_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    approval_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.job_card_parts (
    id TEXT PRIMARY KEY DEFAULT 'jcp-' || uuid_generate_v4()::text,
    job_card_id TEXT REFERENCES public.job_cards(id) ON DELETE CASCADE,
    part_id TEXT REFERENCES public.parts(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Customer Refund Disputes Table (Exact 3-Decimal Precision)
CREATE TABLE IF NOT EXISTS public.refunds (
    id TEXT PRIMARY KEY DEFAULT 'r-' || uuid_generate_v4()::text,
    user_phone TEXT NOT NULL,
    ride_id TEXT NOT NULL,
    ride_date DATE NOT NULL,
    amount NUMERIC(12, 3) NOT NULL, -- Precision up to 3 decimal points (e.g. 26.367)
    payout_type refund_payout_type NOT NULL DEFAULT 'EzEv Wallet',
    reason TEXT NOT NULL,
    internal_remarks TEXT,
    frappe_reference TEXT,
    status refund_status NOT NULL DEFAULT 'SUBMITTED',
    requested_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    requester_name TEXT NOT NULL,
    requester_role TEXT NOT NULL,
    approved_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    settled_at TIMESTAMPTZ,
    settled_by_name TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Objectives & Hierarchical Tasks
CREATE TABLE IF NOT EXISTS public.objectives (
    id TEXT PRIMARY KEY DEFAULT 'obj-' || uuid_generate_v4()::text,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_date DATE,
    target_date DATE NOT NULL,
    hub_id TEXT REFERENCES public.hubs(id) ON DELETE CASCADE,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY DEFAULT 'tsk-' || uuid_generate_v4()::text,
    objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT[] NOT NULL DEFAULT '{}',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    status task_status NOT NULL DEFAULT 'TODO',
    vehicle_id TEXT,
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_remarks (
    id TEXT PRIMARY KEY DEFAULT 'rem-' || uuid_generate_v4()::text,
    task_id TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_role TEXT,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Standard Operating Procedures (SOPs) & Version Control
CREATE TABLE IF NOT EXISTS public.sops (
    id TEXT PRIMARY KEY DEFAULT 'sop-' || uuid_generate_v4()::text,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    status sop_status NOT NULL DEFAULT 'PUBLISHED',
    content TEXT NOT NULL,
    summary TEXT NOT NULL,
    author_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    access_roles TEXT[] NOT NULL DEFAULT '{owner,manager,rsa,mechanic}',
    view_count INTEGER NOT NULL DEFAULT 0,
    acknowledged_by TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sop_revisions (
    id TEXT PRIMARY KEY DEFAULT 'sop-rev-' || uuid_generate_v4()::text,
    sop_id TEXT REFERENCES public.sops(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_name TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    content TEXT NOT NULL
);

-- 14. Team Notes & Scratchpad with Disposal Lifecycle
CREATE TABLE IF NOT EXISTS public.team_notes (
    id TEXT PRIMARY KEY DEFAULT 'note-' || uuid_generate_v4()::text,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category note_category NOT NULL DEFAULT 'GENERAL',
    status note_status NOT NULL DEFAULT 'ACTIVE',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    tags TEXT[] NOT NULL DEFAULT '{}',
    hub_id TEXT REFERENCES public.hubs(id) ON DELETE SET NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    author_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Blocked Users & Vehicle Recovery Table
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id TEXT PRIMARY KEY DEFAULT 'blk-' || uuid_generate_v4()::text,
    employee_name TEXT NOT NULL,
    date DATE NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_no TEXT NOT NULL,
    reason TEXT NOT NULL,
    recovery_status recovery_status NOT NULL DEFAULT 'Pending',
    recovery_amount NUMERIC(10, 2) NOT NULL DEFAULT 200.00
);

-- 16. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'audit-' || uuid_generate_v4()::text,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT,
    performer_name TEXT,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security (RLS) Policies
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow read for authenticated staff on hubs" ON public.hubs FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow read for authenticated staff on vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow read for authenticated staff on parts" ON public.parts FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow read for authenticated staff on sops" ON public.sops FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow read for authenticated staff on team_notes" ON public.team_notes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon read for public preview on hubs" ON public.hubs FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon read for public preview on vehicles" ON public.vehicles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
