-- ====================================================================
-- MIGRATION: Tighten RLS Policies for Strategic Planning & Communication
-- Date: 2026-08-28
-- Fixes: MED-01, MED-02 (Overly permissive INSERT/UPDATE policies)
-- ====================================================================

-- 1. Objectives: Only Owner and Hub Managers can Create/Update
DROP POLICY IF EXISTS "auth_insert_objectives" ON public.objectives;
DROP POLICY IF EXISTS "auth_update_objectives" ON public.objectives;

CREATE POLICY "auth_insert_objectives" ON public.objectives 
    FOR INSERT TO authenticated 
    WITH CHECK ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_update_objectives" ON public.objectives 
    FOR UPDATE TO authenticated 
    USING ((SELECT private.is_owner_or_manager())) 
    WITH CHECK ((SELECT private.is_owner_or_manager()));

-- 2. Milestones: Only Owner and Hub Managers can Create/Update
DROP POLICY IF EXISTS "auth_insert_milestones" ON public.milestones;
DROP POLICY IF EXISTS "auth_update_milestones" ON public.milestones;

CREATE POLICY "auth_insert_milestones" ON public.milestones 
    FOR INSERT TO authenticated 
    WITH CHECK ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_update_milestones" ON public.milestones 
    FOR UPDATE TO authenticated 
    USING ((SELECT private.is_owner_or_manager())) 
    WITH CHECK ((SELECT private.is_owner_or_manager()));

-- 3. Chat Channels: Only Owner and Hub Managers can Create/Update Channels
DROP POLICY IF EXISTS "auth_insert_chat_channels" ON public.chat_channels;
DROP POLICY IF EXISTS "auth_update_chat_channels" ON public.chat_channels;

CREATE POLICY "auth_insert_chat_channels" ON public.chat_channels 
    FOR INSERT TO authenticated 
    WITH CHECK ((SELECT private.is_owner_or_manager()));

CREATE POLICY "auth_update_chat_channels" ON public.chat_channels 
    FOR UPDATE TO authenticated 
    USING ((SELECT private.is_owner_or_manager())) 
    WITH CHECK ((SELECT private.is_owner_or_manager()));
