'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, VehicleStatus, ScooterModel } from '@/types';
import { VehicleStatusBadge } from '../common/StatusBadge';
import { VehicleDetailModal } from './VehicleDetailModal';
import { formatDate, formatDateOnly, formatRelativeTime, cn } from '@/lib/utils';
import {
  Car,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Eye,
  Key,
  Shield,
  Edit2,
} from 'lucide-react';

export function FleetTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const vehicles = useAppStore((s) => s.vehicles);
  const hubs = useAppStore((s) => s.hubs);
  const activeHubId = useAppStore((s) => s.activeHubId);
  const { isOwner, isManager } = useRBAC();

  const filteredVehicles = vehicles.filter((v) => {
    if (!v.is_active) return false;
    if (activeHubId !== 'ALL' && v.current_hub_id !== activeHubId) return false;
    if (statusFilter !== 'ALL' && v.current_status !== statusFilter) return false;
    if (modelFilter !== 'ALL' && v.model !== modelFilter) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesId = v.vehicle_id.toLowerCase().includes(q);
    const matchesKey = v.key_number.toLowerCase().includes(q);
    const matchesVin = v.vin.toLowerCase().includes(q);
    const matchesModel = v.model.toLowerCase().includes(q);

    return matchesId || matchesKey || matchesVin || matchesModel;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f] backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by 14-15 digit Vehicle IoT ID, Key code, or Chassis VIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f] text-zinc-200">
                All Statuses
              </option>
              <option value="Available" className="bg-[#1c1c1f] text-zinc-200">
                Available
              </option>
              <option value="Needs Maintenance" className="bg-[#1c1c1f] text-zinc-200">
                Needs Maintenance
              </option>
              <option value="Under Repair" className="bg-[#1c1c1f] text-zinc-200">
                Under Repair
              </option>
              <option value="Not Available" className="bg-[#1c1c1f] text-zinc-200">
                Not Available
              </option>
            </select>
          </div>

          {/* Model Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f] text-zinc-200">
                All Models
              </option>
              <option value="CS Model" className="bg-[#1c1c1f] text-zinc-200">
                CS Model
              </option>
              <option value="Ola Model" className="bg-[#1c1c1f] text-zinc-200">
                Ola Model
              </option>
              <option value="Single Light Model" className="bg-[#1c1c1f] text-zinc-200">
                Single Light Model
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Fleet Inventory Table */}
      <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 pl-4">14-15 Digit Vehicle IoT ID</th>
                <th className="p-3.5">Key Code</th>
                <th className="p-3.5">Scooter Model</th>
                <th className="p-3.5">Current Hub</th>
                <th className="p-3.5">Status & Staging</th>
                <th className="p-3.5">Logged Odometer</th>
                <th className="p-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] text-zinc-300">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No vehicles found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const hub = hubs.find((h) => h.id === v.current_hub_id);
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className="hover:bg-zinc-800/40 cursor-pointer transition"
                    >
                      <td className="p-3.5 pl-4">
                        <div className="font-mono font-bold text-zinc-100 text-xs">
                          {v.vehicle_id}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">{v.vin}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-bold text-blue-300 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-xs">
                          {v.key_number}
                        </span>
                      </td>

                      <td className="p-3.5 font-medium text-zinc-200">
                        {v.model}
                      </td>

                      <td className="p-3.5">
                        <span className="text-zinc-300 truncate max-w-[130px] block font-medium">
                          {hub?.name.split(' (')[0] || 'Store 1'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">{hub?.code}</span>
                      </td>

                      <td className="p-3.5">
                        <VehicleStatusBadge status={v.current_status} pendingStatus={v.pending_status} size="sm" />
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono font-bold text-zinc-200">
                          {v.odometer_km ? `${v.odometer_km.toLocaleString('en-IN')} KM` : '-'}
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {v.last_odometer_updated_at ? formatRelativeTime(v.last_odometer_updated_at) : 'No logs'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVehicle(v);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#141416] hover:bg-[#27272f] border border-[#2a2a2f] text-zinc-300 font-semibold text-xs transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>View / Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Detail / Edit Modal */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
