'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  ShieldCheck,
  CheckSquare,
  Package,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const mobileNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Fleet', href: '/fleet', icon: Car },
    { name: 'Inspect', href: '/inspections', icon: ShieldCheck },
    { name: 'Job Cards', href: '/job-cards', icon: Wrench },
    { name: 'Spares', href: '/inventory', icon: Package },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 px-3 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition',
                isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
