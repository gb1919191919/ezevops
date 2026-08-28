-- ====================================================================
-- EZEV OPS - HARDENED SECURITY & STRICT AUTHENTICATED RLS POLICIES
-- ====================================================================

-- 1. Helper security functions in private schema (protects REST API from RPC exposure)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_auth_profile_id()
RETURNS TEXT AS $$
    SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION private.is_owner_or_manager()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.profile_roles pr ON pr.profile_id = p.id
        JOIN public.roles r ON r.id = pr.role_id
        WHERE p.auth_user_id = (SELECT auth.uid()) AND r.code IN ('owner', 'manager')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.profile_roles pr ON pr.profile_id = p.id
        JOIN public.roles r ON r.id = pr.role_id
        WHERE p.auth_user_id = (SELECT auth.uid()) AND r.code = 'owner'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke public / anon execution permissions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE ALL ON SCHEMA private FROM public, anon;

-- Grant usage & execute only to authenticated and service_role for RLS evaluation
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_auth_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_owner_or_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;

-- Drop obsolete public security definer functions to close REST endpoint exposure
DROP FUNCTION IF EXISTS public.get_auth_profile_id();
DROP FUNCTION IF EXISTS public.is_owner_or_manager();
DROP FUNCTION IF EXISTS public.is_super_admin();

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
        EXECUTE format('DROP POLICY IF EXISTS "Allow read for authenticated staff on %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow anon read for public preview on %s" ON public.%I', t, t);
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

-- 3. Strict Authenticated-Only Policies (Single Policy per Action for Optimal Performance)

-- HUBS
CREATE POLICY "auth_select_hubs" ON public.hubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_hubs" ON public.hubs FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_update_hubs" ON public.hubs FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_hubs" ON public.hubs FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- CHARGER LOGS
CREATE POLICY "auth_select_charger_logs" ON public.charger_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_charger_logs" ON public.charger_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_charger_logs" ON public.charger_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_charger_logs" ON public.charger_logs FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

-- PROFILES
CREATE POLICY "auth_select_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_super_admin()) OR auth_user_id = (SELECT auth.uid()));
CREATE POLICY "auth_update_profiles" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT private.is_super_admin()) OR auth_user_id = (SELECT auth.uid())) WITH CHECK ((SELECT private.is_super_admin()) OR auth_user_id = (SELECT auth.uid()));
CREATE POLICY "auth_delete_profiles" ON public.profiles FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- ROLES & PROFILE_ROLES
CREATE POLICY "auth_select_roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_roles" ON public.roles FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_super_admin()));
CREATE POLICY "auth_update_roles" ON public.roles FOR UPDATE TO authenticated USING ((SELECT private.is_super_admin())) WITH CHECK ((SELECT private.is_super_admin()));
CREATE POLICY "auth_delete_roles" ON public.roles FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

CREATE POLICY "auth_select_profile_roles" ON public.profile_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_profile_roles" ON public.profile_roles FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_super_admin()));
CREATE POLICY "auth_update_profile_roles" ON public.profile_roles FOR UPDATE TO authenticated USING ((SELECT private.is_super_admin())) WITH CHECK ((SELECT private.is_super_admin()));
CREATE POLICY "auth_delete_profile_roles" ON public.profile_roles FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- VEHICLES & INSPECTIONS
CREATE POLICY "auth_select_vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_update_vehicles" ON public.vehicles FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_vehicles" ON public.vehicles FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

CREATE POLICY "auth_select_vehicle_inspections" ON public.vehicle_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_vehicle_inspections" ON public.vehicle_inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_vehicle_inspections" ON public.vehicle_inspections FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_vehicle_inspections" ON public.vehicle_inspections FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- PARTS, HUB_PART_STOCK, PART_USAGE_LOGS
CREATE POLICY "auth_select_parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_parts" ON public.parts FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_update_parts" ON public.parts FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_parts" ON public.parts FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

