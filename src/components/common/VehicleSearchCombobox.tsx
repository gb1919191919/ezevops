'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { Vehicle } from '@/types';
import { VehicleStatusBadge } from './StatusBadge';
import { VehicleDetailModal } from '../fleet/VehicleDetailModal';
import {
  Search,
  Car,
  MapPin,
  X,
  Command,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleSearchComboboxProps {
  placeholder?: string;
  onSelect?: (vehicle: Vehicle) => void;
  className?: string;
  autoFocus?: boolean;
}

export function VehicleSearchCombobox({
  placeholder = 'Search by any 3-4 digits of 14-15 digit Vehicle ID, Key, or VIN...',
  onSelect,
  className,
  autoFocus = false,
}: VehicleSearchComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const vehicles = useAppStore((s) => s.vehicles);
  const hubs = useAppStore((s) => s.hubs);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fast substring matching across ~500 vehicles
  const filteredVehicles = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    return vehicles
      .filter((v) => {
        if (!v.is_active) return false;
        const vehicleId = v.vehicle_id.toLowerCase();
        const vin = v.vin.toLowerCase();
        const key = v.key_number.toLowerCase();
        const model = v.model.toLowerCase();

        return (
          vehicleId.includes(cleanQuery) ||
          key.includes(cleanQuery) ||
          vin.includes(cleanQuery) ||
          model.includes(cleanQuery)
        );
      })
      .slice(0, 15);
  }, [vehicles, query]);

  const handleSelect = (v: Vehicle) => {
    if (onSelect) {
      onSelect(v);
    } else {
      setSelectedVehicle(v);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredVehicles.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredVehicles.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredVehicles.length) % filteredVehicles.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredVehicles[selectedIndex]) {
        handleSelect(filteredVehicles[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-14 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
        />

        {query ? (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono border border-zinc-700">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 flex items-center justify-between">
            <span>Matching Vehicles ({filteredVehicles.length})</span>
            <span className="font-mono text-zinc-500">↑↓ to navigate • Enter to select</span>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-400">
              No vehicles found matching &quot;{query}&quot;. Search by 14-15 digit Vehicle ID or Key.
            </div>
          ) : (
            <div className="p-1 space-y-1">
              {filteredVehicles.map((v, idx) => {
                const isHighlighted = idx === selectedIndex;
                const hub = hubs.find((h) => h.id === v.current_hub_id);

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between gap-3 text-xs',
                      isHighlighted
                        ? 'bg-zinc-800/80 border border-zinc-700'
                        : 'hover:bg-zinc-900 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                        <Car className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-100 text-xs">
                            {v.vehicle_id}
                          </span>
                          <span className="text-[10px] font-mono text-amber-300 px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
                            Key: {v.key_number}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {v.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 truncate mt-0.5">
                          <span className="font-mono text-zinc-500">VIN: {v.vin}</span>
                          <span>•</span>
                          <span>{hub?.name.split(' (')[0] || 'Central'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <VehicleStatusBadge status={v.current_status} pendingStatus={v.pending_status} size="sm" />
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vehicle Deep Dive Modal on Selection if used as standalone */}
      {!onSelect && (
        <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      )}
    </div>
  );
}
