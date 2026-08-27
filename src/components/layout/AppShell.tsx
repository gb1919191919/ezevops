'use client';

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Toaster } from 'sonner';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
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
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}
