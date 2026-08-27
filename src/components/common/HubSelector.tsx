'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HubSelector() {
  const hubs = useAppStore((s) => s.hubs);
  const activeHubId = useAppStore((s) => s.activeHubId);
  const setActiveHubId = useAppStore((s) => s.setActiveHubId);

  return (
    <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-zinc-400 hidden md:inline">Hub:</span>
      <select
        value={activeHubId}
        onChange={(e) => setActiveHubId(e.target.value)}
        className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer pr-1"
      >
        <option value="ALL" className="bg-zinc-900 text-zinc-200">
          All Hubs (Global Fleet)
        </option>
        {hubs.map((hub) => (
          <option key={hub.id} value={hub.id} className="bg-zinc-900 text-zinc-200">
            {hub.name} ({hub.code})
          </option>
        ))}
      </select>
    </div>
  );
}
