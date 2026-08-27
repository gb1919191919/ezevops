'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store/appStore';
import { Profile } from '@/types';
import { toast } from 'sonner';

export function useSupabaseAuth() {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const currentUser = useAppStore((s) => s.currentUser);
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setActiveRoles = useAppStore((s) => s.setActiveRoles);

  // Sync Supabase authenticated session with app profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        matchAndSyncProfile(session.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        matchAndSyncProfile(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, [staffProfiles]);

  const matchAndSyncProfile = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email matches Bhuvnesh Kumar (Owner/Super Admin)
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

    // Check against registered staff profiles
    const matchedProfile = staffProfiles.find(
      (p) => p.email && p.email.toLowerCase() === normalizedEmail
    );

    if (matchedProfile) {
      setCurrentUser(matchedProfile);
      const roleCodes = matchedProfile.roles?.map((r) => r.code) || ['manager'];
      setActiveRoles(roleCodes);
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
      toast.success('Magic link dispatched!', {
        description: `Check inbox for ${email} to login.`,
      });
      matchAndSyncProfile(email);
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
        matchAndSyncProfile(data.user.email);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      setAuthError(err.message || 'Invalid credentials');
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
      toast.info('Signed out of session');
    } catch (err: any) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    authError,
    currentUser,
    signInWithOtp,
    signInWithPassword,
    signOut,
    matchAndSyncProfile,
  };
}
