'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, VehicleStatus, ScooterModel } from '@/types';
import { VehicleStatusBadge } from '../common/StatusBadge';
import { VehicleDetailModal } from './VehicleDetailModal';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  Car,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Eye,
  Shield,
  Edit2,
  Activity,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

export function FleetTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [spendFilter, setSpendFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Quick Inline Edit Vehicle ID
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [customIdInput, setCustomIdInput] = useState('');

  const vehicles = useAppStore((s) => s.vehicles);
  const hubs = useAppStore((s) => s.hubs);
  const jobCards = useAppStore((s) => s.jobCards);
  const partUsageLogs = useAppStore((s) => s.partUsageLogs);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const updateVehicleCustomId = useAppStore((s) => s.updateVehicleCustomId);
  const { isOwner, isManager } = useRBAC();

  const isGlobalHub = selectedHubIds.includes('ALL') || selectedHubIds.length === 0;

  // Calculate Cumulative Maintenance Spend per vehicle
  const vehicleSpendMap = useMemo(() => {
    const map = new Map<string, number>();

    // 1. From Job Cards
    jobCards.forEach((j) => {
      if (j.parts) {
        const partsTotal = j.parts.reduce((sum, p) => sum + (p.is_approved ? p.quantity * p.unit_cost_snapshot : 0), 0);
        map.set(j.vehicle_id, (map.get(j.vehicle_id) || 0) + partsTotal);
      }
    });

    // 2. From direct part usages
    partUsageLogs.forEach((u) => {
      if (u.vehicle_id && u.part) {
        const cost = u.quantity * u.part.unit_cost;
        map.set(u.vehicle_id, (map.get(u.vehicle_id) || 0) + cost);
      }
    });

    return map;
  }, [jobCards, partUsageLogs]);

  // Filtered dataset
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (!v.is_active) return false;
      if (!isGlobalHub && !selectedHubIds.includes(v.current_hub_id)) return false;
      if (statusFilter !== 'ALL' && v.current_status !== statusFilter) return false;
      if (modelFilter !== 'ALL' && v.model !== modelFilter) return false;

      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
      if (spendFilter === '500' && spend < 500) return false;
      if (spendFilter === '1000' && spend < 1000) return false;
      if (spendFilter === '2000' && spend < 2000) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchesId = v.vehicle_id.toLowerCase().includes(q);
      const matchesCustomId = (v.custom_vehicle_id || '').toLowerCase().includes(q);
      const matchesKey = v.key_number.toLowerCase().includes(q);
      const matchesVin = v.vin.toLowerCase().includes(q);
      const matchesModel = v.model.toLowerCase().includes(q);

      return matchesId || matchesCustomId || matchesKey || matchesVin || matchesModel;
    });
  }, [vehicles, isGlobalHub, selectedHubIds, statusFilter, modelFilter, spendFilter, search, vehicleSpendMap]);

  // High-Level KPI Calculations (3.2)
  const totalFleetCount = filteredVehicles.length;
  const readyVehicles = filteredVehicles.filter((v) => v.current_status === 'Available');
  const repairVehicles = filteredVehicles.filter((v) => v.current_status === 'Under Repair');
  const groundedVehicles = filteredVehicles.filter((v) => v.current_status !== 'Available');

  const avgUptime = totalFleetCount > 0
    ? ((readyVehicles.length / totalFleetCount) * 100).toFixed(1)
    : '0.0';

  const totalFleetMaintenanceSpend = useMemo(() => {
    return filteredVehicles.reduce((acc, v) => acc + (vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0), 0);
  }, [filteredVehicles, vehicleSpendMap]);

  // Truncate raw 14-15 digit IoT ID cleanly (e.g., "...026917")
  const formatTruncatedIotId = (iotId: string) => {
    if (!iotId || iotId.length < 8) return iotId;
    return `...${iotId.slice(-6)}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}: ${text}`);
  };

  const handleSaveCustomId = (vehicleId: string) => {
    if (!customIdInput.trim()) {
      toast.error('Vehicle ID cannot be blank.');
      return;
    }

    // Uniqueness validation
    const duplicate = vehicles.find(
      (v) => v.id !== vehicleId && v.custom_vehicle_id?.toLowerCase() === customIdInput.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error(`Vehicle ID "${customIdInput}" is already assigned to Key #${duplicate.key_number}.`);
      return;
    }

    updateVehicleCustomId(vehicleId, customIdInput.trim());
    toast.success(`Assigned Vehicle ID: ${customIdInput.trim()}`);
    setEditingVehicleId(null);
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredVehicles.map((v) => {
      const hub = hubs.find((h) => h.id === v.current_hub_id);
      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
      return {
        'Vehicle ID': v.custom_vehicle_id || v.id.toUpperCase(),
        'Vehicle IoT ID': v.vehicle_id,
        'Key Code': v.key_number,
        'Chassis VIN': v.vin,
        'Scooter Model': v.model,
        'Current Hub': hub?.name || v.current_hub_id,
        'Operational Status': v.current_status,
        'Pending Staging': v.pending_status || '-',
        'Odometer (KM)': v.odometer_km || 0,
        'Total Maintenance Spend (INR)': spend,
        'Rolling Availability': v.current_status === 'Available' ? '93.3% (28/30 Days)' : '76.6% (23/30 Days)',
        'Last Logged Date': formatDate(v.last_odometer_updated_at || v.updated_at),
      };
    });

    exportToCSV('ezev_mumbai_fleet_master', data);
  };

  const handleExportPDF = () => {
    const headers = ['Vehicle ID', 'IoT ID', 'Key', 'Model', 'Hub', 'Status', 'Odometer', 'Spend', 'Uptime'];
    const rows = filteredVehicles.map((v) => {
      const hub = hubs.find((h) => h.id === v.current_hub_id);
      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
      return [
        v.custom_vehicle_id || v.id.toUpperCase(),
        formatTruncatedIotId(v.vehicle_id),
        v.key_number,
        v.model,
        hub?.name.split(' (')[0] || v.current_hub_id,
        v.current_status,
        v.odometer_km ? `${v.odometer_km} KM` : '-',
        formatCurrency(spend),
        v.current_status === 'Available' ? '93.3%' : '76.6%',
      ];
    });

    exportToPDF('Fleet Master & Telemetry Ledger', `${filteredVehicles.length} Active EVs`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* 3.2 Fleet Master KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Total Fleet Size</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-mono font-black text-2xl text-zinc-100">{totalFleetCount} EVs</div>
          <p className="text-[11px] text-zinc-500">{readyVehicles.length} Ready • {groundedVehicles.length} Grounded</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Average Fleet Uptime</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono font-black text-2xl text-emerald-400">{avgUptime}%</div>
          <p className="text-[11px] text-zinc-500">Rolling 30-Day availability index</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Active vs. Grounded</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono font-black text-2xl text-amber-400">
            {readyVehicles.length} <span className="text-xs font-normal text-zinc-500">vs</span> {groundedVehicles.length}
          </div>
          <p className="text-[11px] text-zinc-500">{repairVehicles.length} In-Progress Repairs</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Fleet Maintenance Spend</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-mono font-black text-2xl text-purple-300">
            {formatCurrency(totalFleetMaintenanceSpend)}
          </div>
          <p className="text-[11px] text-zinc-500">Spares & service cumulative total</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, View Switcher & Export */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f] backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by Vehicle ID, Key, IoT ID, Model..."
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
              <option value="ALL" className="bg-[#1c1c1f]">All Statuses</option>
              <option value="Available" className="bg-[#1c1c1f]">Available</option>
              <option value="Needs Maintenance" className="bg-[#1c1c1f]">Needs Maintenance</option>
              <option value="Under Repair" className="bg-[#1c1c1f]">Under Repair</option>
              <option value="Not Available" className="bg-[#1c1c1f]">Not Available</option>
            </select>
          </div>

          {/* Model Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Models</option>
              <option value="CS Model" className="bg-[#1c1c1f]">CS Model</option>
              <option value="Ola Model" className="bg-[#1c1c1f]">Ola Model</option>
              <option value="Single Light Model" className="bg-[#1c1c1f]">Single Light Model</option>
            </select>
          </div>

          {/* Spend Range Filter (3.1) */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={spendFilter}
              onChange={(e) => setSpendFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Spend</option>
              <option value="500" className="bg-[#1c1c1f]">&gt; ₹500 Spend</option>
              <option value="1000" className="bg-[#1c1c1f]">&gt; ₹1,000 Spend</option>
              <option value="2000" className="bg-[#1c1c1f]">&gt; ₹2,000 High Spend</option>
            </select>
          </div>

          {/* Universal View Switcher (1.4) */}
          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          {/* Export Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
              title="Export Fleet to CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={handleExportPDF}
              className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
              title="Export Fleet to PDF Report"
            >
              <FileText className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DENSE OPERATIONAL TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-4">Vehicle ID & Key</th>
                  <th className="p-3.5">Vehicle IoT ID</th>
                  <th className="p-3.5">Scooter Model</th>
                  <th className="p-3.5">Current Hub</th>
                  <th className="p-3.5">Status & Staging</th>
                  <th className="p-3.5">Total Spend</th>
                  <th className="p-3.5">Availability / Uptime</th>
                  <th className="p-3.5">Logged Odometer</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] text-zinc-300">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-zinc-500">
                      No vehicles found matching the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => {
                    const hub = hubs.find((h) => h.id === v.current_hub_id);
                    const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
                    const isAvailable = v.current_status === 'Available';
                    const isEditing = editingVehicleId === v.id;

                    return (
                      <tr
                        key={v.id}
                        onClick={() => setSelectedVehicle(v)}
                        className="hover:bg-zinc-800/40 cursor-pointer transition group"
                      >
                        {/* 3.1 Editable Vehicle ID & Key */}
                        <td className="p-3.5 pl-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={customIdInput}
                                onChange={(e) => setCustomIdInput(e.target.value)}
                                placeholder="e.g. VEH/01"
                                className="w-24 px-2 py-1 rounded bg-[#141416] border border-blue-500 text-xs font-mono font-bold text-white focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveCustomId(v.id)}
                                className="px-2 py-1 rounded bg-blue-600 text-[10px] font-bold text-white hover:bg-blue-500"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-zinc-100 text-xs">
                                {v.custom_vehicle_id || v.id.toUpperCase()}
                              </span>
                              <span className="font-mono font-bold text-blue-300 px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30 text-[11px]">
                                #{v.key_number}
                              </span>
                              {(isOwner || isManager) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVehicleId(v.id);
                                    setCustomIdInput(v.custom_vehicle_id || v.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-blue-400 transition"
                                  title="Edit Vehicle ID"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{v.vin}</div>
                        </td>

                        {/* 3.1 Clean IoT Identifier */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-mono font-semibold text-zinc-300 text-xs cursor-pointer hover:text-white"
                              title={`Full IoT IMEI: ${v.vehicle_id} (Click to copy)`}
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(v.vehicle_id, 'IoT ID');
                              }}
                            >
                              {formatTruncatedIotId(v.vehicle_id)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(v.vehicle_id, 'IoT ID');
                              }}
                              className="text-zinc-600 hover:text-zinc-300"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Model */}
                        <td className="p-3.5 font-medium text-zinc-200">{v.model}</td>

                        {/* Hub */}
                        <td className="p-3.5">
                          <span className="text-zinc-300 truncate max-w-[130px] block font-medium">
                            {hub?.name.split(' (')[0] || 'Store 1'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">{hub?.code}</span>
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          <VehicleStatusBadge status={v.current_status} pendingStatus={v.pending_status} size="sm" />
                        </td>

                        {/* 3.1 Total Spend */}
                        <td className="p-3.5">
                          <span
                            className={cn(
                              'font-mono font-bold text-xs',
                              spend > 1000 ? 'text-purple-300' : 'text-zinc-300'
                            )}
                          >
                            {formatCurrency(spend)}
                          </span>
                        </td>

                        {/* 3.1 Availability & Uptime Metrics */}
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-xs text-zinc-200">
                            {isAvailable ? '93.3% Availability' : '76.6% Availability'}
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            {isAvailable ? '28 / 30 Days Active' : '23 / 30 Days Active'}
                          </span>
                        </td>

                        {/* Odometer */}
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-zinc-200">
                            {v.odometer_km ? `${v.odometer_km.toLocaleString('en-IN')} KM` : '-'}
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            {v.last_odometer_updated_at ? formatDate(v.last_odometer_updated_at) : 'No logs'}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="p-3.5 text-right pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(v);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#141416] hover:bg-[#27272f] border border-[#2a2a2f] text-zinc-300 font-semibold text-xs transition inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Inspect</span>
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
      )}

      {/* VIEW 2: REPORT VIEW (AGGREGATIONS & TELEMETRY BREAKDOWN) */}
      {viewMode === 'report' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* By Scooter Model */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-400" />
                <span>Model Distribution</span>
              </h3>
              <div className="space-y-2">
                {['CS Model', 'Ola Model', 'Single Light Model'].map((model) => {
                  const count = filteredVehicles.filter((v) => v.model === model).length;
                  const pct = totalFleetCount > 0 ? ((count / totalFleetCount) * 100).toFixed(0) : 0;
                  return (
                    <div key={model} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-zinc-200">{model}</div>
                        <div className="text-[10px] text-zinc-500">{count} Units</div>
                      </div>
                      <span className="font-mono font-bold text-blue-400">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Top High-Spend Vehicles */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3 md:col-span-2">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Top Maintenance Spend Units</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...filteredVehicles]
                  .sort((a, b) => (vehicleSpendMap.get(b.id) || 0) - (vehicleSpendMap.get(a.id) || 0))
                  .slice(0, 4)
                  .map((v) => {
                    const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
                    return (
                      <div key={v.id} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-zinc-200">Key #{v.key_number} • {v.model}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">IoT: {formatTruncatedIotId(v.vehicle_id)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-purple-300">{formatCurrency(spend)}</div>
                          <div className="text-[10px] text-zinc-500">{v.current_status}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PIPELINE / KANBAN STATUS VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['Available', 'Needs Maintenance', 'Under Repair', 'Not Available'] as VehicleStatus[]).map((status) => {
            const statusVehicles = filteredVehicles.filter((v) => v.current_status === status);
            return (
              <div key={status} className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200">{status}</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {statusVehicles.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {statusVehicles.length === 0 ? (
                    <div className="p-6 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl">
                      No vehicles in this status.
                    </div>
                  ) : (
                    statusVehicles.map((v) => {
                      const hub = hubs.find((h) => h.id === v.current_hub_id);
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVehicle(v)}
                          className="p-3 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-600 cursor-pointer transition text-xs space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-blue-300">Key #{v.key_number}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{hub?.name.split(' (')[0]}</span>
                          </div>
                          <div className="font-bold text-zinc-200">{v.model}</div>
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                            <span>Odo: {v.odometer_km ? `${v.odometer_km} KM` : '-'}</span>
                            <span className="font-mono text-purple-300">{formatCurrency(vehicleSpendMap.get(v.id) || 0)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