CREATE POLICY "auth_select_hub_part_stock" ON public.hub_part_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_hub_part_stock" ON public.hub_part_stock FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_hub_part_stock" ON public.hub_part_stock FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_hub_part_stock" ON public.hub_part_stock FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_part_usage_logs" ON public.part_usage_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_part_usage_logs" ON public.part_usage_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_part_usage_logs" ON public.part_usage_logs FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_part_usage_logs" ON public.part_usage_logs FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- JOB CARDS & JOB CARD PARTS
CREATE POLICY "auth_select_job_cards" ON public.job_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_job_cards" ON public.job_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_job_cards" ON public.job_cards FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager()) OR assigned_mechanic_id = (SELECT private.get_auth_profile_id())) WITH CHECK ((SELECT private.is_owner_or_manager()) OR assigned_mechanic_id = (SELECT private.get_auth_profile_id()));
CREATE POLICY "auth_delete_job_cards" ON public.job_cards FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_job_card_parts" ON public.job_card_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_job_card_parts" ON public.job_card_parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_job_card_parts" ON public.job_card_parts FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_job_card_parts" ON public.job_card_parts FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

-- REFUNDS
CREATE POLICY "auth_select_refunds" ON public.refunds FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_refunds" ON public.refunds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_refunds" ON public.refunds FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_refunds" ON public.refunds FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- OBJECTIVES, MILESTONES, TASKS, REMARKS, ATTACHMENTS, CHANGELOG
CREATE POLICY "auth_select_objectives" ON public.objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_objectives" ON public.objectives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_objectives" ON public.objectives FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_objectives" ON public.objectives FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_milestones" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_milestones" ON public.milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_milestones" ON public.milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_milestones" ON public.milestones FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tasks" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_tasks" ON public.tasks FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_task_remarks" ON public.task_remarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_task_remarks" ON public.task_remarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_task_remarks" ON public.task_remarks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_task_remarks" ON public.task_remarks FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_task_attachments" ON public.task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_task_attachments" ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_task_attachments" ON public.task_attachments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_task_attachments" ON public.task_attachments FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_task_changelog" ON public.task_changelog FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_task_changelog" ON public.task_changelog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_task_changelog" ON public.task_changelog FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_task_changelog" ON public.task_changelog FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- DAILY SHIFT LOGS
CREATE POLICY "auth_select_daily_shift_logs" ON public.daily_shift_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_daily_shift_logs" ON public.daily_shift_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_daily_shift_logs" ON public.daily_shift_logs FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager()) OR author_id = (SELECT private.get_auth_profile_id())) WITH CHECK ((SELECT private.is_owner_or_manager()) OR author_id = (SELECT private.get_auth_profile_id()));
CREATE POLICY "auth_delete_daily_shift_logs" ON public.daily_shift_logs FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

-- CHAT CHANNELS & CHANNEL MESSAGES
CREATE POLICY "auth_select_chat_channels" ON public.chat_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_chat_channels" ON public.chat_channels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_chat_channels" ON public.chat_channels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_chat_channels" ON public.chat_channels FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_select_channel_messages" ON public.channel_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_channel_messages" ON public.channel_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_channel_messages" ON public.channel_messages FOR UPDATE TO authenticated USING (sender_id = (SELECT private.get_auth_profile_id())) WITH CHECK (sender_id = (SELECT private.get_auth_profile_id()));
CREATE POLICY "auth_delete_channel_messages" ON public.channel_messages FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()) OR sender_id = (SELECT private.get_auth_profile_id()));

-- SOPS & REVISIONS
CREATE POLICY "auth_select_sops" ON public.sops FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sops" ON public.sops FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_update_sops" ON public.sops FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_sops" ON public.sops FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

CREATE POLICY "auth_select_sop_revisions" ON public.sop_revisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sop_revisions" ON public.sop_revisions FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_update_sop_revisions" ON public.sop_revisions FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_sop_revisions" ON public.sop_revisions FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- TEAM NOTES
CREATE POLICY "auth_select_team_notes" ON public.team_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_notes" ON public.team_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_notes" ON public.team_notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_team_notes" ON public.team_notes FOR DELETE TO authenticated USING ((SELECT private.is_owner_or_manager()));

-- BLOCKED USERS
CREATE POLICY "auth_select_blocked_users" ON public.blocked_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_blocked_users" ON public.blocked_users FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_update_blocked_users" ON public.blocked_users FOR UPDATE TO authenticated USING ((SELECT private.is_owner_or_manager())) WITH CHECK ((SELECT private.is_owner_or_manager()));
CREATE POLICY "auth_delete_blocked_users" ON public.blocked_users FOR DELETE TO authenticated USING ((SELECT private.is_super_admin()));

-- AUDIT LOGS (Strictly Append-Only: No UPDATE or DELETE allowed by any role)
CREATE POLICY "auth_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING ((SELECT private.is_super_admin()));
CREATE POLICY "auth_insert_audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

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
