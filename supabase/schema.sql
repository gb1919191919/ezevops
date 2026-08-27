-- ====================================================================
-- EZEV OPS - POSTGRESQL PRODUCTION SCHEMA (SUPABASE)
-- SPECIFICATION: INDIAN LOCALIZATION (₹ INR, +91 PHONES), 14-15 DIGIT IOT,
-- 4-DIGIT KEYS, STRICT 4 STATUSES, BIKE & STOCK HUBS, DYNAMIC RBAC, FRAPPE ERP
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE vehicle_status_enum AS ENUM (
        'Available',
        'Needs Maintenance',
        'Under Repair',
        'Not Available'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE scooter_model_enum AS ENUM (
        'CS Model',
        'Ola Model',
        'Single Light Model'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE hub_type_enum AS ENUM ('STOCK_HUB', 'BIKE_HUB');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE charger_status_enum AS ENUM (
        'ACTIVE',
        'CONNECTOR_NOT_WORKING',
        'CONNECTOR_DAMAGED',
        'CHARGER_DAMAGED',
        'POWER_LINE_ISSUE',
        'OFFLINE_TRIPPED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE refund_status_enum AS ENUM ('SUBMITTED', 'VERIFIED', 'SETTLED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_status_enum AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. PROFILES & RBAC
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL, -- Format: +91 XXXXX XXXXX
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 3. HUBS (STOCK HUBS VS BIKE HUBS) & CHARGER EQUIPMENT
CREATE TABLE IF NOT EXISTS hubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    type hub_type_enum NOT NULL DEFAULT 'BIKE_HUB',
    city TEXT NOT NULL, -- 'Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad'
    address TEXT NOT NULL,
    poc_name TEXT NOT NULL,
    poc_phone TEXT NOT NULL, -- +91...
    day_guard_name TEXT,
    day_guard_phone TEXT,
    night_guard_name TEXT,
    night_guard_phone TEXT,
    charging_points_total INT NOT NULL DEFAULT 0,
    charging_points_active INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub_chargers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID REFERENCES hubs(id) ON DELETE CASCADE,
    charger_name TEXT NOT NULL,
    connector_number TEXT,
    status charger_status_enum DEFAULT 'ACTIVE',
    reported_by TEXT,
    remarks TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VEHICLES & IOT REASSIGNMENT (14-15 DIGIT ID, 4-CHAR KEY, VIN)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(15) UNIQUE NOT NULL, -- 14-15 digit numerical IoT ID / IMEI
    key_number VARCHAR(4) NOT NULL,          -- 4-digit alphanumeric code ('B001', 'K104')
    vin VARCHAR(17) UNIQUE NOT NULL,         -- Chassis VIN string
    model scooter_model_enum NOT NULL DEFAULT 'CS Model',
    current_hub_id UUID REFERENCES hubs(id) ON DELETE RESTRICT,
    current_status vehicle_status_enum DEFAULT 'Available',
    pending_status vehicle_status_enum NULL,
    status_change_reason TEXT,
    odometer_km INT DEFAULT 0,               -- Only updated via manual logs/job cards
    last_odometer_updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_odometer_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SPARE PARTS & MULTI-LOCATION INVENTORY (IN ₹ INR)
CREATE TABLE IF NOT EXISTS parts_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    description TEXT,
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0), -- Cost in ₹ INR
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub_parts_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID REFERENCES hubs(id) ON DELETE RESTRICT,
    part_id UUID REFERENCES parts_inventory(id) ON DELETE RESTRICT,
    physical_stock INT NOT NULL DEFAULT 0 CHECK (physical_stock >= 0),
    pending_allocated_stock INT NOT NULL DEFAULT 0 CHECK (pending_allocated_stock >= 0),
    min_threshold INT DEFAULT 5,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hub_id, part_id)
);

-- 6. JOB CARDS & MAINTENANCE
CREATE TABLE IF NOT EXISTS job_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number SERIAL UNIQUE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
    reported_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    assigned_mechanic_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    hub_id UUID REFERENCES hubs(id) ON DELETE RESTRICT,
    odometer_km INT,
    issue_description TEXT NOT NULL,
    solution_applied TEXT,
    photos_url TEXT[],
    status approval_status_enum DEFAULT 'PENDING',
    approved_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    approval_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS job_card_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID REFERENCES job_cards(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts_inventory(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_cost_snapshot NUMERIC(12, 2) NOT NULL, -- Cost in ₹ INR
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CUSTOMER REFUNDS (FRAPPE ERP RECONCILIATION)
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_phone TEXT NOT NULL,
    ride_id TEXT NOT NULL,
    ride_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0), -- Amount in ₹ INR
    reason TEXT NOT NULL,
    internal_remarks TEXT,
    frappe_reference TEXT, -- Frappe ERP Payout / Voucher Ref
    proof_urls TEXT[],
    status refund_status_enum DEFAULT 'SUBMITTED',
    requested_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. OBJECTIVES & TASKS ENGINE (MULTI-ASSIGNEE)
CREATE TABLE IF NOT EXISTS objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    hub_id UUID REFERENCES hubs(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority task_priority_enum DEFAULT 'MEDIUM',
    status task_status_enum DEFAULT 'TODO',
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_assignees (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_remarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. IMMUTABLE AUDIT LOGS & ZERO HARD DELETES
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    performer_name TEXT,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (table_name, record_id, action, performed_by, performer_name, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        TG_OP,
        auth.uid(),
        (SELECT full_name FROM profiles WHERE id = auth.uid()),
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION prevent_hard_deletes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Hard DELETE is strictly prohibited. Please set is_active = FALSE for soft deletion.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_delete_vehicles ON vehicles;
CREATE TRIGGER prevent_delete_vehicles BEFORE DELETE ON vehicles FOR EACH ROW EXECUTE FUNCTION prevent_hard_deletes();

DROP TRIGGER IF EXISTS prevent_delete_hubs ON hubs;
CREATE TRIGGER prevent_delete_hubs BEFORE DELETE ON hubs FOR EACH ROW EXECUTE FUNCTION prevent_hard_deletes();
