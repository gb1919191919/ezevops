-- ====================================================================
-- EZEV OPS - HARDENED SECURITY & STRICT AUTHENTICATED RLS POLICIES
-- ====================================================================

-- 1. Helper security functions with strict search_path protection
CREATE OR REPLACE FUNCTION public.get_auth_profile_id()
RETURNS TEXT AS $$
    SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_owner_or_manager()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.profile_roles pr ON pr.profile_id = p.id
        JOIN public.roles r ON r.id = pr.role_id
        WHERE p.auth_user_id = (SELECT auth.uid()) AND r.code IN ('owner', 'manager')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.profile_roles pr ON pr.profile_id = p.id
        JOIN public.roles r ON r.id = pr.role_id
        WHERE p.auth_user_id = (SELECT auth.uid()) AND r.code = 'owner'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Enable RLS explicitly on ALL tables & drop stale/insecure policies
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'hubs', 'charger_logs', 'profiles', 'roles', 'profile_roles',
        'vehicles', 'vehicle_inspections', 'parts', 'hub_part_stock', 'part_usage_logs',
        'job_cards', 'job_card_parts', 'refunds', 'objectives', 'milestones', 'tasks',
        'task_remarks', 'task_attachments', 'task_changelog', 'daily_shift_logs',
        'chat_channels', 'channel_messages', 'sops', 'sop_revisions', 'team_notes',
        'blocked_users', 'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_read_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_auth_all_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_service_role_all_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_manage_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%s" ON public.%I', t, t);
    END LOOP;
END $$;

-- 3. Strict Authenticated-Only Policies (Zero Anon Leakage)

-- HUBS (Authenticated read, Owner/Manager manage)
CREATE POLICY "auth_select_hubs" ON public.hubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_hubs" ON public.hubs FOR ALL TO authenticated 
    USING ((SELECT public.is_owner_or_manager())) 
    WITH CHECK ((SELECT public.is_owner_or_manager()));

-- CHARGER LOGS
CREATE POLICY "auth_all_charger_logs" ON public.charger_logs FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

-- PROFILES (Authenticated read, Self/Admin manage)
CREATE POLICY "auth_select_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_profiles" ON public.profiles FOR ALL TO authenticated 
    USING ((SELECT public.is_super_admin()) OR auth_user_id = (SELECT auth.uid())) 
    WITH CHECK ((SELECT public.is_super_admin()) OR auth_user_id = (SELECT auth.uid()));

-- ROLES & PROFILE_ROLES
CREATE POLICY "auth_select_roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_roles" ON public.roles FOR ALL TO authenticated 
    USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));

CREATE POLICY "auth_select_profile_roles" ON public.profile_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_profile_roles" ON public.profile_roles FOR ALL TO authenticated 
    USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));

-- VEHICLES & INSPECTIONS
CREATE POLICY "auth_select_vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_update_vehicles" ON public.vehicles FOR UPDATE TO authenticated 
    USING (true) WITH CHECK (true);
CREATE POLICY "auth_insert_vehicles" ON public.vehicles FOR INSERT TO authenticated 
    WITH CHECK ((SELECT public.is_owner_or_manager()));
CREATE POLICY "auth_delete_vehicles" ON public.vehicles FOR DELETE TO authenticated 
    USING ((SELECT public.is_super_admin()));

CREATE POLICY "auth_all_vehicle_inspections" ON public.vehicle_inspections FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

-- PARTS, STOCK & USAGE LOGS
CREATE POLICY "auth_select_parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_parts" ON public.parts FOR ALL TO authenticated 
    USING ((SELECT public.is_owner_or_manager())) WITH CHECK ((SELECT public.is_owner_or_manager()));

CREATE POLICY "auth_select_hub_part_stock" ON public.hub_part_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_hub_part_stock" ON public.hub_part_stock FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_part_usage_logs" ON public.part_usage_logs FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

-- JOB CARDS & JOB CARD PARTS
CREATE POLICY "auth_all_job_cards" ON public.job_cards FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_job_card_parts" ON public.job_card_parts FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

-- REFUNDS (Staff submit, Owner/Manager verify and settle)
CREATE POLICY "auth_select_refunds" ON public.refunds FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_refunds" ON public.refunds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_refunds" ON public.refunds FOR UPDATE TO authenticated 
    USING ((SELECT public.is_owner_or_manager())) WITH CHECK ((SELECT public.is_owner_or_manager()));

-- OBJECTIVES, MILESTONES, TASKS, REMARKS, ATTACHMENTS, CHANGELOG
CREATE POLICY "auth_all_objectives" ON public.objectives FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_milestones" ON public.milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_task_remarks" ON public.task_remarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_task_attachments" ON public.task_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_task_changelog" ON public.task_changelog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DAILY SHIFT LOGS
CREATE POLICY "auth_all_daily_shift_logs" ON public.daily_shift_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CHAT CHANNELS & CHANNEL MESSAGES
CREATE POLICY "auth_all_chat_channels" ON public.chat_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_channel_messages" ON public.channel_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SOPS & REVISIONS
CREATE POLICY "auth_select_sops" ON public.sops FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_sops" ON public.sops FOR ALL TO authenticated 
    USING ((SELECT public.is_owner_or_manager())) WITH CHECK ((SELECT public.is_owner_or_manager()));
CREATE POLICY "auth_all_sop_revisions" ON public.sop_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TEAM NOTES
CREATE POLICY "auth_all_team_notes" ON public.team_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BLOCKED USERS
CREATE POLICY "auth_select_blocked_users" ON public.blocked_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_blocked_users" ON public.blocked_users FOR ALL TO authenticated 
    USING ((SELECT public.is_owner_or_manager())) WITH CHECK ((SELECT public.is_owner_or_manager()));

-- AUDIT LOGS (Append only for staff, View for Super Admin)
CREATE POLICY "auth_insert_audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated 
    USING ((SELECT public.is_super_admin()));

-- 4. Service Role Full Access on All Tables
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'hubs', 'charger_logs', 'profiles', 'roles', 'profile_roles',
        'vehicles', 'vehicle_inspections', 'parts', 'hub_part_stock', 'part_usage_logs',
        'job_cards', 'job_card_parts', 'refunds', 'objectives', 'milestones', 'tasks',
        'task_remarks', 'task_attachments', 'task_changelog', 'daily_shift_logs',
        'chat_channels', 'channel_messages', 'sops', 'sop_revisions', 'team_notes',
        'blocked_users', 'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('CREATE POLICY "service_role_all_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t, t);
    END LOOP;
END $$;
