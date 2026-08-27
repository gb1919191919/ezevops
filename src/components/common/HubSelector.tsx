'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { MapPin, ChevronDown, Check, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HubSelector() {
  const hubs = useAppStore((s) => s.hubs);
  const vehicles = useAppStore((s) => s.vehicles);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const setSelectedHubIds = useAppStore((s) => s.setSelectedHubIds);
  const toggleHubSelection = useAppStore((s) => s.toggleHubSelection);
  const selectAllHubs = useAppStore((s) => s.selectAllHubs);
  const clearAllHubs = useAppStore((s) => s.clearAllHubs);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = selectedHubIds.includes('ALL') || selectedHubIds.length === hubs.length;

  const filteredHubs = hubs.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary Label
  const getButtonLabel = () => {
    if (isAllSelected) return `All Hubs (${hubs.length})`;
    if (selectedHubIds.length === 0) return 'No Hub Selected';
    if (selectedHubIds.length === 1) {
      const hub = hubs.find((h) => h.id === selectedHubIds[0]);
      return hub ? hub.name.split(' (')[0] : '1 Hub Selected';
    }
    return `${selectedHubIds.length} Hubs Selected`;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition',
          !isAllSelected && selectedHubIds.length > 0
            ? 'bg-blue-600/10 border-blue-500/30 text-blue-300'
            : 'bg-[#18181b] border-[#2a2a2f] hover:border-zinc-600 text-zinc-300'
        )}
      >
        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="truncate max-w-[140px] sm:max-w-[180px]">{getButtonLabel()}</span>
        <ChevronDown className={cn('w-3 h-3 text-zinc-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#18181b] border border-[#2e2e33] shadow-2xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Hub Filter & Aggregation</span>
              <span className="text-[10px] text-zinc-500 font-mono">13 Mumbai Hubs</span>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hubs..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Quick Actions (Select All / Clear All) */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <button
              onClick={() => selectAllHubs()}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              Select All
            </button>
            <button
              onClick={() => clearAllHubs()}
              className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition"
            >
              Clear All
            </button>
          </div>

          {/* Hub Checkboxes List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-zinc-800/30">
            {/* Global All Option */}
            <div
              onClick={() => selectAllHubs()}
              className={cn(
                'flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs font-semibold transition',
                isAllSelected
                  ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition',
                    isAllSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-zinc-700'
                  )}
                >
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>All Hubs (Global View)</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">{vehicles.length} EVs</span>
            </div>

            {/* Individual Hubs */}
            {filteredHubs.map((hub) => {
              const isSelected = selectedHubIds.includes(hub.id) && !isAllSelected;
              const hubVehicles = vehicles.filter((v) => v.current_hub_id === hub.id);

              return (
                <div
                  key={hub.id}
                  onClick={() => toggleHubSelection(hub.id)}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition group',
                    isSelected
                      ? 'bg-blue-600/15 text-blue-200 font-semibold border border-blue-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition',
                        isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-zinc-700'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="truncate">
                      <div className="truncate text-zinc-200 group-hover:text-white">
                        {hub.name.split(' (')[0]}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">{hub.code}</div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {hubVehicles.length} EVs
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 text-center">
            Click to isolate single hub or select multiple hubs for aggregated metrics.
          </div>
        </div>
      )}
    </div>
  );
}
