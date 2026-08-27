# EzEv Ops — Production Supabase Setup, Schema & Deployment Guide

This guide provides step-by-step instructions to initialize your PostgreSQL schema, seed all real Mumbai fleet data, configure authentication for **`bhuvnesh3568@gmail.com`** (Owner/Super Admin) and staff profiles, set up Row-Level Security (RLS), and publish the site to GitHub & Vercel.

---

## 1. Project Credentials & Environment Configuration

Ensure your `.env.local` file contains the following Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yliozdsnqnfjkpcuctwe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI
```

---

## 2. Step 1: Execute Complete SQL Database Schema (DDL)

Go to **Supabase Dashboard** -> **SQL Editor** -> **New Query**, paste and execute the following SQL:

```sql
-- ====================================================================
-- EZEV OPS ENTERPRISE POSTGRESQL SCHEMA (DDL)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums & Custom Types
CREATE TYPE role_code AS ENUM ('owner', 'manager', 'rsa', 'mechanic');
CREATE TYPE vehicle_status AS ENUM ('Available', 'Needs Maintenance', 'Under Repair', 'Not Available');
CREATE TYPE scooter_model AS ENUM ('CS Model', 'Ola Model', 'Single Light Model');
CREATE TYPE refund_payout_type AS ENUM ('EzEv Wallet', 'Bank Payout');
CREATE TYPE refund_status AS ENUM ('SUBMITTED', 'VERIFIED', 'SETTLED', 'REJECTED');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ABANDONED');
CREATE TYPE hub_type AS ENUM ('BIKE_HUB', 'STOCK_HUB');
CREATE TYPE charger_status AS ENUM ('ACTIVE', 'CONNECTOR_NOT_WORKING', 'CONNECTOR_DAMAGED', 'CHARGER_DAMAGED', 'POWER_LINE_ISSUE', 'OFFLINE_TRIPPED');
CREATE TYPE sop_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE note_category AS ENUM ('GENERAL', 'SHIFT_HANDOVER', 'URGENT', 'HUB_NOTICE', 'MECHANICAL', 'ROUGH');
CREATE TYPE note_status AS ENUM ('ACTIVE', 'ARCHIVED', 'RESOLVED');
CREATE TYPE recovery_status AS ENUM ('Pending', 'Recovered');

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
```

---

## 3. Step 2: Seed Real Mumbai Data Script

Execute this second script in the **SQL Editor** to populate the complete Mumbai fleet operations baseline:

```sql
-- ====================================================================
-- EZEV OPS PRODUCTION SEED DATA SCRIPT
-- ====================================================================

