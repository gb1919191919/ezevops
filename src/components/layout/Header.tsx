'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/appStore';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { HubSelector } from '../common/HubSelector';
import { VehicleSearchCombobox } from '../common/VehicleSearchCombobox';
import { UserProfileSelector } from '../common/UserProfileSelector';
import { QuickNoteModal } from '../common/QuickNoteModal';
import {
  Zap,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapse = useAppStore((s) => s.toggleSidebarCollapse);
  const jobCards = useAppStore((s) => s.jobCards);
  const vehicles = useAppStore((s) => s.vehicles);
  const refunds = useAppStore((s) => s.refunds);

  const pendingJobCards = jobCards.filter((j) => j.status === 'PENDING').length;
  const pendingVehicleStatus = vehicles.filter((v) => v.pending_status !== null).length;
  const pendingRefunds = refunds.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').length;
  const totalPendingApprovals = pendingJobCards + pendingVehicleStatus + pendingRefunds;

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#27272a] bg-[#151518]/95 px-4 sm:px-6 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Sidebar Collapse Toggle Button (Desktop) */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-[#1e1e22] border border-[#2a2a2f] transition"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-zinc-300" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {/* Brand: EzEv Ops */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#1e1e22] border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:border-blue-500/60 transition">
              <Zap className="w-4 h-4 fill-blue-500/20 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-zinc-100">
                EzEv <span className="text-blue-400 font-semibold">Ops</span>
              </span>
              <p className="text-[10px] text-zinc-400 font-mono -mt-0.5 hidden sm:block">
                Mumbai Command & SOP Hub
              </p>
            </div>
          </Link>

          {/* Global Hub Selector */}
          <div className="hidden md:block">
            <HubSelector />
          </div>
        </div>

        {/* Center: Global 500-Vehicle High-Performance Search Combobox */}
        <div className="hidden sm:block flex-1 max-w-md mx-4">
          <VehicleSearchCombobox placeholder="Search 40+ EVs (any 3-4 digits of ID, Key, VIN)..." />
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* 1-Click Quick Note / Scratchpad Button */}
          <button
            onClick={() => setIsQuickNoteOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#25252b] border border-[#2a2a2f] text-xs font-semibold text-zinc-300 hover:text-white transition group"
            title="Open 1-Click Quick Note & Scratchpad"
          >
            <StickyNote className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">Quick Note</span>
          </button>

          {/* Priority Approvals Counter */}
          <Link
            href="/approvals"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition',
              totalPendingApprovals > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-[#1e1e22] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200'
            )}
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Approvals</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
              {totalPendingApprovals}
            </span>
          </Link>

          {/* Dynamic RBAC Role Switcher */}
          <RoleSwitcher />

          {/* Real Staff Profile Selector */}
          <UserProfileSelector />
        </div>
      </header>

      {/* Global Quick Note Modal */}
      <QuickNoteModal
        isOpen={isQuickNoteOpen}
        onClose={() => setIsQuickNoteOpen(false)}
      />
    </>
  );
}
