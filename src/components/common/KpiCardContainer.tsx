'use client';

import React, { useState, useEffect } from 'react';
import { LayoutGrid, Grid3X3, Grid2X2, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardDensity = 'compact' | 'normal' | 'expanded';

interface KpiCardContainerProps {
  storageKey: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function KpiCardContainer({
  storageKey,
  title,
  subtitle,
  children,
  className,
}: KpiCardContainerProps) {
  const [density, setDensity] = useState<CardDensity>('normal');
  const [columns, setColumns] = useState<number>(4);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ez-kpi-density-${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.density) setDensity(parsed.density);
        if (parsed.columns) setColumns(parsed.columns);
      }
    } catch (e) {}
  }, [storageKey]);

  const updateDensity = (newDensity: CardDensity, newCols?: number) => {
    setDensity(newDensity);
    const updatedCols = newCols !== undefined ? newCols : columns;
    if (newCols !== undefined) setColumns(newCols);
    try {
      localStorage.setItem(
        `ez-kpi-density-${storageKey}`,
        JSON.stringify({ density: newDensity, columns: updatedCols })
      );
    } catch (e) {}
  };

  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const densityPaddingClass = {
    compact: '[&_.kpi-card]:p-3.5 [&_.kpi-val]:text-xl [&_.kpi-label]:text-[11px] [&_.kpi-icon]:w-8 [&_.kpi-icon]:h-8',
    normal: '[&_.kpi-card]:p-5 [&_.kpi-val]:text-2xl [&_.kpi-label]:text-xs [&_.kpi-icon]:w-10 [&_.kpi-icon]:h-10',
    expanded: '[&_.kpi-card]:p-6 [&_.kpi-val]:text-3xl [&_.kpi-label]:text-sm [&_.kpi-icon]:w-12 [&_.kpi-icon]:h-12',
  }[density];

  return (
    <div className={cn('space-y-3', className)}>
      {(title || subtitle) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-bold text-zinc-100">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
          </div>

          {/* Density & Layout Controls */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[#1a1a1e] border border-[#27272a]">
            <button
              onClick={() => updateDensity('compact', 4)}
              title="Compact View (Dense)"
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold transition',
                density === 'compact'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateDensity('normal', 4)}
              title="Standard View (4 Columns)"
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold transition',
                density === 'normal' && columns === 4
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateDensity('expanded', 2)}
              title="Expanded View (2 Columns)"
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold transition',
                density === 'expanded' && columns === 2
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateDensity('expanded', 3)}
              title="Wide View (3 Columns)"
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold transition',
                density === 'expanded' && columns === 3
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Grid wrapper */}
      <div className={cn('grid gap-4 transition-all duration-200', gridColsClass, densityPaddingClass)}>
        {children}
      </div>
    </div>
  );
}
