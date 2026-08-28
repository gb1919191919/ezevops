'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store/appStore';
import { Profile } from '@/types';
import { toast } from 'sonner';

export function useSupabaseAuth() {
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setActiveRoles = useAppStore((s) => s.setActiveRoles);

  const matchAndSyncProfile = useCallback(async (email?: string | null) => {
    if (!email) {
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const staffProfiles = useAppStore.getState().staffProfiles || [];

    // SECURITY: No hardcoded email-to-role mapping. All role assignments come from the database.
    // Previously, specific emails were hardcoded to automatically receive Super Admin access.

    // 1. Query matching profile from Supabase database profiles (authoritative source)
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*, profile_roles(roles(*))')
        .eq('email', normalizedEmail)
        .single();

      if (dbProfile) {
        const roles = dbProfile.profile_roles?.map((pr: any) => pr.roles).filter(Boolean) || [];
        const fullProfile: Profile = {
          id: dbProfile.id,
          email: dbProfile.email,
          full_name: dbProfile.full_name || 'Operations Staff',
          phone: dbProfile.phone || '',
          avatar_url: dbProfile.avatar_url,
          assigned_hub_id: dbProfile.assigned_hub_id,
          is_active: dbProfile.is_active,
          created_at: dbProfile.created_at,
          updated_at: dbProfile.updated_at,
          roles: roles.length > 0 ? roles : [{ id: 'role-04', code: 'mechanic', label: 'Field Staff', is_system: true }],
        };
        setCurrentUser(fullProfile);
        setActiveRoles((fullProfile.roles || []).map((r) => r.code));
        return;
      }
    } catch (e) {
      // Fallback to store if database is unreachable
    }

    // 2. Fallback to store staff list (for offline resilience)
    const matchedProfile = staffProfiles.find(
      (p) => p.email && p.email.toLowerCase() === normalizedEmail
    );

    if (matchedProfile) {
      setCurrentUser(matchedProfile);
      const roleCodes = matchedProfile.roles?.map((r) => r.code) || ['mechanic'];
      setActiveRoles(roleCodes);
    } else {
      // Unrecognized email - assign restricted field staff with minimal permissions
      const guestProfile: Profile = {
        id: `usr-ext-${Date.now()}`,
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')?.[0] || 'Operations Staff',
        phone: '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: [{ id: 'role-04', code: 'mechanic', label: 'Field Staff', is_system: false }],
      };
      setCurrentUser(guestProfile);
      setActiveRoles(['mechanic']);
    }
  }, [setCurrentUser, setActiveRoles]);

  // Sync Supabase authenticated session with app profile
  useEffect(() => {
    let mounted = true;

    async function checkCurrentSession() {
      try {
        // SECURITY: Use getUser() instead of getSession() to validate JWT with Supabase server.
        // getSession() only reads from local storage and does NOT verify the token.
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (mounted) {
          if (user && !userError) {
            // Also get the session for compatibility with onAuthStateChange
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
            await matchAndSyncProfile(user.email);
          } else {
            setSession(null);
            setCurrentUser(null as any);
            setActiveRoles([]);
          }
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        if (mounted) setIsChecking(false);
      }
    }

    checkCurrentSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession?.user?.email) {
        await matchAndSyncProfile(newSession.user.email);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null as any);
        setActiveRoles([]);
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [matchAndSyncProfile, setCurrentUser, setActiveRoles]);

  // Sign in via Magic Link / Email OTP
  const signInWithOtp = async (email: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });

      if (error) throw error;
      toast.success('Login link dispatched!', {
        description: `Please check ${email} for your secure sign-in link.`,
      });
      return { success: true };
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send login link');
      toast.error('Authentication Error', { description: err.message });
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign in via Password
  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      toast.success('Authenticated successfully', {
        description: `Logged in as ${data.user?.email}`,
      });
      if (data.user?.email) {
        await matchAndSyncProfile(data.user.email);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password');
      toast.error('Login Failed', { description: err.message });
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentUser(null as any);
      setActiveRoles([]);
      setSession(null);

      // SECURITY (HIGH-07): Clear persisted state from localStorage on sign-out.
      // Zustand persist middleware stores roles, user profile, and operational data
      // in localStorage which could be accessed on shared devices after logout.
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('ezev-ops-mumbai-v6');
          localStorage.removeItem('ezev-ops-store');
        } catch {
          // localStorage may be unavailable in some contexts
        }
      }

      toast.info('Signed out successfully');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    isChecking,
    session,
    authError,
    currentUser,
    signInWithOtp,
    signInWithPassword,
    signOut,
    matchAndSyncProfile,
  };
}
