-- ====================================================================
-- EZEV OPS - SUPABASE PERFORMANCE INDEXES, TRIGGERS & REALTIME SETUP
-- ====================================================================

-- 1. Automatic Profile Creation Trigger (No Hardcoded Admin Emails)
-- SECURITY: All new users default to the 'mechanic' (field staff) role.
-- Owner/Admin role assignment must be done manually by existing admins via the Settings UI.
-- Previously, specific email addresses were hardcoded to auto-receive Super Admin access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id TEXT := 'role-04'; -- Default restricted field technician (mechanic)
    existing_profile_id TEXT;
BEGIN
    -- Upsert profile record (no hardcoded email-to-role mapping)
    INSERT INTO public.profiles (id, auth_user_id, email, full_name, phone, is_active)
    VALUES (
        'usr-' || SUBSTRING(NEW.id::text, 1, 8),
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        TRUE
    )
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = NEW.id;

    -- Get the profile ID for role linking
    SELECT id INTO existing_profile_id FROM public.profiles WHERE email = NEW.email LIMIT 1;

    -- Link default mechanic role if no roles exist yet
    IF existing_profile_id IS NOT NULL THEN
        INSERT INTO public.profile_roles (profile_id, role_id)
        VALUES (existing_profile_id, default_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Enable Realtime Publications on Active Fleet & Collaboration Tables
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

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_shift_logs;
EXCEPTION WHEN duplicate_object THEN null; END $$;
