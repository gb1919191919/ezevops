'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'zinc';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  badge?: string;
  onClick?: () => void;
  className?: string;
}

const colorMap = {
  emerald: {
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  blue: {
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
  amber: {
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  rose: {
    icon: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  },
  purple: {
    icon: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  zinc: {
    icon: 'text-zinc-400',
    iconBg: 'bg-zinc-800 border-zinc-700',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'zinc',
  trend,
  badge,
  onClick,
  className,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 transition flex flex-col justify-between shadow-sm',
        onClick && 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/80',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">
          {title}
        </span>
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center border transition-all flex-shrink-0',
            c.iconBg
          )}
        >
          <Icon className={cn('w-4 h-4', c.icon)} />
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-zinc-100 font-mono">
            {value}
          </span>
          {badge && (
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold border',
                c.badge
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center justify-between text-xs pt-1">
            {subtitle && <span className="text-zinc-400 text-[11px] truncate">{subtitle}</span>}
            {trend && (
              <span
                className={cn(
                  'text-[10px] font-bold font-mono ml-auto pl-1',
                  trend.isPositive ? 'text-emerald-400' : 'text-zinc-400'
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
