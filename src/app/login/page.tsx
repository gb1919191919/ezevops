'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useAppStore } from '@/lib/store/appStore';
import {
  Zap,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'magic_link' | 'password'>('magic_link');
  const [email, setEmail] = useState('bhuvnesh3568@gmail.com');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { loading, authError, signInWithOtp, signInWithPassword, matchAndSyncProfile } =
    useSupabaseAuth();
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setActiveRoles = useAppStore((s) => s.setActiveRoles);

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your work email.');
      return;
    }

    const res = await signInWithOtp(email.trim());
    if (res.success) {
      setIsSubmitted(true);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required.');
      return;
    }

    const res = await signInWithPassword(email.trim(), password);
    if (res.success) {
      router.push('/');
    }
  };

  const handleQuickDemoLogin = (staffEmail: string) => {
    setEmail(staffEmail);
    matchAndSyncProfile(staffEmail);
    toast.success(`Logged in as ${staffEmail}`, {
      description: 'Session mapped to staff role in local state',
    });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#121214] text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-zinc-950/40 to-transparent" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#1e1e22] border border-blue-500/30 items-center justify-center text-blue-400 shadow-xl shadow-blue-500/5 mb-1">
            <Zap className="w-6 h-6 fill-blue-500/20 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            EzEv <span className="text-blue-400">Ops</span> Login
          </h1>
          <p className="text-xs text-zinc-400">
            Enterprise Fleet Operations & Governance Command System
          </p>
        </div>

        {/* Auth Card */}
        <div className="p-6 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] shadow-2xl backdrop-blur-md space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#141416] border border-[#27272a] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('magic_link');
                setIsSubmitted(false);
              }}
              className={`py-1.5 rounded-lg transition ${
                authMode === 'magic_link'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Magic Link / OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setIsSubmitted(false);
              }}
              className={`py-1.5 rounded-lg transition ${
                authMode === 'password'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Email & Password
            </button>
          </div>

          {isSubmitted ? (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div>
                <h3 className="font-bold text-sm text-emerald-300">Magic Link Sent!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  We sent a secure login link to <strong className="text-zinc-200">{email}</strong>.
                  Click the link to log into EzEv Ops.
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition"
              >
                Proceed to Dashboard
              </button>
            </div>
          ) : (
            <form
              onSubmit={authMode === 'magic_link' ? handleMagicLinkSubmit : handlePasswordSubmit}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold flex items-center justify-between">
                  <span>Work Email Address</span>
                  <span className="text-[10px] text-blue-400 font-mono">Owner / Staff</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="bhuvnesh3568@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
              </div>

              {authMode === 'password' && (
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>
                      {authMode === 'magic_link' ? 'Send Login Magic Link' : 'Sign In with Password'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Staff Fast-Switch Helper */}
          <div className="pt-4 border-t border-[#27272a] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block text-center">
              Quick Operator Session Login
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('bhuvnesh3568@gmail.com')}
                className="w-full p-2 rounded-xl bg-[#141416] hover:bg-blue-500/15 border border-blue-500/30 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <div className="truncate">
                    <div className="font-bold text-zinc-100 text-xs">Bhuvnesh Kumar</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">
                      bhuvnesh3568@gmail.com
                    </div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[9px] font-bold border border-blue-500/30 flex-shrink-0">
                  SUPER ADMIN
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('zaffar.patel@ezev.in')}
                className="w-full p-2 rounded-xl bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div className="truncate">
                    <div className="font-bold text-zinc-200 text-xs">Zaffar Patel</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">
                      zaffar.patel@ezev.in
                    </div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px] font-bold border border-zinc-700 flex-shrink-0">
                  OPS MANAGER
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('rajkumar.mandal@ezev.in')}
                className="w-full p-2 rounded-xl bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="truncate">
                    <div className="font-bold text-zinc-200 text-xs">Rajkumar Mandal</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">
                      rajkumar.mandal@ezev.in
                    </div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px] font-bold border border-zinc-700 flex-shrink-0">
                  CHIEF MECHANIC
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-zinc-400">
          Supabase Connected: <span className="font-mono text-zinc-300">yliozdsnqnfjkpcuctwe</span>
        </p>
      </div>
    </div>
  );
}