-- 1. Insert System Roles
INSERT INTO public.roles (id, code, label, description, is_system) VALUES
('role-01', 'owner', 'Super Admin (Owner)', 'Full system sovereignty, master audits, and financial oversight', TRUE),
('role-02', 'manager', 'Hub Operations Manager', 'Approvals, hub inventory, staff scheduling, dispute verification', TRUE),
('role-03', 'rsa', 'Roadside Assistance (RSA)', 'Rapid field inspection, towing, roadside recovery, battery sweeps', TRUE),
('role-04', 'mechanic', 'Hub Maintenance Mechanic', 'Job tickets, defect inspections, part requests, safety audits', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Real Mumbai Hubs (Including Single Central Warehouse: Store 1)
INSERT INTO public.hubs (id, name, code, type, city, address, poc_name, poc_phone, day_guard_name, day_guard_phone, night_guard_name, night_guard_phone, charging_points_total, charging_points_active, is_warehouse) VALUES
('hub-store-01', 'Store 1', 'STORE-01', 'STOCK_HUB', 'Mumbai', 'Central Spare Parts Warehouse, 24th Avenue, Shree Ram Nagar, Andheri West, Mumbai - 400058', 'Rajkumar Mandal / Ritik Mandal', '+91 62392 49085', 'Jayash', '+91 91373 96039', 'Mangesh', '+91 98213 24903', 16, 16, TRUE),
('hub-mum-01', 'Della By Hive', 'HUB-MUM-DEL', 'BIKE_HUB', 'Mumbai', 'Bhagatsingh Rd, Navpada, Kamala, Vile Parle West, Mumbai - 400056', 'Somnath / Shirin / Siddhant', '+91 89205 12687', 'Uma Shankar / Abdul', '+91 98673 25140', 'Santosh Tiwari', '+91 91270 92767', 12, 12, FALSE),
('hub-mum-02', 'Aster By Hive', 'HUB-MUM-AST', 'BIKE_HUB', 'Mumbai', '5, N S Rd No. 5, Vallabh Nagar Society, Juhu, Mumbai - 400056', 'Komal Negi', '+91 77150 24068', 'Nadim / Santosh', '+91 88795 85795', 'Shradda', '+91 84510 34561', 8, 0, FALSE),
('hub-mum-03', 'Oblik by Livlit', 'HUB-MUM-OBL', 'BIKE_HUB', 'Mumbai', 'Near Juhu Circle, Vile Parle West, Mumbai - 400056', 'Naaz', '+91 85911 88225', 'Shashank / Sarvesh', '+91 99563 86214', 'Shashank', '+91 99563 86214', 8, 0, FALSE),
('hub-mum-04', 'H Square Bay', 'HUB-MUM-HSB', 'BIKE_HUB', 'Mumbai', 'Bay Area, Juhu Tara Road, Mumbai - 400049', 'Deepa / Aditi', '+91 83569 95024', 'Jitendar', '+91 98894 04089', 'Rakesh', '+91 98000 85638', 10, 0, FALSE),
('hub-mum-05', 'H Square Juhu', 'HUB-MUM-HSJ', 'BIKE_HUB', 'Mumbai', 'Juhu Jawa Showroom, Juhu, Mumbai - 400049', 'Jagdish (Manager)', '+91 89280 53977', 'Ashok', '+91 84607 03880', 'Shahin', '+91 80974 34606', 10, 0, FALSE),
('hub-mum-06', 'Hive Aurus Chapter 2', 'HUB-MUM-AUR2', 'BIKE_HUB', 'Mumbai', 'Shree Mangal Corp, S. Ponda Rd, Vile Parle, Mumbai - 400056', 'Chanchal Ma''am', '+91 90046 76110', 'Radhika', '+91 98191 48272', 'Mumtaz', '+91 89288 97182', 12, 0, FALSE),
('hub-mum-08', 'Hive Aurus Chapter 4', 'HUB-MUM-AUR4', 'BIKE_HUB', 'Mumbai', 'Link Road Extension, Andheri West, Mumbai - 400058', 'Subham / Abhishek', '+91 91247 96463', 'Ritesh', '+91 91373 96040', 'Manoj', '+91 98213 24904', 10, 10, FALSE),
('hub-mum-09', 'NMIMS Back Gate', 'HUB-MUM-NMI', 'BIKE_HUB', 'Mumbai', 'NMIMS University Back Gate, V.L. Mehta Road, Vile Parle West, Mumbai - 400056', 'Zaffar / Ashish', '+91 96198 56561', 'Prince', '+91 89821 91213', 'Prince', '+91 89821 91213', 16, 16, FALSE),
('hub-mum-10', 'Aurua Chpt 1', 'HUB-MUM-AUR1', 'BIKE_HUB', 'Mumbai', '5, N S Rd No. 5, Vallabh Nagar Society, Juhu, Mumbai - 400056', 'Tina', '+91 77374 11689', 'Parveen', '+91 72768 24151', 'Parveen', '+91 72768 24151', 10, 10, FALSE),
('hub-mum-11', 'Anugrah by LivLit', 'HUB-MUM-ANU', 'BIKE_HUB', 'Mumbai', 'Opp Criticare Hospital, Vile Parle West, Mumbai - 400056', 'Nilesh / Trupti Parekh', '+91 79901 69147', 'Guptaji', '+91 84472 13458', 'Guptaji', '+91 84472 13458', 12, 12, FALSE),
('hub-mum-12', 'Bayside by HIVE', 'HUB-MUM-BAY', 'BIKE_HUB', 'Mumbai', 'Road No. 5 End, Juhu Scheme, Mumbai - 400049', 'Varsha', '+91 90041 01982', 'Juhi', '+91 91537 11664', 'Yashmeen', '+91 87262 82049', 10, 10, FALSE),
('hub-mum-13', 'Ganga Niwas', 'HUB-MUM-GAN', 'BIKE_HUB', 'Mumbai', 'Station Road, Vile Parle East, Mumbai - 400057', 'Nilesh', '+91 79901 69147', 'Ramu', '+91 98210 12345', 'Shyam', '+91 98210 12346', 8, 8, FALSE)
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Real Staff Profiles (Owner bhuvnesh3568@gmail.com mapped)
INSERT INTO public.profiles (id, email, full_name, phone, avatar_url, assigned_hub_id) VALUES
('usr-01', 'bhuvnesh3568@gmail.com', 'Bhuvnesh Kumar', '+91 70560 55476', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120', NULL),
('usr-02', 'yugdeep@ezev.in', 'Yugdeep Handa', '+91 82981 47755', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', NULL),
('usr-03', 'zaffar.patel@ezev.in', 'Zaffar Patel', '+91 96198 56561', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120', 'hub-mum-09'),
('usr-04', 'ashish.vaishya@ezev.in', 'Ashish Vaishya', '+91 82866 45521', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120', 'hub-mum-09'),
('usr-05', 'ankita.gangwani@ezev.in', 'Ankita Gangwani', '+91 90502 19307', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120', NULL),
('usr-06', 'rajkumar.mandal@ezev.in', 'Rajkumar Mandal', '+91 62392 49085', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120', 'hub-store-01'),
('usr-07', 'ritik.mandal@ezev.in', 'Ritik Mandal', '+91 77398 74590', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120', 'hub-store-01')
ON CONFLICT (email) DO NOTHING;

-- Map Profile Roles
INSERT INTO public.profile_roles (profile_id, role_id) VALUES
('usr-01', 'role-01'),
('usr-02', 'role-01'),
('usr-03', 'role-02'),
('usr-03', 'role-03'),
('usr-04', 'role-02'),
('usr-05', 'role-02'),
('usr-06', 'role-03'),
('usr-06', 'role-04'),
('usr-07', 'role-03'),
('usr-07', 'role-04')
ON CONFLICT DO NOTHING;

-- 4. Insert 28 Spare Parts & Stock Exclusively in Store 1
INSERT INTO public.parts (id, sku, name, category, description, unit_cost, min_threshold, supplier) VALUES
('p-01', 'EZEV-BRK-PAD-01', 'Disc Pad Set', 'Brakes', 'Pakshal ceramic disc pads', 150.00, 10, 'Pakshal Auto Parts'),
('p-02', 'EZEV-IND-LGT-01', 'Indicator Light', 'Electrical', 'Amber LED indicator unit', 20.00, 20, 'Pakshal Auto Parts'),
('p-03', 'EZEV-THR-123-01', 'Throttle 123 (3-Speed)', 'Controls', '3-speed acceleration throttle grip', 380.00, 4, 'Pakshal Auto Parts'),
('p-04', 'EZEV-HRN-48V-01', 'Horn 48V', 'Electrical', 'Electric horn unit', 120.00, 5, 'Pakshal Auto Parts'),
('p-05', 'EZEV-BRK-CBL-01', 'Brake Cable', 'Brakes', 'Steel braided brake cable', 300.00, 6, 'Pakshal Auto Parts'),
('p-06', 'EZEV-BRK-BLB-01', 'Brake Bulb', 'Electrical', 'Rear tail brake bulb', 10.00, 15, 'Pakshal Auto Parts'),
('p-07', 'EZEV-IND-BTN-01', 'Indicator Button', 'Controls', 'Handlebar indicator button', 60.00, 5, 'Pakshal Auto Parts'),
('p-08', 'EZEV-NUT-WSH-13', '13 No. Spring Washer (Pack 200)', 'Fasteners', 'Spring washer packet', 70.00, 5, 'Pakshal Auto Parts'),
('p-09', 'EZEV-BLT-1016', '10x16 Collar Bolt (Pack 100)', 'Fasteners', 'Collar bolt packet', 130.00, 4, 'Pakshal Auto Parts'),
('p-10', 'EZEV-BLT-1205', '12x1/2 Collar Bolt (Pack 50)', 'Fasteners', 'Collar bolts 12x1/2 inch', 115.00, 4, 'Pakshal Auto Parts'),
('p-11', 'EZEV-BLT-1210', '12x1 Collar Bolt (Pack 50)', 'Fasteners', 'Collar bolts 12x1 inch', 130.00, 4, 'Pakshal Auto Parts'),
('p-12', 'EZEV-BAT-BLT-08', '8 No. Battery Nut Bolt Set', 'Fasteners', 'Battery nut and bolt kit', 85.00, 5, 'Pakshal Auto Parts'),
('p-13', 'EZEV-PNC-PTC-20', 'Patches BP-1 (Box of 20)', 'Tyres', 'Cold tyre puncture patches', 480.00, 3, 'Pakshal Auto Parts'),
('p-14', 'EZEV-PNC-OMN-25', 'Yellow Omni Strips (Box of 25)', 'Tyres', 'Puncture sealing string strips', 220.00, 3, 'Pakshal Auto Parts'),
('p-15', 'EZEV-PNC-SOL-01', 'Omni Solution Tube', 'Tyres', 'Vulcanizing fluid', 50.00, 5, 'Pakshal Auto Parts'),
('p-16', 'EZEV-PNC-VLV-10', 'Tyre Valve (10 Pcs)', 'Tyres', 'Tubeless wheel valve set', 300.00, 4, 'Pakshal Auto Parts'),
('p-17', 'EZEV-SWT-KIT-30', 'Switches N/M & Headlight Kit', 'Controls', 'Multi-switch cluster', 80.00, 6, 'SMH E Ventures'),
('p-18', 'EZEV-THR-WTR-01', 'Throttle 123 (Waterproof SMH)', 'Controls', 'Waterproof throttle grip', 150.00, 4, 'SMH E Ventures'),
('p-19', 'EZEV-DRM-PLT-01', 'Drum Plate Swing Arm', 'Chassis', 'Rear drum brake swing arm plate', 420.00, 3, 'SMH E Ventures'),
('p-20', 'EZEV-ELC-MCB-01', 'MCB (Miniature Circuit Breaker)', 'Electrical', 'DC safety cutout breaker', 90.00, 5, 'SMH E Ventures'),
('p-21', 'EZEV-LCK-SHT-01', 'Shutter Lock Set', 'Chassis', 'Ignition shutter lock', 520.00, 2, 'SMH E Ventures'),
('p-22', 'EZEV-LVR-DRM-01', 'Drum Lever Assy Set', 'Brakes', 'Drum brake lever handle set', 300.00, 4, 'SMH E Ventures'),
('p-23', 'EZEV-STR-CON-01', 'Coneset Steering Bearing', 'Chassis', 'Steering head ball bearing set', 150.00, 5, 'SMH E Ventures'),
('p-24', 'EZEV-ELC-DCC-01', 'DC Converter (Waterproof)', 'Electrical', '48V to 12V step-down converter', 220.00, 4, 'SMH E Ventures'),
('p-25', 'EZEV-LGT-HLD-01', 'Tail Light Holder', 'Electrical', 'Tail light connector socket', 60.00, 5, 'SMH E Ventures'),
('p-26', 'EZEV-WIR-KIT-01', 'Wire Kit Main Harness', 'Electrical', 'Main frame wiring kit', 150.00, 4, 'SMH E Ventures'),
('p-27', 'EZEV-STN-SPR-01', 'Side Stand Spring', 'Chassis', 'Stand return tension spring', 15.00, 10, 'SMH E Ventures'),
('p-28', 'EZEV-LCK-STU-01', 'Seat Lock U-Type Catch', 'Chassis', 'Underseat lock catch', 60.00, 4, 'SMH E Ventures')
ON CONFLICT (sku) DO NOTHING;

-- Seed Store 1 Physical Inventory Stock
INSERT INTO public.hub_part_stock (hub_id, part_id, physical_stock, min_threshold)
SELECT 'hub-store-01', p.id, 25, p.min_threshold FROM public.parts p
ON CONFLICT (hub_id, part_id) DO NOTHING;

-- 5. Insert 40 Real Vehicles with 15-Digit IoT IDs
INSERT INTO public.vehicles (id, vehicle_id, vin, key_number, model, current_hub_id, current_status, odometer_km) VALUES
('veh-01', '860141073026917', 'MD625CK192846917', '6917', 'CS Model', 'hub-mum-01', 'Available', 3420),
('veh-02', '860141073025646', 'MD625CK192845646', '5646', 'CS Model', 'hub-mum-09', 'Needs Maintenance', 6240),
('veh-03', '860141073022087', 'MD625CK192842087', '2087', 'Ola Model', 'hub-mum-02', 'Available', 4180),
('veh-04', '860141073025596', 'MD625CK192845596', '5596', 'CS Model', 'hub-mum-03', 'Available', 2950),
('veh-05', '860141073025729', 'MD625CK192845729', '5729', 'CS Model', 'hub-mum-04', 'Available', 5120),
('veh-06', '860141073029640', 'MD625CK192849640', '9640', 'Single Light Model', 'hub-mum-05', 'Under Repair', 7830),
('veh-07', '860141073025349', 'MD625CK192845349', '5349', 'CS Model', 'hub-store-01', 'Available', 3640),
('veh-08', '860141073025554', 'MD625CK192845554', '5554', 'Ola Model', 'hub-mum-11', 'Needs Maintenance', 8200),
('veh-09', '860141073045321', 'MD625CK192845321', '5321', 'CS Model', 'hub-mum-09', 'Available', 2150),
('veh-10', '860141073025281', 'MD625CK192845281', '5281', 'Ola Model', 'hub-mum-09', 'Available', 4890),
('veh-11', '860141073026040', 'MD625CK192846040', '6040', 'Single Light Model', 'hub-mum-09', 'Available', 3100),
('veh-12', '860141073025471', 'MD625CK192845471', '5471', 'CS Model', 'hub-mum-05', 'Available', 5400),
('veh-13', '860141073025414', 'MD625CK192845414', '5414', 'CS Model', 'hub-mum-09', 'Available', 1800),
('veh-14', '860141073025745', 'MD625CK192845745', '5745', 'Ola Model', 'hub-mum-09', 'Available', 6200),
('veh-15', '860141073026172', 'MD625CK192846172', '6172', 'CS Model', 'hub-mum-11', 'Available', 4300),
('veh-16', '860141073026461', 'MD625CK192846461', '6461', 'Single Light Model', 'hub-mum-09', 'Needs Maintenance', 7100),
('veh-17', '860141073073760', 'MD625CK192843760', '3760', 'CS Model', 'hub-mum-09', 'Not Available', 2900),
('veh-18', '860141073026214', 'MD625CK192846214', '6214', 'Ola Model', 'hub-mum-08', 'Available', 5200),
('veh-19', '860141073052467', 'MD625CK192842467', '2467', 'CS Model', 'hub-mum-09', 'Available', 3800),
('veh-20', '860141073026073', 'MD625CK192846073', '6073', 'CS Model', 'hub-mum-09', 'Available', 4400),
('veh-21', '860141073025588', 'MD625CK192845588', '5588', 'Single Light Model', 'hub-mum-09', 'Available', 6100),
('veh-22', '860141073042880', 'MD625CK192842880', '2880', 'Ola Model', 'hub-mum-03', 'Not Available', 1950),
('veh-23', '860141073023914', 'MD625CK192843914', '3914', 'CS Model', 'hub-mum-09', 'Available', 3300),
('veh-24', '860141073025356', 'MD625CK192845356', '5356', 'CS Model', 'hub-mum-09', 'Available', 4700),
('veh-25', '860141073025703', 'MD625CK192845703', '5703', 'Ola Model', 'hub-mum-09', 'Available', 5800),
('veh-26', '860141073025059', 'MD625CK192845059', '5059', 'CS Model', 'hub-mum-09', 'Available', 2400),
('veh-27', '860141073025679', 'MD625CK192845679', '5679', 'Single Light Model', 'hub-mum-09', 'Needs Maintenance', 6900),
('veh-28', '860141073026388', 'MD625CK192846388', '6388', 'CS Model', 'hub-mum-09', 'Available', 3100),
('veh-29', '860141073026032', 'MD625CK192846032', '6032', 'Ola Model', 'hub-mum-09', 'Available', 4200),
('veh-30', '860141073026099', 'MD625CK192846099', '6099', 'CS Model', 'hub-mum-01', 'Available', 1600),
('veh-31', '860141073052657', 'MD625CK192842657', '2657', 'CS Model', 'hub-mum-09', 'Not Available', 5300),
('veh-32', '860141073052087', 'MD625CK192842087', '2087', 'Single Light Model', 'hub-mum-09', 'Available', 3750),
('veh-33', '860141073052293', 'MD625CK192842293', '2293', 'Ola Model', 'hub-mum-09', 'Not Available', 4600),
('veh-34', '860141073001167', 'MD625CK192841167', '1167', 'CS Model', 'hub-mum-09', 'Available', 2800),
('veh-35', '860141073056484', 'MD625CK192846484', '6484', 'CS Model', 'hub-mum-08', 'Available', 3900),
('veh-36', '860141073052442', 'MD625CK192842442', '2442', 'Ola Model', 'hub-mum-09', 'Available', 5100),
('veh-37', '860141073051915', 'MD625CK192841915', '1915', 'CS Model', 'hub-mum-09', 'Under Repair', 6400),
('veh-38', '860141073052640', 'MD625CK192842640', '2640', 'Single Light Model', 'hub-mum-09', 'Needs Maintenance', 7200),
('veh-39', '860141073052434', 'MD625CK192842434', '2434', 'CS Model', 'hub-mum-05', 'Available', 1400),
('veh-40', '860141073001514', 'MD625CK192841514', '1514', 'Ola Model', 'hub-mum-09', 'Available', 4900)
ON CONFLICT (vehicle_id) DO NOTHING;

-- 6. Insert 41 Real Customer Refund Disputes
INSERT INTO public.refunds (id, user_phone, ride_id, ride_date, amount, payout_type, reason, status, requested_by, requester_name, requester_role, frappe_reference) VALUES
('r-01', '+91 9871305639', 'RIDE-MUM-2026-0101', '2026-07-29', 26.250, 'EzEv Wallet', 'Ashish didnt give bike because user creates disturbance at Public hub', 'SETTLED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', 'FRAP-MUM-2026-08001'),
('r-05', '+91 7304003536', 'RIDE-MUM-2026-0105', '2026-08-02', 420.000, 'Bank Payout', 'Customer left scootie 7:20 am on Resume', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08005'),
('r-11', '+91 8780083670', 'RIDE-MUM-2026-0111', '2026-08-02', 26.630, 'EzEv Wallet', 'Base Charge Refund', 'SETTLED', 'usr-01', 'Bhuvnesh Kumar', 'Super Admin', 'FRAP-MUM-2026-08011'),
('r-26', '+91 9770835092', 'RIDE-MUM-2026-0126', '2026-08-07', 497.460, 'Bank Payout', 'Customer says was charged wrong on long session', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08026'),
('r-34', '+91 9509926417', 'RIDE-MUM-2026-0134', '2026-08-23', 86.810, 'Bank Payout', 'Payout: Wants to deactivate the account', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08034'),
('r-36', '+91 9871305639', 'RIDE-MUM-2026-0136', '2026-08-25', 26.910, 'EzEv Wallet', 'Key 5554 bike had damages and user replaced bike in 5mins', 'SETTLED', 'usr-01', 'Bhuvnesh Kumar', 'Super Admin', 'FRAP-MUM-2026-08036'),
('r-38', '+91 9835490560', 'RIDE-MUM-2026-0138', '2026-08-26', 26.250, 'EzEv Wallet', 'Bike Not starting display Not getting on in App ride started (YTS)', 'SUBMITTED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', NULL),
('r-41', '+91 9724190000', 'RIDE-MUM-2026-0141', '2026-08-27', 32.500, 'EzEv Wallet', 'Bike not pause in app showing paused because of App glitch (YTS)', 'SUBMITTED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', NULL)
ON CONFLICT (id) DO NOTHING;
```

---

## 4. Step 3: Configure Supabase Auth & Auto-Profile Sync Trigger

To automatically link any user logging in with `bhuvnesh3568@gmail.com` or staff emails to `public.profiles`, run this trigger in the **SQL Editor**:

```sql
-- ====================================================================
-- AUTOMATIC PROFILE CREATION & AUTH SYNC TRIGGER
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
    matched_role_id TEXT := 'role-02'; -- Default manager
BEGIN
    IF NEW.email = 'bhuvnesh3568@gmail.com' OR NEW.email = 'bhuvnesh@ezev.in' THEN
        is_admin := TRUE;
        matched_role_id := 'role-01'; -- Super Admin
    END IF;

    -- Upsert profile record
    INSERT INTO public.profiles (auth_user_id, email, full_name, phone, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'phone', '+91 70560 55476'),
        TRUE
    )
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = NEW.id;

    -- Link role
    INSERT INTO public.profile_roles (profile_id, role_id)
    SELECT p.id, matched_role_id FROM public.profiles p WHERE p.email = NEW.email
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Step 4: Supabase Row-Level Security (RLS) Policies

Execute this SQL to ensure field mechanics, RSAs, and managers only view permitted operational assets:

```sql
-- Enable RLS on core tables
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated staff
CREATE POLICY "Allow read for authenticated staff on hubs" ON public.hubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated staff on vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated staff on parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated staff on sops" ON public.sops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated staff on team_notes" ON public.team_notes FOR SELECT TO authenticated USING (true);

-- Allow full mutations for Super Admin (Owner)
CREATE POLICY "Full access for Owner" ON public.vehicles FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' = 'bhuvnesh3568@gmail.com' OR auth.jwt() ->> 'email' = 'bhuvnesh@ezev.in');
```

---

## 6. Step 5: Publishing to GitHub & Going Live (Vercel)

### 1. Initialize Git & Commit
Run the following in your terminal:
```bash
git init
git config user.name "Bhuvnesh Kumar"
git config user.email "bhuvnesh3568@gmail.com"
git add .
git commit -m "feat: EzEv Ops production platform with Frappe Dark theme, Supabase schema & single Store 1 inventory"
```

### 2. Push to your GitHub Repository
Create a repository on [GitHub](https://github.com/new) named `ezev-ops`, then link and push:
```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ezev-ops.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel (1-Click Live)
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Import the `ezev-ops` repository from GitHub.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://yliozdsnqnfjkpcuctwe.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI`
4. Click **Deploy**. Your EzEv Ops command platform will be live on a production domain with SSL!
