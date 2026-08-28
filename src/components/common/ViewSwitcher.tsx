'use client';

import React from 'react';
import { Table, BarChart3, Columns3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'report' | 'kanban' | 'grid';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  modes?: ViewMode[];
  className?: string;
}

export function ViewSwitcher({
  currentView,
  onViewChange,
  modes = ['table', 'report', 'kanban', 'grid'],
  className,
}: ViewSwitcherProps) {
  const options = [
    { key: 'table', label: 'List View', shortLabel: 'List', icon: Table },
    { key: 'report', label: 'Report View', shortLabel: 'Report', icon: BarChart3 },
    { key: 'kanban', label: 'Pipeline / Kanban', shortLabel: 'Kanban', icon: Columns3 },
    { key: 'grid', label: 'Grid Cards', shortLabel: 'Grid', icon: LayoutGrid },
  ].filter((opt) => modes.includes(opt.key as ViewMode));

  return (
    <div
      className={cn(
        'flex items-center p-1 rounded-xl bg-[#141416] border border-[#27272a] gap-1 overflow-x-auto scrollbar-none max-w-full',
        className
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentView === opt.key;

        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onViewChange(opt.key as ViewMode)}
            title={opt.label}
            className={cn(
              'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex-shrink-0',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden md:inline">{opt.label}</span>
            <span className="inline md:hidden">{opt.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
