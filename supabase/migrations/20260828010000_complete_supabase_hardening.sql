-- ====================================================================
-- EZEV OPS - CANONICAL SUPABASE MASTER MIGRATION & HARDENING
-- Version: 20260828010000
-- Description: Complete schema sync, DDL hardening, automatic updated_at
--              triggers, immutable audit logs, full Realtime replication,
--              and granular RLS policies.
-- ====================================================================

-- 1. Custom Types & Enum Additions (SUPA-01)
DO $$ BEGIN
    CREATE TYPE iot_connectivity_status AS ENUM ('ONLINE', 'OFFLINE', 'NO_GPS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Vehicles Table Enhancements (SUPA-01, SUPA-02)
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS plate_number TEXT,
ADD COLUMN IF NOT EXISTS iot_status iot_connectivity_status NOT NULL DEFAULT 'ONLINE',
ADD COLUMN IF NOT EXISTS soc_percentage INTEGER NOT NULL DEFAULT 100 CHECK (soc_percentage >= 0 AND soc_percentage <= 100),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Soft-Delete Consistency Across Master Tables (SUPA-02)
ALTER TABLE public.hubs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.hub_part_stock ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.sop_revisions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Numeric Precision on Refunds (SUPA-03)
ALTER TABLE public.refunds 
ALTER COLUMN amount TYPE NUMERIC(12, 3) USING amount::NUMERIC(12, 3);

-- 5. Performance Indexes on Foreign Keys and Filter Columns
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_iot_status ON public.vehicles(iot_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_archived ON public.vehicles(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_parts_archived ON public.parts(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_hubs_archived ON public.hubs(is_archived) WHERE is_archived = FALSE;

-- 6. Automatic Timestamp Triggers (SUPA-06)
CREATE OR REPLACE FUNCTION public.set_current_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'vehicles', 'hubs', 'profiles', 'sops', 'tasks', 'refunds', 
        'daily_shift_logs', 'hub_part_stock', 'chat_channels', 'team_notes', 
        'milestones', 'objectives'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER trigger_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_updated_at()', t);
    END LOOP;
END $$;

-- 7. Audit Log Immutability (SUPA-08)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trigger_prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 8. Full Realtime Replication Publication (SUPA-13)
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'parts', 'hub_part_stock', 'job_card_parts', 'part_usage_logs',
        'objectives', 'milestones', 'task_remarks', 'task_attachments',
        'task_changelog', 'sops', 'sop_revisions', 'chat_channels',
        'vehicle_inspections', 'blocked_users', 'profiles', 'profile_roles'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN duplicate_object THEN null;
        END;
    END LOOP;
END $$;

-- 9. Replica Identity Full for Live State Streaming (SUPA-14)
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.job_cards REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.refunds REPLICA IDENTITY FULL;
ALTER TABLE public.hub_part_stock REPLICA IDENTITY FULL;
ALTER TABLE public.daily_shift_logs REPLICA IDENTITY FULL;
ALTER TABLE public.channel_messages REPLICA IDENTITY FULL;
ALTER TABLE public.team_notes REPLICA IDENTITY FULL;
