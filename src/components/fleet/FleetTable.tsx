'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, VehicleStatus, ScooterModel } from '@/types';
import { VehicleStatusBadge } from '../common/StatusBadge';
import { VehicleDetailModal } from './VehicleDetailModal';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
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
  Wrench,
  AlertTriangle,
  BarChart3,
  Columns3,
  Layers,
  ArrowRight,
  Sparkles,
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

const DOWNTIME_STATUSES: string[] = ['Under Repair', 'Not Available', 'Needs Maintenance'];

export function FleetTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [spendFilter, setSpendFilter] = useState<string>('ALL');
  const [hubFilter, setHubFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [availabilityDays, setAvailabilityDays] = useState<7 | 14 | 30 | 90>(7);

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
  const requestVehicleStatus = useAppStore((s) => s.requestVehicleStatus);
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
        const partsTotal = j.parts.reduce(
          (sum, p) => sum + (p.is_approved ? p.quantity * p.unit_cost_snapshot : 0),
          0
        );
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
  // Vehicles that are Under Repair, Not Available, Needs Maintenance, or Inactive
  // count as downtime. Result is fleet-wide efficiency/uptime % over N days.
  // ==========================================================================
  const fleetAvailability = useMemo(() => {
    const now = Date.now();
    const windowMs = availabilityDays * 24 * 60 * 60 * 1000;
    const windowStart = now - windowMs;

    // Consider all vehicles in scope (including inactive / archived vehicles to count their downtime)
    const allScopeVehicles = vehicles.filter((v) => {
      if (!isGlobalHub && !selectedHubIds.includes(v.current_hub_id)) return false;
      if (hubFilter !== 'ALL' && v.current_hub_id !== hubFilter) return false;
      return true;
    });

    if (allScopeVehicles.length === 0) {
      return {
        percentage: 0,
        uptimeHours: 0,
        downtimeHours: 0,
        vehicleCount: 0,
        activeCount: 0,
        groundedCount: 0,
        repairHours: 0,
        maintenanceHours: 0,
        inactiveHours: 0,
        perVehicle: new Map<string, number>(),
      };
    }

    // Collect vehicle status change audit events within the window
    const vehicleAuditEvents = auditLogs.filter(
      (log) =>
        log.table_name === 'vehicles' &&
        new Date(log.timestamp).getTime() >= windowStart &&
        (log.new_data?.current_status || log.old_data?.current_status || log.action === 'ARCHIVE' || log.action === 'RESTORE')
    );

    // Group events by vehicle record_id, sorted ascending by time
    const eventsByVehicle = new Map<string, { time: number; newStatus: string; isActive?: boolean }[]>();
    vehicleAuditEvents.forEach((log) => {
      const vid = log.record_id;
      if (!eventsByVehicle.has(vid)) eventsByVehicle.set(vid, []);
      const newStatus =
        log.new_data?.current_status ||
        log.new_data?.pending_status ||
        (log.action === 'ARCHIVE' ? 'Not Available' : 'Available');
      const isActive = log.action === 'ARCHIVE' ? false : log.new_data?.is_active !== undefined ? log.new_data.is_active : true;

      eventsByVehicle.get(vid)!.push({
        time: new Date(log.timestamp).getTime(),
        newStatus,
        isActive,
      });
    });

    // Sort each vehicle's events by time
    eventsByVehicle.forEach((events) => events.sort((a, b) => a.time - b.time));

    let totalUptimeMs = 0;
    let totalDowntimeMs = 0;
    let repairDowntimeMs = 0;
    let maintDowntimeMs = 0;
    let inactiveDowntimeMs = 0;
    const perVehicle = new Map<string, number>();

    allScopeVehicles.forEach((vehicle) => {
      const events = eventsByVehicle.get(vehicle.id) || [];
      let uptimeMs = 0;
      let downtimeMs = 0;

      if (events.length === 0) {
        // No status changes recorded in this window
        const isInactive = !vehicle.is_active || vehicle.is_archived;
        const isDown = isInactive || DOWNTIME_STATUSES.includes(vehicle.current_status);

        if (isDown) {
          downtimeMs = windowMs;
          if (isInactive || vehicle.current_status === 'Not Available') {
            inactiveDowntimeMs += windowMs;
          } else if (vehicle.current_status === 'Under Repair') {
            repairDowntimeMs += windowMs;
          } else {
            maintDowntimeMs += windowMs;
          }
        } else {
          uptimeMs = windowMs;
        }
      } else {
        // Walk through timeline from windowStart to now
        let currentStatus = vehicle.current_status;
        let currentIsActive = vehicle.is_active && !vehicle.is_archived;

        // Check if first event had prior status
        const firstAudit = vehicleAuditEvents.find((l) => l.record_id === vehicle.id);
        if (firstAudit?.old_data?.current_status) {
          currentStatus = firstAudit.old_data.current_status;
        }

        let prevTime = windowStart;

        events.forEach((ev) => {
          const segmentMs = Math.max(0, ev.time - prevTime);
          const isDown = !currentIsActive || DOWNTIME_STATUSES.includes(currentStatus);

          if (isDown) {
            downtimeMs += segmentMs;
            if (!currentIsActive || currentStatus === 'Not Available') {
              inactiveDowntimeMs += segmentMs;
            } else if (currentStatus === 'Under Repair') {
              repairDowntimeMs += segmentMs;
            } else {
              maintDowntimeMs += segmentMs;
            }
          } else {
            uptimeMs += segmentMs;
          }

          currentStatus = ev.newStatus as VehicleStatus;
          if (ev.isActive !== undefined) currentIsActive = ev.isActive;
          prevTime = ev.time;
        });

        // Tail segment
        const tailMs = Math.max(0, now - prevTime);
        const isDownTail = !currentIsActive || DOWNTIME_STATUSES.includes(currentStatus);
        if (isDownTail) {
          downtimeMs += tailMs;
          if (!currentIsActive || currentStatus === 'Not Available') {
            inactiveDowntimeMs += tailMs;
          } else if (currentStatus === 'Under Repair') {
            repairDowntimeMs += tailMs;
          } else {
            maintDowntimeMs += tailMs;
          }
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
    const repairHours = Math.round(repairDowntimeMs / (1000 * 60 * 60));
    const maintenanceHours = Math.round(maintDowntimeMs / (1000 * 60 * 60));
    const inactiveHours = Math.round(inactiveDowntimeMs / (1000 * 60 * 60));

    const activeCount = allScopeVehicles.filter((v) => v.current_status === 'Available' && v.is_active).length;
    const groundedCount = allScopeVehicles.length - activeCount;

    return {
      percentage,
      uptimeHours,
      downtimeHours,
      repairHours,
      maintenanceHours,
      inactiveHours,
      vehicleCount: allScopeVehicles.length,
      activeCount,
      groundedCount,
      perVehicle,
    };
  }, [vehicles, auditLogs, availabilityDays, isGlobalHub, selectedHubIds, hubFilter]);

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
      if (!v.is_active && statusFilter !== 'Not Available') return false;
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
        const scoreA = fleetAvailability.perVehicle.get(a.id) ?? (a.uptime_percentage || 95);
        const scoreB = fleetAvailability.perVehicle.get(b.id) ?? (b.uptime_percentage || 95);
        comparison = scoreA - scoreB;
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
    fleetAvailability,
  ]);

  // High-Level KPI Calculations
  const totalFleetCount = filteredVehicles.length;
  const readyVehicles = filteredVehicles.filter((v) => v.current_status === 'Available');
  const repairVehicles = filteredVehicles.filter((v) => v.current_status === 'Under Repair');
  const groundedVehicles = filteredVehicles.filter((v) => v.current_status !== 'Available');

  const totalFleetMaintenanceSpend = useMemo(() => {
    return filteredVehicles.reduce(
      (acc, v) => acc + (vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0),
      0
    );
  }, [filteredVehicles, vehicleSpendMap]);

  // Truncate raw 14-15 digit IoT ID cleanly
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

  const handleQuickStatusChange = (vehicle: Vehicle, targetStatus: VehicleStatus) => {
    if (vehicle.current_status === targetStatus) return;
    requestVehicleStatus(
      vehicle.id,
      targetStatus,
      `Direct transition to ${targetStatus} from Fleet Kanban View`,
      isOwner || isManager
    );
    toast.success(`Vehicle #${vehicle.key_number} moved to ${targetStatus}`);
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredVehicles.map((v) => {
      const hub = hubs.find((h) => h.id === v.current_hub_id);
      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
      const uptime = (fleetAvailability.perVehicle.get(v.id) ?? (v.uptime_percentage || 95)).toFixed(1);
      return {
        'Vehicle ID': v.custom_vehicle_id || (v.id || '').toUpperCase(),
        'Key Number': v.key_number,
        'IoT ID (IMEI)': v.vehicle_id,
        'VIN / Chassis': v.vin,
        Model: v.model,
        'Current Hub': hub ? hub.name : v.current_hub_id,
        'Operating Status': v.current_status,
        'Pending Override': v.pending_status || 'None',
        'Total Spend (INR)': spend,
        'Uptime %': `${uptime}%`,
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
      { header: 'Uptime', dataKey: 'uptime' },
      { header: 'Odo (km)', dataKey: 'odo' },
    ];
    const data = filteredVehicles.map((v) => {
      const hub = hubs.find((h) => h.id === v.current_hub_id);
      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
      const uptime = (fleetAvailability.perVehicle.get(v.id) ?? (v.uptime_percentage || 95)).toFixed(1);
      return {
        key: `${v.custom_vehicle_id || (v.id || '').toUpperCase()} (#${v.key_number})`,
        model: v.model,
        hub: hub ? hub.name : v.current_hub_id,
        status: v.current_status,
        spend: formatCurrency(spend),
        uptime: `${uptime}%`,
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
        title="Fleet Operational Status & Availability"
        subtitle="Real-time vehicle availability score, maintenance spend, and status pipelines"
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
              {readyVehicles.length} Active / {groundedVehicles.length} Grounded
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
              {totalFleetCount > 0 ? ((readyVehicles.length / totalFleetCount) * 100).toFixed(1) : 0}% Real-time
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

        {/* KPI 4: Total Maintenance Spend */}
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

        {/* KPI 5: Fleet Effective Availability / Uptime (Full-width Number Card) */}
        <div className="kpi-card p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] shadow-sm col-span-1 sm:col-span-2 lg:col-span-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="kpi-label text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Fleet Effective Availability & Uptime Efficiency
                </span>
                {/* Time Period Selector: 7D, 14D, 30D, 90D */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                  <span className="text-[10px] text-zinc-500 font-semibold px-1 hidden sm:inline">Rolling:</span>
                  {([7, 14, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAvailabilityDays(d)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition',
                        availabilityDays === d
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300'
                      )}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 sm:gap-6 mt-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                    Effective Fleet Uptime
                  </span>
                  <span className="kpi-val text-3xl sm:text-4xl font-black text-cyan-300 tabular-nums">
                    {fleetAvailability.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono pb-1 text-zinc-400">
                  <div className="p-2 rounded-xl bg-[#141416] border border-[#27272a]">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Uptime Hours</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {fleetAvailability.uptimeHours.toLocaleString()} hrs
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#141416] border border-[#27272a]">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Downtime Hours</span>
                    <span className="text-rose-400 font-bold text-sm">
                      {fleetAvailability.downtimeHours.toLocaleString()} hrs
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#141416] border border-[#27272a] hidden md:block">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Downtime Breakdown</span>
                    <span className="text-amber-300 text-xs">
                      {fleetAvailability.repairHours}h repair • {fleetAvailability.maintenanceHours}h maint • {fleetAvailability.inactiveHours}h inactive
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="mt-3 w-full h-2.5 rounded-full bg-[#141416] border border-[#2a2a2f] overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, fleetAvailability.percentage)}%` }}
                  title={`Uptime: ${fleetAvailability.percentage.toFixed(1)}%`}
                />
                <div
                  className="h-full bg-rose-500/80 transition-all duration-500"
                  style={{ width: `${Math.max(0, 100 - fleetAvailability.percentage)}%` }}
                  title={`Downtime: ${(100 - fleetAvailability.percentage).toFixed(1)}%`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between mt-2 text-xs text-zinc-400 font-mono">
                <span>
                  Tracking {fleetAvailability.vehicleCount} vehicles over last {availabilityDays} days window (Under repair, inactive & maintenance count as downtime)
                </span>
                <span
                  className={cn(
                    'font-bold px-2 py-0.5 rounded-md border text-[11px]',
                    fleetAvailability.percentage >= 90
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : fleetAvailability.percentage >= 75
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  )}
                >
                  {fleetAvailability.percentage >= 90
                    ? 'Optimal Fleet Health (≥90%)'
                    : fleetAvailability.percentage >= 75
                    ? 'Moderate Performance (75-89%)'
                    : 'Critical Downtime Alert (<75%)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </KpiCardContainer>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Vehicle ID, Key, IoT ID, Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          {/* Hub Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
            <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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

          {/* Spend Range Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-purple-400 shrink-0" />
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

          {/* Universal View Switcher */}
          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          {/* Export Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition shrink-0"
              title="Export Fleet to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={handleExportPDF}
              className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition shrink-0"
              title="Export Fleet to PDF Report"
            >
              <FileText className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
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
                    <span>Uptime ({availabilityDays}D)</span>
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
                    const isEditing = editingVehicleId === v.id;
                    const vehicleUptime = (
                      fleetAvailability.perVehicle.get(v.id) ?? (v.uptime_percentage || 95)
                    ).toFixed(1);

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
                                  {v.custom_vehicle_id || (v.id || '').toUpperCase()}
                                </span>
                                {(isOwner || isManager) && (
                                  <button
                                    onClick={() => {
                                      setEditingVehicleId(v.id);
                                      setCustomIdInput(v.custom_vehicle_id || (v.id || '').toUpperCase());
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

                        {/* IoT ID */}
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

                        {/* Model */}
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

                        {/* Total Spend */}
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

                        {/* Availability / Uptime Score */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  Number(vehicleUptime) >= 85
                                    ? 'bg-emerald-500'
                                    : Number(vehicleUptime) >= 65
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                )}
                                style={{ width: `${Math.min(100, Number(vehicleUptime))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-zinc-300">
                              {vehicleUptime}%
                            </span>
                          </div>
                        </td>

                        {/* Odometer */}
                        <td className="p-3.5 font-mono text-zinc-300">
                          {v.odometer_km ? `${v.odometer_km.toLocaleString('en-IN')} km` : '—'}
                        </td>

                        {/* Action */}
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
            const vehicleUptime = (
              fleetAvailability.perVehicle.get(v.id) ?? (v.uptime_percentage || 95)
            ).toFixed(1);

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
                        {v.custom_vehicle_id || (v.id || '').toUpperCase()}
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
                  <span>Odo: {v.odometer_km ? `${v.odometer_km.toLocaleString('en-IN')} km` : '—'}</span>
                  <span
                    className={cn(
                      'font-mono font-bold',
                      Number(vehicleUptime) >= 85
                        ? 'text-emerald-400'
                        : Number(vehicleUptime) >= 65
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    )}
                  >
                    {vehicleUptime}% Uptime
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: REPORT VIEW */}
      {viewMode === 'report' && (
        <div className="space-y-6">
          {/* Top Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Availability by Model */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span>Availability by Scooter Model</span>
                </h3>
              </div>
              <div className="space-y-3">
                {(['CS Model', 'Ola Model', 'Single Light Model'] as ScooterModel[]).map((model) => {
                  const subset = filteredVehicles.filter((v) => v.model === model);
                  const ready = subset.filter((v) => v.current_status === 'Available').length;
                  const rate = subset.length > 0 ? ((ready / subset.length) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={model} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-200">{model}</span>
                        <span className="font-mono font-bold text-cyan-400">{rate}% Ready</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{ready} ready / {subset.length} total</span>
                        <span>{subset.length - ready} grounded</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Downtime Distribution by Status */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Fleet Operational Status Mix</span>
                </h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { status: 'Available', color: 'text-emerald-400', barBg: 'bg-emerald-500' },
                  { status: 'Needs Maintenance', color: 'text-amber-400', barBg: 'bg-amber-500' },
                  { status: 'Under Repair', color: 'text-rose-400', barBg: 'bg-rose-500' },
                  { status: 'Not Available', color: 'text-zinc-400', barBg: 'bg-zinc-600' },
                ].map(({ status, color, barBg }) => {
                  const count = filteredVehicles.filter((v) => v.current_status === status).length;
                  const pct = totalFleetCount > 0 ? ((count / totalFleetCount) * 100).toFixed(1) : '0';
                  return (
                    <div key={status} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className={cn('font-bold', color)}>{status}</span>
                        <span className="font-mono text-zinc-300 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className={cn('h-full rounded-full', barBg)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spend by Hub Breakdown */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  <span>Maintenance Spend by Hub</span>
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {hubs.map((hub) => {
                  const hubVehicles = filteredVehicles.filter((v) => v.current_hub_id === hub.id);
                  const hubSpend = hubVehicles.reduce(
                    (acc, v) => acc + (vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0),
                    0
                  );
                  return (
                    <div
                      key={hub.id}
                      className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-zinc-200">{hub.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{hubVehicles.length} vehicles stationed</div>
                      </div>
                      <span className="font-mono font-bold text-purple-300">{formatCurrency(hubSpend)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Downtime & Highest Maintenance Vehicles Table */}
          <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>High Maintenance Spend & Low Availability Vehicles (Focus Register)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141416] text-zinc-400 font-semibold border-b border-[#27272a] uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Hub</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Total Spend</th>
                    <th className="p-3">Uptime ({availabilityDays}D)</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-zinc-300">
                  {filteredVehicles
                    .filter((v) => (vehicleSpendMap.get(v.id) || 0) > 500 || v.current_status !== 'Available')
                    .slice(0, 10)
                    .map((v) => {
                      const hub = hubs.find((h) => h.id === v.current_hub_id);
                      const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
                      const uptime = (fleetAvailability.perVehicle.get(v.id) ?? (v.uptime_percentage || 95)).toFixed(1);
                      return (
                        <tr key={v.id} className="hover:bg-zinc-800/40 transition">
                          <td className="p-3 font-mono font-bold text-zinc-100">
                            {v.custom_vehicle_id || (v.id || '').toUpperCase()} (#{v.key_number})
                          </td>
                          <td className="p-3">{v.model}</td>
                          <td className="p-3">{hub?.name || v.current_hub_id}</td>
                          <td className="p-3">
                            <VehicleStatusBadge status={v.current_status} />
                          </td>
                          <td className="p-3 font-mono font-bold text-purple-300">{formatCurrency(spend)}</td>
                          <td className="p-3 font-mono text-amber-300 font-bold">{uptime}%</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedVehicle(v)}
                              className="px-2 py-1 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-semibold hover:bg-blue-600/30 transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PIPELINE / KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            [
              { status: 'Available', label: 'Available (Ready)', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30' },
              { status: 'Needs Maintenance', label: 'Needs Maintenance', icon: AlertTriangle, color: 'text-amber-400', border: 'border-amber-500/30' },
              { status: 'Under Repair', label: 'Under Repair (Workshop)', icon: Wrench, color: 'text-rose-400', border: 'border-rose-500/30' },
              { status: 'Not Available', label: 'Not Available (Grounded)', icon: Activity, color: 'text-zinc-400', border: 'border-zinc-700' },
            ] as const
          ).map((col) => {
            const list = filteredVehicles.filter((v) => v.current_status === col.status);
            const Icon = col.icon;

            return (
              <div
                key={col.status}
                className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn('w-4 h-4', col.color)} />
                      <span className="text-xs font-bold text-zinc-100">{col.label}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-zinc-300 border border-zinc-700">
                      {list.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1 mt-3">
                    {list.length === 0 ? (
                      <div className="p-6 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl">
                        No vehicles in this stage.
                      </div>
                    ) : (
                      list.map((v) => {
                        const hub = hubs.find((h) => h.id === v.current_hub_id);
                        const spend = vehicleSpendMap.get(v.id) || v.total_maintenance_spend || 0;
                        const uptime = (
                          fleetAvailability.perVehicle.get(v.id) ?? (v.uptime_percentage || 95)
                        ).toFixed(1);

                        return (
                          <div
                            key={v.id}
                            className="p-3.5 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-600 transition space-y-2.5 group"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-zinc-100 text-xs group-hover:text-blue-400 transition">
                                    {v.custom_vehicle_id || (v.id || '').toUpperCase()}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">
                                    #{v.key_number}
                                  </span>
                                </div>
                                <span className="text-[11px] text-zinc-400 block mt-0.5">{v.model}</span>
                              </div>

                              <button
                                onClick={() => setSelectedVehicle(v)}
                                className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition"
                                title="Inspect Vehicle"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1.5 border-t border-zinc-800/80">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block">Hub</span>
                                <span className="text-zinc-300 truncate block">{hub?.name || v.current_hub_id}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block">Spend</span>
                                <span className="font-mono text-purple-300 font-bold block">{formatCurrency(spend)}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
                              <span className="text-zinc-500">Uptime: <strong className="text-zinc-300">{uptime}%</strong></span>
                              <div className="flex items-center gap-1">
                                {(isOwner || isManager) && (
                                  <select
                                    value={v.current_status}
                                    onChange={(e) => handleQuickStatusChange(v, e.target.value as VehicleStatus)}
                                    className="bg-zinc-900 border border-zinc-700 text-[10px] rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none cursor-pointer"
                                  >
                                    <option value="Available">Available</option>
                                    <option value="Needs Maintenance">Needs Maint</option>
                                    <option value="Under Repair">Under Repair</option>
                                    <option value="Not Available">Not Avail</option>
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
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
