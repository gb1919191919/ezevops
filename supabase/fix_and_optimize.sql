-- ====================================================================
-- EZEV OPS - SUPABASE REFINEMENTS, COMPLETE RLS POLICIES & SEED DATA
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charger_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_part_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_card_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies and create comprehensive policies
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'hubs', 'charger_logs', 'profiles', 'roles', 'profile_roles',
        'vehicles', 'vehicle_inspections', 'parts', 'hub_part_stock', 'part_usage_logs',
        'job_cards', 'job_card_parts', 'refunds', 'objectives', 'tasks', 'task_remarks',
        'sops', 'sop_revisions', 'team_notes', 'blocked_users', 'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_read_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_auth_all_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_service_role_all_%s" ON public.%I', t, t);
        
        -- Allow read access for public / anon client
        EXECUTE format('CREATE POLICY "allow_all_anon_read_%s" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t, t);
        
        -- Allow full access for authenticated staff
        EXECUTE format('CREATE POLICY "allow_all_auth_all_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
        
        -- Allow full access for service_role / admin
        EXECUTE format('CREATE POLICY "allow_service_role_all_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t, t);
    END LOOP;
END $$;

-- 3. Automatic Profile & Super Admin Auto-Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    matched_role_id TEXT := 'role-02'; -- Default manager
BEGIN
    IF NEW.email = 'bhuvnesh3568@gmail.com' OR NEW.email = 'bhuvnesh@ezev.in' THEN
        matched_role_id := 'role-01'; -- Super Admin (Owner)
    END IF;

    -- Upsert profile record
    INSERT INTO public.profiles (id, auth_user_id, email, full_name, phone, is_active)
    VALUES (
        'usr-' || SUBSTRING(NEW.id::text, 1, 8),
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

-- 4. Enable Supabase Realtime on core operational tables
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.refunds;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_notes;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_cards;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hubs;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.charger_logs;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_hub ON public.vehicles(current_hub_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(current_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_iot ON public.vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_key ON public.vehicles(key_number);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_phone ON public.refunds(user_phone);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON public.job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_veh ON public.job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_objective ON public.tasks(objective_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_team_notes_status ON public.team_notes(status);
CREATE INDEX IF NOT EXISTS idx_team_notes_hub ON public.team_notes(hub_id);
CREATE INDEX IF NOT EXISTS idx_hub_stock_hub ON public.hub_part_stock(hub_id);
CREATE INDEX IF NOT EXISTS idx_hub_stock_part ON public.hub_part_stock(part_id);

-- 6. Insert Complete Remaining Seed Datasets (Notes, Job Cards, Tasks, Objectives)

-- Team Notes
INSERT INTO public.team_notes (id, title, content, category, status, priority, tags, hub_id, is_pinned, author_id, author_name, author_role, created_at, updated_at) VALUES
('note-01', 'Aster Hub Charger Main Switch Tripped - Electrician Dispatched', 'Komal Negi reported that Aster HIVE charger board tripped during rain at 18:00. Power is OFF for safety. Electrician Mohan scheduled for 10:00 AM visit tomorrow.', 'URGENT', 'ACTIVE', 'URGENT', '{Electrical,Charger,Rain}', 'hub-mum-02', TRUE, 'usr-03', 'Zaffar Patel', 'Operations Manager', '2026-08-26T18:30:00Z', '2026-08-26T18:30:00Z'),
('note-02', 'Churchgate Recovery Case #5646 - Dwarkesh Kansagara User Blocked', 'Bike 5646 was recovered from Churchgate station by Rajkumar. User claimed 0% battery but 10% was available. 15-day block applied in system. ₹200 penalty recovery fee pending.', 'SHIFT_HANDOVER', 'ACTIVE', 'HIGH', '{Recovery,Churchgate,"Blocked User"}', 'hub-mum-09', TRUE, 'usr-03', 'Zaffar Patel', 'Operations Manager', '2026-08-26T20:15:00Z', '2026-08-26T20:15:00Z'),
('note-03', 'Store 1 Central Warehouse Spares Re-Order Note', 'Stock of 13 No. Spring Washers (2 packs left) and Brake Cables (12 units) at Store 1. Need to place replenishment order with Pakshal Auto parts by Friday.', 'MECHANICAL', 'ACTIVE', 'NORMAL', '{Inventory,Pakshal,Fasteners}', 'hub-store-01', FALSE, 'usr-06', 'Rajkumar Mandal', 'Mechanic', '2026-08-27T09:00:00Z', '2026-08-27T09:00:00Z'),
('note-04', 'NMIMS Student Peak Hour Fleet Staging', 'Ensure minimum 12 Available bikes at NMIMS Back Gate hub before 11:30 AM class breaks. Move 4 units from Aurus 1 if count drops below 6.', 'HUB_NOTICE', 'ACTIVE', 'HIGH', '{"Fleet Staging","Peak Hours",NMIMS}', 'hub-mum-09', FALSE, 'usr-04', 'Ashish Vaishya', 'Operations Manager', '2026-08-27T10:00:00Z', '2026-08-27T10:00:00Z'),
('note-05', 'Previous Day Battery Terminal Tightening Routine - Completed', 'All battery Anderson terminals on CS Model vehicles inspected and lubricated at Store 1 workshop. Shift completed without issue.', 'SHIFT_HANDOVER', 'RESOLVED', 'NORMAL', '{Completed,Maintenance}', 'hub-store-01', FALSE, 'usr-07', 'Ritik Mandal', 'RSA Field Specialist', '2026-08-26T16:00:00Z', '2026-08-26T22:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Objectives
INSERT INTO public.objectives (id, title, description, start_date, target_date, hub_id, created_by, is_completed) VALUES
('obj-mum-01', 'Mumbai Monsoon Hub Drainage & Charger Inspection', 'Audit all hubs and Store 1 for waterlogging safety, breaker integrity, and cable insulation checks.', '2026-08-20', '2026-08-31', 'hub-store-01', 'usr-01', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Tasks
INSERT INTO public.tasks (id, objective_id, title, description, assigned_to, priority, status, vehicle_id, start_date, due_date, completed_at, created_by) VALUES
('tsk-mum-01', 'obj-mum-01', 'Test Aster Hub MCB breaker & repair tripped line', 'Coordinate with electrician Mohan to reset breaker and check moisture seal on ports.', '{usr-03,usr-06}', 'CRITICAL', 'IN_PROGRESS', NULL, '2026-08-26T18:00:00Z', '2026-08-28T12:00:00Z', NULL, 'usr-01'),
('tsk-mum-02', 'obj-mum-01', 'Replace worn disc pads on Key 5554 (Ola Model)', 'Inspect front & rear brake calipers at Anugrah hub before releasing to public pool.', '{usr-06}', 'HIGH', 'TODO', 'veh-08', '2026-08-27T08:00:00Z', '2026-08-28T18:00:00Z', NULL, 'usr-01')
ON CONFLICT (id) DO NOTHING;

-- Task Remarks
INSERT INTO public.task_remarks (id, task_id, author_id, author_name, author_role, comment, created_at) VALUES
('rem-01', 'tsk-mum-01', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'Electrician confirmed for 10:00 AM tomorrow.', '2026-08-26T18:45:00Z')
ON CONFLICT (id) DO NOTHING;

-- Job Cards
INSERT INTO public.job_cards (id, ticket_number, vehicle_id, reported_by, assigned_mechanic_id, hub_id, odometer_km, issue_description, solution_applied, status, approved_by, approval_notes, created_at, resolved_at, approved_at) VALUES
('job-mum-01', 101, 'veh-06', 'usr-03', 'usr-06', 'hub-mum-05', 7830, 'Front rim bent from pothole impact, brake rotor rubbing against caliper (Key 9640)', 'Straightened rim on hydraulic press, replaced front brake disc pads and aligned caliper', 'APPROVED', 'usr-01', 'Spares committed from Store 1. Vehicle certified safe for road use.', '2026-08-26T14:00:00Z', '2026-08-27T09:30:00Z', '2026-08-27T09:45:00Z'),
('job-mum-02', 102, 'veh-37', 'usr-04', 'usr-07', 'hub-mum-01', 6400, 'Throttle 3-speed switch broken, vehicle stutters on mode 2 acceleration (Key 1915)', NULL, 'PENDING', NULL, NULL, '2026-08-27T08:00:00Z', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Job Card Parts
INSERT INTO public.job_card_parts (id, job_card_id, part_id, quantity, unit_cost_snapshot, is_approved, created_at) VALUES
('jcp-01', 'job-mum-01', 'p-01', 1, 150.00, TRUE, '2026-08-26T14:00:00Z'),
('jcp-02', 'job-mum-02', 'p-03', 1, 380.00, FALSE, '2026-08-27T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Charger Logs
INSERT INTO public.charger_logs (id, hub_id, charger_name, connector_number, status, reported_at, reported_by, remarks) VALUES
('cl-ast-01', 'hub-mum-02', 'Main Supply Board', 'All Connectors', 'OFFLINE_TRIPPED', '2026-08-26T18:00:00Z', 'Komal Negi', 'Main supply switchboard tripped during rain')
ON CONFLICT (id) DO NOTHING;
