'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import {
  LayoutDashboard,
  Car,
  CheckSquare,
  Package,
  Wrench,
  CheckCircle2,
  Building2,
  DollarSign,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  StickyNote,
  CalendarCheck,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const isCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const toggleCollapse = useAppStore((s) => s.toggleSidebarCollapse);
  const clearedBadges = useAppStore((s) => s.clearedBadges || {});
  const { isOwner, isManager } = useRBAC();

  const jobCards = useAppStore((s) => s.jobCards);
  const vehicles = useAppStore((s) => s.vehicles);
  const refunds = useAppStore((s) => s.refunds);
  const hubStock = useAppStore((s) => s.hubStock);
  const tasks = useAppStore((s) => s.tasks);
  const sops = useAppStore((s) => s.sops);
  const dailyShiftLogs = useAppStore((s) => s.dailyShiftLogs || []);
  const chatChannels = useAppStore((s) => s.chatChannels || []);

  const pendingApprovalsCount =
    jobCards.filter((j) => j.status === 'PENDING').length +
    vehicles.filter((v) => v.pending_status !== null).length +
    refunds.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').length;

  const lowStockCount = hubStock.filter(
    (s) => s.physical_stock - s.pending_allocated_stock < s.min_threshold
  ).length;

  const pendingTasksCount = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'ABANDONED').length;

  // 1.2 Sidebar Notification Badges State Synchronization (Clears when visited)
  const showApprovalsBadge = !clearedBadges?.['approvals'] && pendingApprovalsCount > 0;
  const showJobCardsBadge =
    !clearedBadges?.['job_cards'] && jobCards.filter((j) => j.status === 'PENDING').length > 0;

  // Build filtered navigation sections based on verified user permissions
  const navSections = [
    {
      title: 'Operations',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, badge: null, visible: true },
        {
          name: 'Fleet Master',
          href: '/fleet',
          icon: Car,
          badge:
            vehicles.filter((v) => v.pending_status !== null).length > 0
              ? `${vehicles.filter((v) => v.pending_status !== null).length}`
              : null,
          badgeVariant: 'warning',
          visible: true,
        },
        {
          name: 'Rapid Inspection',
          href: '/inspections',
          icon: ShieldCheck,
          badge: null,
          visible: true,
        },
        {
          name: 'Approvals Desk',
          href: '/approvals',
          icon: CheckSquare,
          badge: showApprovalsBadge ? `${pendingApprovalsCount}` : null,
          badgeVariant: 'danger',
          visible: isOwner || isManager,
        },
      ],
    },
    {
      title: 'Field & Maintenance',
      items: [
        {
          name: 'Spare Parts',
          href: '/inventory',
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          badgeVariant: 'danger',
          visible: true,
        },
        {
          name: 'Job Cards',
          href: '/job-cards',
          icon: Wrench,
          badge: showJobCardsBadge
            ? `${jobCards.filter((j) => j.status === 'PENDING').length}`
            : null,
          badgeVariant: 'warning',
          visible: true,
        },
        {
          name: 'Objectives & Tasks',
          href: '/tasks',
          icon: CheckCircle2,
          badge: pendingTasksCount > 0 ? `${pendingTasksCount}` : null,
          badgeVariant: 'info',
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
          badgeVariant: 'info',
          visible: true,
        },
        {
          name: 'Team Channels',
          href: '/channels',
          icon: MessageSquare,
          badge: `${chatChannels.length}`,
          badgeVariant: 'info',
          visible: true,
        },
        {
          name: 'SOPs & Manuals',
          href: '/sops',
          icon: BookOpen,
          badge: `${sops.length}`,
          badgeVariant: 'info',
          visible: true,
        },
        {
          name: 'Team Notes',
          href: '/notes',
          icon: StickyNote,
          badge: null,
          visible: true,
        },
      ],
    },
    {
      title: 'Governance',
      items: [
        {
          name: 'Customer Disputes',
          href: '/refunds',
          icon: DollarSign,
          badge: refunds.filter((r) => r.status === 'SUBMITTED').length > 0 ? '!' : null,
          badgeVariant: 'warning',
          visible: isOwner || isManager,
        },
        { name: 'Audit Trail', href: '/audit', icon: History, badge: null, visible: isOwner },
        { name: 'Settings & Roles', href: '/settings', icon: Settings, badge: null, visible: isOwner },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'flex-shrink-0 border-r border-[#27272a] bg-[#18181b]/95 p-3 hidden lg:flex flex-col justify-between overflow-y-auto transition-all duration-200 ease-in-out backdrop-blur-md',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="space-y-5">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {section.title}
                </h4>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition group relative',
                        isActive
                          ? 'bg-[#1e1e22] text-blue-400 font-semibold border border-[#2a2a2f] shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1c1f] border border-transparent',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors',
                          isActive ? 'text-blue-400' : 'text-zinc-400 group-hover:text-zinc-200'
                        )}
                      />

                      {!isCollapsed && (
                        <span className="flex-1 truncate">{item.name}</span>
                      )}

                      {item.badge && !isCollapsed && (
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold border',
                            item.badgeVariant === 'danger' && 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                            item.badgeVariant === 'warning' && 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                            item.badgeVariant === 'info' && 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Collapsed dot badge */}
                      {item.badge && isCollapsed && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-[#18181b]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Collapse Action */}
      <div className="pt-3 border-t border-[#27272a]">
        <button
          onClick={toggleCollapse}
          className={cn(
            'w-full flex items-center gap-2 p-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e22] border border-transparent hover:border-[#2a2a2f] transition',
            isCollapsed && 'justify-center'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-400 font-medium text-[11px]">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
