'use client';

import React, { useState } from 'react';
import { JobCardsList } from '@/components/job-cards/JobCardsList';
import { MaintenanceLoggerWizard } from '@/components/job-cards/MaintenanceLoggerWizard';
import { Wrench, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function JobCardsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-400" />
            Maintenance & Job Cards Engine
          </h1>
          <p className="text-xs text-zinc-400">
            Field defect diagnosis, camera photo uploads, spare parts staging, and approval commit
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5',
              viewMode === 'list'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <List className="w-3.5 h-3.5" />
            <span>Job Tickets</span>
          </button>

          <button
            onClick={() => setViewMode('create')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5',
              viewMode === 'create'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Open New Ticket</span>
          </button>
        </div>
      </div>

      {viewMode === 'create' ? (
        <MaintenanceLoggerWizard onSuccess={() => setViewMode('list')} />
      ) : (
        <JobCardsList />
      )}
    </div>
  );
}
