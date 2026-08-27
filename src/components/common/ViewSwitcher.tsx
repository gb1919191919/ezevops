'use client';

import React from 'react';
import { Table, BarChart3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'report' | 'kanban' | 'grid';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  modes?: ViewMode[];
}

export function ViewSwitcher({
  currentView,
  onViewChange,
  modes = ['table', 'report', 'kanban', 'grid'],
}: ViewSwitcherProps) {
  const options = [
    { key: 'table', label: 'List View', icon: Table },
    { key: 'report', label: 'Report View', icon: BarChart3 },
    { key: 'kanban', label: 'Pipeline / Kanban', icon: LayoutGrid },
    { key: 'grid', label: 'Grid Cards', icon: LayoutGrid },
  ].filter((opt) => modes.includes(opt.key as ViewMode));

  return (
    <div className="flex items-center p-1 rounded-xl bg-[#141416] border border-[#27272a] gap-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentView === opt.key;

        return (
          <button
            key={opt.key}
            onClick={() => onViewChange(opt.key as ViewMode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
