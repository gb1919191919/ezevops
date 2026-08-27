'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Toaster } from 'sonner';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { AuthGuard } from '@/components/auth/AuthGuard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // Initialize background Supabase synchronization when authenticated
  useSupabaseSync();

  if (isLoginPage) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
        {children}
        <Toaster position="bottom-left" duration={2000} closeButton richColors theme="dark" />
      </main>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
        <Header />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-8 transition-all">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">{children}</div>
          </main>
        </div>

        <MobileNav />
        <Toaster position="bottom-left" duration={2000} closeButton richColors theme="dark" />
      </div>
    </AuthGuard>
  );
}
