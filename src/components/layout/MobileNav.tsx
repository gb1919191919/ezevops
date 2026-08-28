'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store/appStore';
import {
  LayoutDashboard,
  Car,
  CheckSquare,
  Package,
  Wrench,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const toggleMobileDrawer = useAppStore((s) => s.toggleMobileDrawer);
  const isMobileDrawerOpen = useAppStore((s) => s.isMobileDrawerOpen);
  const jobCards = useAppStore((s) => s.jobCards);
  const vehicles = useAppStore((s) => s.vehicles);
  const refunds = useAppStore((s) => s.refunds);
  const hubStock = useAppStore((s) => s.hubStock);

  const pendingApprovalsCount =
    (jobCards || []).filter((j) => j?.status === 'PENDING').length +
    (vehicles || []).filter((v) => v?.pending_status !== null).length +
    (refunds || []).filter((r) => r?.status === 'SUBMITTED' || r?.status === 'VERIFIED').length;

  const lowStockCount = (hubStock || []).filter(
    (s) => (s?.physical_stock || 0) - (s?.pending_allocated_stock || 0) < (s?.min_threshold || 5)
  ).length;

  const mobileNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, badge: null },
    { name: 'Fleet', href: '/fleet', icon: Car, badge: null },
    { name: 'Job Cards', href: '/job-cards', icon: Wrench, badge: null },
    { name: 'Spares', href: '/inventory', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount}` : null },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null },
  ];

  return (
    <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141416]/95 backdrop-blur-xl border-t border-[#27272a] px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.name}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl transition',
                isActive ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{item.name}</span>
              {item.badge && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-sm">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* More / Menu Drawer Trigger */}
        <button
          onClick={toggleMobileDrawer}
          aria-label="Open Navigation Menu"
          className={cn(
            'flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl transition',
            isMobileDrawerOpen ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </nav>
  );
}
