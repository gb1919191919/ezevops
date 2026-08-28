'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import {
  Zap,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'magic_link' | 'password'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { loading, authError, signInWithOtp, signInWithPassword } = useSupabaseAuth();

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      const remainingSecs = Math.ceil((lockoutUntil! - Date.now()) / 1000);
      toast.error(`Too many attempts. Please wait ${remainingSecs}s.`);
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your authorized work email.');
      return;
    }

    const res = await signInWithOtp(email.trim());
    if (res.success) {
      setIsSubmitted(true);
      setFailedAttempts(0);
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutUntil(Date.now() + 60 * 1000);
        toast.error('Rate limit reached: Locked for 60 seconds.');
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      const remainingSecs = Math.ceil((lockoutUntil! - Date.now()) / 1000);
      toast.error(`Too many attempts. Please wait ${remainingSecs}s.`);
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required.');
      return;
    }

    const res = await signInWithPassword(email.trim(), password);
    if (res.success) {
      setFailedAttempts(0);
      router.push('/');
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutUntil(Date.now() + 60 * 1000);
        toast.error('Rate limit reached: Locked for 60 seconds.');
      }
    }
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
                <h3 className="font-bold text-sm text-emerald-300">Sign-in Link Dispatched</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  A secure cryptographic authentication link has been dispatched to <strong className="text-zinc-200 font-mono">{email}</strong>.
                </p>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Open the email link on this device to verify your operator session and access the operations portal.
                </p>
              </div>
              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition mt-2"
              >
                Enter Different Email
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
                  <span className="text-[10px] text-blue-400 font-mono">Authorized Staff Only</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="staff@ezev.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition font-mono"
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
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || isLockedOut}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating with Supabase...</span>
                ) : isLockedOut ? (
                  <span>Locked (Rate Limit Exceeded)</span>
                ) : (
                  <>
                    <span>
                      {authMode === 'magic_link' ? 'Send Secure Magic Link' : 'Sign In with Password'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security Notice */}
          <div className="pt-3 border-t border-[#27272a] flex items-center justify-center gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Session • Multi-Factor Governance</span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-zinc-500">
          EzEv Fleet Operations Platform • Authorised Access Only
        </p>
      </div>
    </div>
  );
}
