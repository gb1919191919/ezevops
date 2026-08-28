'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { HubSelector } from '../common/HubSelector';
import { UserProfileSelector } from '../common/UserProfileSelector';
import { QuickNoteModal } from '../common/QuickNoteModal';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import {
  Zap,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  StickyNote,
  Search,
  Menu,
  X,
  LayoutDashboard,
  Car,
  ShieldCheck,
  Package,
  Wrench,
  CheckCircle2,
  Building2,
  CalendarCheck,
  MessageSquare,
  BookOpen,
  DollarSign,
  History,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapse = useAppStore((s) => s.toggleSidebarCollapse);
  const isMobileDrawerOpen = useAppStore((s) => s.isMobileDrawerOpen);
  const toggleMobileDrawer = useAppStore((s) => s.toggleMobileDrawer);
  const setMobileDrawerOpen = useAppStore((s) => s.setMobileDrawerOpen);

  const jobCards = useAppStore((s) => s.jobCards);
  const vehicles = useAppStore((s) => s.vehicles);
  const refunds = useAppStore((s) => s.refunds);
  const hubStock = useAppStore((s) => s.hubStock);
  const tasks = useAppStore((s) => s.tasks);
  const sops = useAppStore((s) => s.sops);
  const dailyShiftLogs = useAppStore((s) => s.dailyShiftLogs || []);
  const chatChannels = useAppStore((s) => s.chatChannels || []);
  const { isOwner, isManager } = useRBAC();

  // Global Cmd+K trigger
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, setMobileDrawerOpen]);

  const pendingJobCards = (jobCards || []).filter((j) => j?.status === 'PENDING').length;
  const pendingVehicleStatus = (vehicles || []).filter((v) => v?.pending_status !== null).length;
  const pendingRefunds = (refunds || []).filter((r) => r?.status === 'SUBMITTED' || r?.status === 'VERIFIED').length;
  const totalPendingApprovals = pendingJobCards + pendingVehicleStatus + pendingRefunds;

  const lowStockCount = (hubStock || []).filter(
    (s) => (s?.physical_stock || 0) - (s?.pending_allocated_stock || 0) < (s?.min_threshold || 5)
  ).length;

  const pendingTasksCount = (tasks || []).filter(
    (t) => t?.status !== 'COMPLETED' && t?.status !== 'ABANDONED'
  ).length;

  const mobileNavSections = [
    {
      title: 'Operations',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, badge: null, visible: true },
        {
          name: 'Fleet Master',
          href: '/fleet',
          icon: Car,
          badge: pendingVehicleStatus > 0 ? `${pendingVehicleStatus}` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          visible: true,
        },
        { name: 'Rapid Inspection', href: '/inspections', icon: ShieldCheck, badge: null, visible: true },
        {
          name: 'Approvals Desk',
          href: '/approvals',
          icon: CheckSquare,
          badge: totalPendingApprovals > 0 ? `${totalPendingApprovals}` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          visible: isOwner || isManager,
        },
      ],
    },
    {
      title: 'Field & Maintenance',
      items: [
        {
          name: 'Spare Parts Matrix',
          href: '/inventory',
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          visible: true,
        },
        {
          name: 'Job Cards & Workshop',
          href: '/job-cards',
          icon: Wrench,
          badge: pendingJobCards > 0 ? `${pendingJobCards}` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          visible: true,
        },
        {
          name: 'Objectives & Tasks',
          href: '/tasks',
          icon: CheckCircle2,
          badge: pendingTasksCount > 0 ? `${pendingTasksCount}` : null,
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          visible: true,
        },
        { name: 'Hubs Directory', href: '/hubs', icon: Building2, badge: null, visible: true },
      ],
    },
    {
      title: 'Knowledge & Collaboration',
      items: [
        {
          name: 'Daily Shift Logs',
          href: '/shift-logs',
          icon: CalendarCheck,
          badge: `${dailyShiftLogs.length}`,
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          visible: true,
        },
        {
          name: 'Team Channels',
          href: '/channels',
          icon: MessageSquare,
          badge: `${chatChannels.length}`,
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          visible: true,
        },
        {
          name: 'SOPs & Manuals',
          href: '/sops',
          icon: BookOpen,
          badge: `${sops.length}`,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          visible: true,
        },
        { name: 'Scratchpad Notes', href: '/notes', icon: StickyNote, badge: null, visible: true },
      ],
    },
    {
      title: 'Finance & Governance',
      items: [
        {
          name: 'Customer Refunds',
          href: '/refunds',
          icon: DollarSign,
          badge: pendingRefunds > 0 ? `${pendingRefunds}` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          visible: true,
        },
        { name: 'Audit Trail', href: '/audit', icon: History, badge: null, visible: true },
        { name: 'Settings & RBAC', href: '/settings', icon: Settings, badge: null, visible: isOwner },
      ],
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#27272a] bg-[#151518]/95 px-3 sm:px-6 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Mobile Hamburger Drawer Toggle (Mobile & Tablet) */}
          <button
            onClick={toggleMobileDrawer}
            className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-[#1e1e22] border border-[#2a2a2f] transition"
            title="Open Full Navigation Menu"
          >
            <Menu className="w-4 h-4 text-zinc-300" />
          </button>

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
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#1e1e22] border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:border-blue-500/60 transition shrink-0">
              <Zap className="w-4 h-4 fill-blue-500/20 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-100">
                EzEv <span className="text-blue-400 font-semibold">Ops</span>
              </span>
              <p className="text-[10px] text-zinc-400 font-mono -mt-0.5 hidden sm:block">
                Mumbai Command & Governance
              </p>
            </div>
          </Link>

          {/* Global Multi-Hub Selector (Desktop) */}
          <div className="hidden md:block">
            <HubSelector />
          </div>
        </div>

        {/* Center: Universal Global Search Bar (Cmd + K) */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-2 sm:mx-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#18181b] border border-[#2a2a2f] hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition text-xs group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 group-hover:scale-105 transition-transform shrink-0" />
              <span className="truncate hidden sm:inline">Search tasks, vehicles, parts, job cards...</span>
              <span className="truncate sm:hidden">Search Ops...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* 1-Click Quick Note / Scratchpad Button */}
          <button
            onClick={() => setIsQuickNoteOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#25252b] border border-[#2a2a2f] text-xs font-semibold text-zinc-300 hover:text-white transition group"
            title="Open 1-Click Quick Note & Scratchpad"
          >
            <StickyNote className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">Quick Note</span>
          </button>

          {/* Priority Approvals Counter */}
          <Link
            href="/approvals"
            className={cn(
              'flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition',
              totalPendingApprovals > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-[#1e1e22] border-[#2a2a2f] text-zinc-400 hover:text-zinc-200'
            )}
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden lg:inline">Approvals</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
              {totalPendingApprovals}
            </span>
          </Link>

          {/* Dynamic RBAC Role Switcher */}
          <div className="hidden sm:block">
            <RoleSwitcher />
          </div>

          {/* Real Staff Profile Selector */}
          <UserProfileSelector />
        </div>
      </header>

      {/* MOBILE SLIDE-OUT NAVIGATION DRAWER */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-sm bg-[#121214] border-r border-[#27272a] h-full overflow-y-auto flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            <div className="p-4 space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1e1e22] border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Zap className="w-3.5 h-3.5 fill-blue-500/20" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-zinc-100">EzEv Ops Menu</span>
                    <span className="block text-[10px] text-zinc-500 font-mono">Mumbai Network</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Hub & Role Selectors */}
              <div className="space-y-2 pb-3 border-b border-[#27272a]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Active Station & Role
                </div>
                <div className="flex flex-col gap-2">
                  <HubSelector />
                  <RoleSwitcher />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pb-3 border-b border-[#27272a]">
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1e1e22] border border-[#2a2a2f] text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition"
                >
                  <Search className="w-3.5 h-3.5 text-blue-400" />
                  <span>Search</span>
                </button>
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setIsQuickNoteOpen(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1e1e22] border border-[#2a2a2f] text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition"
                >
                  <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Note</span>
                </button>
              </div>

              {/* Navigation Sections */}
              <div className="space-y-4">
                {mobileNavSections.map((sec) => (
                  <div key={sec.title} className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2">
                      {sec.title}
                    </div>
                    <div className="space-y-0.5">
                      {sec.items
                        .filter((item) => item.visible)
                        .map((item) => {
                          const isActive = pathname === item.href;
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileDrawerOpen(false)}
                              className={cn(
                                'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition',
                                isActive
                                  ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20'
                                  : 'text-zinc-300 hover:bg-[#1e1e22] hover:text-white'
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-zinc-400')} />
                                <span>{item.name}</span>
                              </div>
                              {item.badge && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                                    item.badgeColor || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="p-4 border-t border-[#27272a] bg-[#0e0e10] text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>EzEv Ops v2.4</span>
              <span className="text-emerald-400 font-semibold">Live System Online</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Quick Note Modal */}
      <QuickNoteModal
        isOpen={isQuickNoteOpen}
        onClose={() => setIsQuickNoteOpen(false)}
      />

      {/* Universal Global Search Palette (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
