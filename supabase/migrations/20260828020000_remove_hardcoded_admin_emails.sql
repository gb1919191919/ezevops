-- ====================================================================
-- MIGRATION: Remove Hardcoded Admin Emails from handle_new_user Trigger
-- Date: 2026-08-28
-- Fixes: CRIT-04 (hardcoded Super Admin email bypass), HIGH-04 (trigger hardcoded emails)
-- ====================================================================

-- Replace the trigger function to remove hardcoded email-to-role mappings
-- and hardcoded personal phone number fallback.
-- All new users now default to 'mechanic' (role-04) role.
-- Admin provisioning must be done manually by existing Super Admins.

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

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
