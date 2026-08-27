'use client';

import { useState, useEffect } from 'react';
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
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setActiveRoles = useAppStore((s) => s.setActiveRoles);

  // Sync Supabase authenticated session with app profile
  useEffect(() => {
    let mounted = true;

    async function checkCurrentSession() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          if (currentSession?.user?.email) {
            await matchAndSyncProfile(currentSession.user.email);
          } else {
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
  }, []);

  const matchAndSyncProfile = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if email matches Bhuvnesh Kumar (Super Admin / Owner)
    if (normalizedEmail === 'bhuvnesh3568@gmail.com' || normalizedEmail === 'bhuvnesh@ezev.in') {
      const ownerProfile = staffProfiles.find((p) => p.id === 'usr-01') || {
        id: 'usr-01',
        email: 'bhuvnesh3568@gmail.com',
        full_name: 'Bhuvnesh Kumar',
        phone: '+91 70560 55476',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
        roles: [{ id: 'role-01', code: 'owner', label: 'Super Admin (Owner)', is_system: true }],
      };
      setCurrentUser(ownerProfile);
      setActiveRoles(['owner']);
      return;
    }

    // 2. Query matching profile from Supabase database profiles
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
          full_name: dbProfile.full_name,
          phone: dbProfile.phone,
          avatar_url: dbProfile.avatar_url,
          assigned_hub_id: dbProfile.assigned_hub_id,
          is_active: dbProfile.is_active,
          created_at: dbProfile.created_at,
          updated_at: dbProfile.updated_at,
          roles: roles.length > 0 ? roles : [{ id: 'role-02', code: 'manager', label: 'Hub Operations Manager', is_system: true }],
        };
        setCurrentUser(fullProfile);
        setActiveRoles((fullProfile.roles || []).map((r) => r.code));
        return;
      }
    } catch (e) {
      // Fallback to store
    }

    // 3. Fallback to store staff list
    const matchedProfile = staffProfiles.find(
      (p) => p.email && p.email.toLowerCase() === normalizedEmail
    );

    if (matchedProfile) {
      setCurrentUser(matchedProfile);
      const roleCodes = matchedProfile.roles?.map((r) => r.code) || ['manager'];
      setActiveRoles(roleCodes);
    } else {
      // Unrecognized email - assign restricted viewer
      const guestProfile: Profile = {
        id: `usr-ext-${Date.now()}`,
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
        phone: '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: [{ id: 'role-02', code: 'manager', label: 'Operations Staff', is_system: false }],
      };
      setCurrentUser(guestProfile);
      setActiveRoles(['manager']);
    }
  };

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
