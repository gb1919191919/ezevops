'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, VehicleStatus, ScooterModel, AuditLog } from '@/types';
import { VehicleStatusBadge } from '../common/StatusBadge';
import { VehicleDetailModal } from './VehicleDetailModal';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTh } from '../common/ResizableTh';
import { KpiCardContainer } from '../common/KpiCardContainer';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

type SortField =
  | 'key_number'
  | 'vehicle_id'
  | 'model'
  | 'current_hub_id'
  | 'current_status'
  | 'total_maintenance_spend'
  | 'uptime_percentage'
  | 'odometer_km'
  | 'created_at';

type SortOrder = 'asc' | 'desc';

export function FleetTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [spendFilter, setSpendFilter] = useState<string>('ALL');
  const [hubFilter, setHubFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [availabilityDays, setAvailabilityDays] = useState<7 | 30 | 90>(7);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('key_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Quick Inline Edit Vehicle ID
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [customIdInput, setCustomIdInput] = useState('');

  const vehicles = useAppStore((s) => s.vehicles || []);
  const hubs = useAppStore((s) => s.hubs || []);
  const jobCards = useAppStore((s) => s.jobCards || []);
  const partUsageLogs = useAppStore((s) => s.partUsageLogs || []);
  const auditLogs = useAppStore((s) => s.auditLogs || []);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const updateVehicleCustomId = useAppStore((s) => s.updateVehicleCustomId);
  const { isOwner, isManager } = useRBAC();

  const isGlobalHub = selectedHubIds.includes('ALL') || selectedHubIds.length === 0;

  // Resizable column widths
  const { widths, startResizing } = useResizableColumns('fleet-table', {
    id_key: 170,
    iot: 140,
    model: 130,
    hub: 140,
    status: 160,
    spend: 120,
    uptime: 130,
    odo: 120,
    action: 90,
  });

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

  // ==========================================================================
  // FLEET EFFECTIVE AVAILABILITY / UPTIME COMPUTATION
  // Reconstructs each vehicle's status timeline from audit logs.
  // Statuses NOT "Available" count as downtime (Under Repair, Not Available,
  // Needs Maintenance, etc.). Result is fleet-wide uptime % over N days.
  // ==========================================================================
  const DOWNTIME_STATUSES: string[] = ['Under Repair', 'Not Available', 'Needs Maintenance'];

  const fleetAvailability = useMemo(() => {
    const now = Date.now();
    const windowMs = availabilityDays * 24 * 60 * 60 * 1000;
    const windowStart = now - windowMs;

    // Get all active vehicles in current filter scope
    const activeVehicles = vehicles.filter((v) => v.is_active && !v.is_archived);
    if (activeVehicles.length === 0) {
      return { percentage: 0, uptimeHours: 0, downtimeHours: 0, vehicleCount: 0, perVehicle: new Map<string, number>() };
    }

    // Collect vehicle status change audit events within the window
    const vehicleAuditEvents = auditLogs.filter(
      (log) =>
        log.table_name === 'vehicles' &&
        log.action === 'UPDATE' &&
        new Date(log.timestamp).getTime() >= windowStart &&
        (log.new_data?.current_status || log.old_data?.current_status)
    );

    // Group events by vehicle record_id, sorted ascending by time
    const eventsByVehicle = new Map<string, { time: number; newStatus: string }[]>();
    vehicleAuditEvents.forEach((log) => {
      const vid = log.record_id;
      if (!eventsByVehicle.has(vid)) eventsByVehicle.set(vid, []);
      const newStatus = log.new_data?.current_status || log.new_data?.pending_status;
      if (newStatus) {
        eventsByVehicle.get(vid)!.push({
          time: new Date(log.timestamp).getTime(),
          newStatus,
        });
      }
    });

    // Sort each vehicle's events by time
    eventsByVehicle.forEach((events) => events.sort((a, b) => a.time - b.time));

    let totalUptimeMs = 0;
    let totalDowntimeMs = 0;
    const perVehicle = new Map<string, number>(); // vehicle id -> uptime %

    activeVehicles.forEach((vehicle) => {
      const events = eventsByVehicle.get(vehicle.id) || [];
      let uptimeMs = 0;
      let downtimeMs = 0;

      if (events.length === 0) {
        // No status changes recorded in this window —
        // use the vehicle's current status for the entire period
        const isDown = DOWNTIME_STATUSES.includes(vehicle.current_status);
        if (isDown) {
          downtimeMs = windowMs;
        } else {
          uptimeMs = windowMs;
        }
      } else {
        // Walk through the timeline from windowStart to now
        // Before the first event, infer status from either the audit log's
        // old_data or the vehicle's created_at
        let currentDown = false;

        // Try to get status before first event from its old_data
        const firstAudit = vehicleAuditEvents.find(
          (l) =>
            l.record_id === vehicle.id &&
            l.new_data?.current_status === events[0].newStatus
        );
        if (firstAudit?.old_data?.current_status) {
          currentDown = DOWNTIME_STATUSES.includes(firstAudit.old_data.current_status);
        } else {
          // Assume "Available" before any recorded change
          currentDown = false;
        }

        let prevTime = windowStart;

        events.forEach((ev) => {
          const segmentMs = Math.max(0, ev.time - prevTime);
          if (currentDown) {
            downtimeMs += segmentMs;
          } else {
            uptimeMs += segmentMs;
          }
          currentDown = DOWNTIME_STATUSES.includes(ev.newStatus);
          prevTime = ev.time;
        });

        // Remaining segment from last event to now
        const tailMs = Math.max(0, now - prevTime);
        if (currentDown) {
          downtimeMs += tailMs;
        } else {
          uptimeMs += tailMs;
        }
      }

      totalUptimeMs += uptimeMs;
      totalDowntimeMs += downtimeMs;

      const vehicleTotal = uptimeMs + downtimeMs;
      perVehicle.set(vehicle.id, vehicleTotal > 0 ? (uptimeMs / vehicleTotal) * 100 : 100);
    });

    const totalMs = totalUptimeMs + totalDowntimeMs;
    const percentage = totalMs > 0 ? (totalUptimeMs / totalMs) * 100 : 100;
    const uptimeHours = Math.round(totalUptimeMs / (1000 * 60 * 60));
    const downtimeHours = Math.round(totalDowntimeMs / (1000 * 60 * 60));

    return {
      percentage,
      uptimeHours,
      downtimeHours,
      vehicleCount: activeVehicles.length,
      perVehicle,
    };
  }, [vehicles, auditLogs, availabilityDays]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered & Sorted dataset
  const filteredVehicles = useMemo(() => {
    const list = vehicles.filter((v) => {
      if (!v.is_active) return false;
      if (!isGlobalHub && !selectedHubIds.includes(v.current_hub_id)) return false;
      if (hubFilter !== 'ALL' && v.current_hub_id !== hubFilter) return false;
      if (statusFilter !== 'ALL' && v.current_status !== statusFilter) return false;
      if (modelFilter !== 'ALL' && v.model !== modelFilter) return false;

      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
      if (spendFilter === '500' && spend < 500) return false;
      if (spendFilter === '1000' && spend < 1000) return false;
      if (spendFilter === '2000' && spend < 2000) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchesId = (v.vehicle_id || '').toLowerCase().includes(q);
      const matchesCustomId = (v.custom_vehicle_id || '').toLowerCase().includes(q);
      const matchesKey = (v.key_number || '').toLowerCase().includes(q);
      const matchesVin = (v.vin || '').toLowerCase().includes(q);
      const matchesModel = (v.model || '').toLowerCase().includes(q);

      return matchesId || matchesCustomId || matchesKey || matchesVin || matchesModel;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'key_number') {
        comparison = (a.key_number || '').localeCompare(b.key_number || '');
      } else if (sortField === 'vehicle_id') {
        comparison = (a.vehicle_id || '').localeCompare(b.vehicle_id || '');
      } else if (sortField === 'model') {
        comparison = (a.model || '').localeCompare(b.model || '');
      } else if (sortField === 'current_hub_id') {
        comparison = (a.current_hub_id || '').localeCompare(b.current_hub_id || '');
      } else if (sortField === 'current_status') {
        comparison = (a.current_status || '').localeCompare(b.current_status || '');
      } else if (sortField === 'total_maintenance_spend') {
        const spendA = vehicleSpendMap.get(a.id) || a.total_maintenance_spend || 0;
        const spendB = vehicleSpendMap.get(b.id) || b.total_maintenance_spend || 0;
        comparison = spendA - spendB;
      } else if (sortField === 'uptime_percentage') {
        comparison = (a.uptime_percentage || 0) - (b.uptime_percentage || 0);
      } else if (sortField === 'odometer_km') {
        comparison = (a.odometer_km || 0) - (b.odometer_km || 0);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    vehicles,
    isGlobalHub,
    selectedHubIds,
    hubFilter,
    statusFilter,
    modelFilter,
    spendFilter,
    search,
    vehicleSpendMap,
    sortField,
    sortOrder,
  ]);

  // High-Level KPI Calculations (3.2)
  const totalFleetCount = filteredVehicles.length;
  const readyVehicles = filteredVehicles.filter((v) => v.current_status === 'Available');
  const repairVehicles = filteredVehicles.filter((v) => v.current_status === 'Under Repair');
  const groundedVehicles = filteredVehicles.filter((v) => v.current_status !== 'Available');

  const avgUptime =
    totalFleetCount > 0
      ? ((readyVehicles.length / totalFleetCount) * 100).toFixed(1)
      : '0.0';

  const totalFleetMaintenanceSpend = useMemo(() => {
    return filteredVehicles.reduce(
      (acc, v) => acc + (vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0),
      0
    );
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
      (v) =>
        v.id !== vehicleId &&
        v.custom_vehicle_id?.toLowerCase() === customIdInput.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error(
        `Vehicle ID "${customIdInput}" is already assigned to Key #${duplicate.key_number}.`
      );
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
        'Key Number': v.key_number,
        'IoT ID (IMEI)': v.vehicle_id,
        'VIN / Chassis': v.vin,
        Model: v.model,
        'Current Hub': hub ? hub.name : v.current_hub_id,
        'Operating Status': v.current_status,
        'Pending Override': v.pending_status || 'None',
        'Total Spend (INR)': spend,
        'Uptime %': `${v.uptime_percentage || 95}%`,
        'Logged Odometer (km)': v.odometer_km || 0,
        'Last Inspected': v.last_inspected_at ? formatDate(v.last_inspected_at) : 'Not Logged',
      };
    });
    exportToCSV(data, 'ezev_mumbai_fleet_master');
    toast.success('Fleet data exported to CSV');
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Vehicle ID / Key', dataKey: 'key' },
      { header: 'Model', dataKey: 'model' },
      { header: 'Current Hub', dataKey: 'hub' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Spend (INR)', dataKey: 'spend' },
      { header: 'Odo (km)', dataKey: 'odo' },
    ];
    const data = filteredVehicles.map((v) => {
      const hub = hubs.find((h) => h.id === v.current_hub_id);
      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
      return {
        key: `${v.custom_vehicle_id || v.id.toUpperCase()} (#${v.key_number})`,
        model: v.model,
        hub: hub ? hub.name : v.current_hub_id,
        status: v.current_status,
        spend: formatCurrency(spend),
        odo: `${v.odometer_km || 0} km`,
      };
    });
    exportToPDF('EzEv Mumbai Fleet Master Register', columns, data, 'ezev_fleet_summary.pdf');
    toast.success('Generated PDF Report');
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header & KPIs */}
      <KpiCardContainer
        storageKey="fleet-kpis"
        title="Fleet Operational Status"
        subtitle="Real-time vehicle availability, maintenance expenditures, and status staging"
      >
        {/* KPI 1: Active Fleet */}
        <div className="kpi-card p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex items-center justify-between shadow-sm">
          <div>
            <span className="kpi-label text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Fleet Size
            </span>
            <span className="kpi-val text-2xl font-bold text-zinc-100 mt-1 block">
              {totalFleetCount}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
              Filtered Scope
            </span>
          </div>
          <div className="kpi-icon w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Car className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Available & Ready */}
        <div className="kpi-card p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex items-center justify-between shadow-sm">
          <div>
            <span className="kpi-label text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Ready for Customer
            </span>
            <span className="kpi-val text-2xl font-bold text-emerald-400 mt-1 block">
              {readyVehicles.length}
            </span>
            <span className="text-[11px] text-emerald-500/80 font-mono mt-0.5 block">
              {avgUptime}% Availability
            </span>
          </div>
          <div className="kpi-icon w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Under Repair */}
        <div className="kpi-card p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex items-center justify-between shadow-sm">
          <div>
            <span className="kpi-label text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Under Repair / Maint.
            </span>
            <span className="kpi-val text-2xl font-bold text-amber-400 mt-1 block">
              {repairVehicles.length}
            </span>
            <span className="text-[11px] text-amber-500/80 font-mono mt-0.5 block">
              {groundedVehicles.length} Total Grounded
            </span>
          </div>
          <div className="kpi-icon w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Total Maintenance Spend (3.1) */}
        <div className="kpi-card p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex items-center justify-between shadow-sm">
          <div>
            <span className="kpi-label text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Total Maint. Spend
            </span>
            <span className="kpi-val text-2xl font-bold text-purple-300 mt-1 block">
              {formatCurrency(totalFleetMaintenanceSpend)}
            </span>
            <span className="text-[11px] text-purple-400/80 font-mono mt-0.5 block">
              Cumulative Spares & Labor
            </span>
          </div>
          <div className="kpi-icon w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 5: Fleet Effective Availability / Uptime */}
        <div className="kpi-card p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] shadow-sm col-span-1 sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="kpi-label text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Effective Fleet Availability
                </span>
                {/* Time Period Selector */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#141416] border border-[#2a2a2f]">
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setAvailabilityDays(d)}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold transition',
                        availabilityDays === d
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-zinc-500 hover:text-zinc-300'
                      )}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-3">
                <span className="kpi-val text-2xl font-black text-cyan-300 tabular-nums">
                  {fleetAvailability.percentage.toFixed(1)}%
                </span>
                <div className="text-[10px] text-zinc-500 font-mono pb-0.5">
                  <span className="text-emerald-400 font-semibold">
                    {fleetAvailability.uptimeHours.toLocaleString()}h
                  </span>{' '}
                  uptime /{' '}
                  <span className="text-rose-400 font-semibold">
                    {fleetAvailability.downtimeHours.toLocaleString()}h
                  </span>{' '}
                  downtime
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 w-full h-2 rounded-full bg-[#141416] border border-[#2a2a2f] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    fleetAvailability.percentage >= 90
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      : fleetAvailability.percentage >= 70
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-500 to-orange-400'
                  )}
                  style={{ width: `${Math.min(100, fleetAvailability.percentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-500 font-mono">
                <span>
                  {fleetAvailability.vehicleCount} vehicles over last {availabilityDays} days
                </span>
                <span
                  className={cn(
                    'font-bold',
                    fleetAvailability.percentage >= 90
                      ? 'text-emerald-400'
                      : fleetAvailability.percentage >= 70
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  )}
                >
                  {fleetAvailability.percentage >= 90
                    ? 'Excellent'
                    : fleetAvailability.percentage >= 70
                    ? 'Moderate'
                    : 'Critical'}
                </span>
              </div>
            </div>

            <div className="kpi-icon w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </KpiCardContainer>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Vehicle ID, Key, IoT ID, Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
          {/* Hub Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Hubs</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id} className="bg-[#1c1c1f]">
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
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

      {/* VIEW 1: DENSE OPERATIONAL TABLE VIEW WITH RESIZABLE COLUMNS & SORTING */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <ResizableTh
                    colKey="id_key"
                    width={widths.id_key}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('key_number')}
                    className="p-3.5 pl-4 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Vehicle ID & Key</span>
                    {renderSortIndicator('key_number')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="iot"
                    width={widths.iot}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('vehicle_id')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Vehicle IoT ID</span>
                    {renderSortIndicator('vehicle_id')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="model"
                    width={widths.model}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('model')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Model</span>
                    {renderSortIndicator('model')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="hub"
                    width={widths.hub}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('current_hub_id')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Current Hub</span>
                    {renderSortIndicator('current_hub_id')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="status"
                    width={widths.status}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('current_status')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Status & Staging</span>
                    {renderSortIndicator('current_status')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="spend"
                    width={widths.spend}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('total_maintenance_spend')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Total Spend</span>
                    {renderSortIndicator('total_maintenance_spend')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="uptime"
                    width={widths.uptime}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('uptime_percentage')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Uptime Score</span>
                    {renderSortIndicator('uptime_percentage')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="odo"
                    width={widths.odo}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('odometer_km')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Odometer</span>
                    {renderSortIndicator('odometer_km')}
                  </ResizableTh>

                  <th style={{ width: `${widths.action || 90}px` }} className="p-3.5 text-right pr-4">
                    Action
                  </th>
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
                        className="hover:bg-zinc-800/30 transition cursor-pointer group"
                      >
                        {/* Vehicle ID & Key */}
                        <td className="p-3.5 pl-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={customIdInput}
                                  onChange={(e) => setCustomIdInput(e.target.value)}
                                  className="w-24 px-2 py-1 rounded-md bg-[#141416] border border-blue-500 text-xs font-mono text-zinc-100 focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCustomId(v.id);
                                    if (e.key === 'Escape') setEditingVehicleId(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveCustomId(v.id)}
                                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white transition"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-zinc-100 group-hover:text-blue-400 transition">
                                  {v.custom_vehicle_id || v.id.toUpperCase()}
                                </span>
                                {(isOwner || isManager) && (
                                  <button
                                    onClick={() => {
                                      setEditingVehicleId(v.id);
                                      setCustomIdInput(v.custom_vehicle_id || v.id.toUpperCase());
                                    }}
                                    title="Edit Custom Vehicle ID"
                                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">
                              #{v.key_number}
                            </span>
                          </div>
                        </td>

                        {/* IoT ID (IMEI) */}
                        <td className="p-3.5 font-mono text-zinc-400 text-[11px]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span title={v.vehicle_id}>{formatTruncatedIotId(v.vehicle_id)}</span>
                            <button
                              onClick={() => copyToClipboard(v.vehicle_id, 'IoT ID')}
                              className="text-zinc-600 hover:text-zinc-300 transition"
                              title="Copy Full 15-digit IoT ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Scooter Model */}
                        <td className="p-3.5 text-zinc-300 font-medium">
                          {v.model}
                        </td>

                        {/* Hub */}
                        <td className="p-3.5 text-zinc-300">
                          {hub ? hub.name : v.current_hub_id}
                        </td>

                        {/* Status & Staging Badge */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <VehicleStatusBadge status={v.current_status} />
                            {v.pending_status && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-400 animate-pulse">
                                <Shield className="w-2.5 h-2.5" />
                                <span>Staged: {v.pending_status}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Maintenance Spend (3.1) */}
                        <td className="p-3.5 font-mono font-semibold">
                          <span
                            className={cn(
                              spend > 1500
                                ? 'text-rose-400'
                                : spend > 500
                                ? 'text-amber-300'
                                : 'text-zinc-300'
                            )}
                          >
                            {formatCurrency(spend)}
                          </span>
                        </td>

                        {/* Availability / Uptime Score (3.2) */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  (v.uptime_percentage || 95) > 85
                                    ? 'bg-emerald-500'
                                    : (v.uptime_percentage || 95) > 60
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                )}
                                style={{ width: `${v.uptime_percentage || 95}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">
                              {v.uptime_percentage || 95}%
                            </span>
                          </div>
                        </td>

                        {/* Logged Odometer */}
                        <td className="p-3.5 font-mono text-zinc-300">
                          {v.odometer_km ? `${v.odometer_km.toLocaleString('en-IN')} km` : '—'}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedVehicle(v)}
                            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-blue-600/20 text-zinc-400 hover:text-blue-300 transition"
                            title="Inspect Vehicle Lifecycle"
                          >
                            <Eye className="w-4 h-4" />
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

      {/* VIEW 2: GRID CARDS VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVehicles.map((v) => {
            const hub = hubs.find((h) => h.id === v.current_hub_id);
            const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] hover:border-zinc-700 cursor-pointer transition shadow-sm space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-zinc-100 group-hover:text-blue-400 transition">
                        {v.custom_vehicle_id || v.id.toUpperCase()}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">
                        #{v.key_number}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 mt-0.5 block">{v.model}</span>
                  </div>
                  <VehicleStatusBadge status={v.current_status} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#27272a] text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                      Current Hub
                    </span>
                    <span className="text-zinc-300 font-medium truncate block mt-0.5">
                      {hub ? hub.name : v.current_hub_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                      Total Spend
                    </span>
                    <span className="font-mono font-semibold text-purple-300 block mt-0.5">
                      {formatCurrency(spend)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#27272a] text-[11px] text-zinc-500">
                  <span>Odo: {v.odometer_km ? `${v.odometer_km} km` : '—'}</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {v.uptime_percentage || 95}% Uptime
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Vehicle Lifecycle & Status Staging */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
