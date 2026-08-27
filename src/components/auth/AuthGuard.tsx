'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Shield, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isChecking, currentUser } = useSupabaseAuth();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isChecking && !session && !isLoginPage) {
      router.push('/login');
    }
  }, [session, isChecking, isLoginPage, router]);

  // If on login page, render directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If still checking Supabase session on startup
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#121214] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/5 animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-bold text-sm text-zinc-100">Verifying Operator Session</h2>
            <p className="text-xs text-zinc-400">Connecting securely to Supabase Auth & Governance...</p>
          </div>
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  // If unauthenticated on protected page
  if (!session || !currentUser) {
    return (
      <div className="min-h-screen bg-[#121214] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-100">Authentication Required</h2>
            <p className="text-xs text-zinc-400">
              Fleet operations, refunds, telemetry, and inventory data are restricted. Please authenticate with your verified EzEv account to proceed.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Proceed to Secure Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated user
  return <>{children}</>;
}
