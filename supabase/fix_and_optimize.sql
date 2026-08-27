-- ====================================================================
-- EZEV OPS - SUPABASE PERFORMANCE INDEXES, TRIGGERS & REALTIME SETUP
-- ====================================================================

-- 1. Automatic Profile & Super Admin Auto-Sync Trigger
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
