'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { DailyShiftLog } from '@/types';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { formatDate, formatDateOnly, cn } from '@/lib/utils';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTh } from '../common/ResizableTh';
import { KpiCardContainer } from '../common/KpiCardContainer';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Building2,
  User,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  X,
  Image as ImageIcon,
  Paperclip,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  Wrench,
  Clock,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

type ShiftSortField = 'date' | 'staff_name' | 'vehicles_serviced' | 'shift_type' | 'created_at' | 'hub_id' | 'customer_issues_resolved';
type SortOrder = 'asc' | 'desc';

export function DailyShiftLogs() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [hubFilter, setHubFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<ShiftSortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftType, setShiftType] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [logHubId, setLogHubId] = useState('');
  const [accomplishments, setAccomplishments] = useState('');
  const [vehiclesServiced, setVehiclesServiced] = useState<number>(0);
  const [customerIssuesResolved, setCustomerIssuesResolved] = useState<number>(0);
  const [blockers, setBlockers] = useState('');
  const [mediaAttachments, setMediaAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dailyShiftLogs = useAppStore((s) => s.dailyShiftLogs || []);
  const addDailyShiftLog = useAppStore((s) => s.addDailyShiftLog);
  const hubs = useAppStore((s) => s.hubs || []);
  const staffProfiles = useAppStore((s) => s.staffProfiles || []);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const isGlobalHub = selectedHubIds.includes('ALL') || selectedHubIds.length === 0;

  // Resizable columns
  const { widths, startResizing } = useResizableColumns('shift-logs-table', {
    date_shift: 160,
    staff: 180,
    hub: 150,
    accomplishments: 260,
    metrics: 160,
    blockers: 180,
  });

  const handleSort = (field: ShiftSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderSortIndicator = (field: ShiftSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400" />
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setMediaAttachments((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Attached ${files.length} shift report media file(s)`);
  };

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const list = dailyShiftLogs.filter((log) => {
      if (!isGlobalHub && !selectedHubIds.includes(log.hub_id)) return false;
      if (hubFilter !== 'ALL' && log.hub_id !== hubFilter) return false;
      const logStaffName = log.staff_name || log.author_name || '';
      const logDate = log.date || log.shift_date || '';
      const logBlockers = log.blockers || log.roadblocks || '';
      if (staffFilter !== 'ALL' && logStaffName !== staffFilter) return false;

      // Date filtering
      if (dateFilter === 'TODAY' && logDate !== todayStr) return false;
      if (dateFilter === '7D' && logDate < sevenDaysAgo) return false;
      if (dateFilter === '30D' && logDate < thirtyDaysAgo) return false;
      if (dateFilter === 'CUSTOM') {
        if (customStartDate && logDate < customStartDate) return false;
        if (customEndDate && logDate > customEndDate) return false;
      }

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const hub = hubs.find((h) => h.id === log.hub_id);
      return (
        logStaffName.toLowerCase().includes(q) ||
        (log.accomplishments || '').toLowerCase().includes(q) ||
        logBlockers.toLowerCase().includes(q) ||
        (hub?.name || '').toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'date') {
        const aDate = a.date || a.shift_date || '';
        const bDate = b.date || b.shift_date || '';
        comp = aDate.localeCompare(bDate);
      } else if (sortField === 'staff_name') {
        const aStaff = a.staff_name || a.author_name || '';
        const bStaff = b.staff_name || b.author_name || '';
        comp = aStaff.localeCompare(bStaff);
      } else if (sortField === 'vehicles_serviced') {
        comp = (a.vehicles_serviced || 0) - (b.vehicles_serviced || 0);
      } else if (sortField === 'shift_type') {
        comp = (a.shift_type || '').localeCompare(b.shift_type || '');
      } else if (sortField === 'created_at') {
        comp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [
    dailyShiftLogs,
    hubFilter,
    staffFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    selectedHubIds,
    isGlobalHub,
    searchTerm,
    hubs,
    sortField,
    sortOrder,
  ]);

  // Dynamic Staff List for Dropdown
  const uniqueStaffNames = useMemo(() => {
    const names = new Set<string>();
    dailyShiftLogs.forEach((l) => {
      if (l.staff_name) names.add(l.staff_name);
    });
    staffProfiles.forEach((p) => {
      if (p.full_name) names.add(p.full_name);
    });
    return Array.from(names);
  }, [dailyShiftLogs, staffProfiles]);

  const totalServicedInFiltered = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + (l.vehicles_serviced || 0), 0);
  }, [filteredLogs]);

  const totalDisputesResolvedInFiltered = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + (l.customer_issues_resolved || 0), 0);
  }, [filteredLogs]);

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accomplishments.trim()) {
      toast.error('Please describe your key shift accomplishments.');
      return;
    }

    const selectedHub = logHubId || currentUser?.assigned_hub_id || hubs[0]?.id;

    addDailyShiftLog({
      date: logDate,
      shift_type: shiftType,
      hub_id: selectedHub,
      staff_name: currentUser?.full_name || 'Staff Member',
      staff_role: currentUser?.roles?.[0]?.label || 'TECHNICIAN',
      accomplishments: accomplishments.trim(),
      vehicles_serviced: Number(vehiclesServiced),
      customer_issues_resolved: Number(customerIssuesResolved),
      blockers: blockers.trim() || undefined,
    });

    toast.success('Daily shift log submitted successfully!');
    setShiftModalOpen(false);
    setAccomplishments('');
    setVehiclesServiced(0);
    setCustomerIssuesResolved(0);
    setBlockers('');
    setMediaAttachments([]);
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredLogs.map((log) => {
      const hub = hubs.find((h) => h.id === log.hub_id);
      return {
        Date: log.date || log.shift_date || '',
        Shift: log.shift_type,
        'Staff Name': log.staff_name || log.author_name || '',
        Role: log.staff_role || log.author_role || '',
        Hub: hub ? hub.name : log.hub_id,
        Accomplishments: log.accomplishments,
        'Vehicles Serviced': log.vehicles_serviced || 0,
        'Disputes Resolved': log.customer_issues_resolved || 0,
        'Blockers / Roadblocks': log.blockers || log.roadblocks || 'None',
        'Logged At': formatDate(log.created_at),
      };
    });
    exportToCSV(data, 'ezev_daily_shift_logs');
    toast.success('Shift Logs exported to CSV');
  };

  const handleExportPDF = () => {
    const headers = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Staff', dataKey: 'staff' },
      { header: 'Shift', dataKey: 'shift' },
      { header: 'Hub', dataKey: 'hub' },
      { header: 'Serviced', dataKey: 'serviced' },
      { header: 'Summary', dataKey: 'summary' },
    ];
    const rows = filteredLogs.map((log) => {
      const hub = hubs.find((h) => h.id === log.hub_id);
      return {
        date: log.date || log.shift_date || '',
        staff: log.staff_name || log.author_name || '',
        shift: log.shift_type,
        hub: hub ? hub.name : log.hub_id,
        serviced: `${log.vehicles_serviced || 0} EVs`,
        summary: log.accomplishments.slice(0, 60),
      };
    });
    exportToPDF('EzEv Mumbai Staff Activity Logs', headers, rows, 'ezev_shift_logs.pdf');
    toast.success('Generated PDF Report');
  };

  return (
    <div className="space-y-6">
      {/* Header with Call to Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Daily Staff Activity & Operations Logs
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Shift-wise technician servicing records, roadblock escalations, and customer resolutions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShiftModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Shift Activity Log</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards with Customizable Layout */}
      <KpiCardContainer
        storageKey="shiftlogs-kpis"
        title="Shift Output Summary"
        subtitle="Cumulative servicing throughput and field performance"
      >
        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Total Shift Reports
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-zinc-100 mt-1">
            {filteredLogs.length} Logs
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Across active filters
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Vehicles Serviced
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-emerald-400 mt-1">
            {totalServicedInFiltered} EVs
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Cumulative field repairs
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-blue-400">
            Issues Resolved
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-blue-400 mt-1">
            {totalDisputesResolvedInFiltered} Cases
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Customer assistance actions
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Blockers Logged
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-amber-400 mt-1">
            {filteredLogs.filter((l) => !!l.blockers).length} Shifts
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Requiring manager intervention
          </span>
        </div>
      </KpiCardContainer>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search accomplishments, staff, blockers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
          {/* Staff Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Staff ({uniqueStaffNames.length})</option>
              {uniqueStaffNames.map((name) => (
                <option key={name} value={name} className="bg-[#1c1c1f]">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Hub Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
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

          {/* Date Filter */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[#141416] border border-[#2a2a2f]">
            {(['ALL', 'TODAY', '7D', '30D', 'CUSTOM'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDateFilter(preset)}
                className={cn(
                  'px-2 py-1 rounded-lg font-semibold text-[11px] transition',
                  dateFilter === preset
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {preset === 'ALL' ? 'All' : preset}
              </button>
            ))}
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-1 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2 py-1 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs focus:outline-none"
              />
              <span className="text-zinc-500">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs focus:outline-none"
              />
            </div>
          )}

          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={handleExportPDF}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export to PDF"
          >
            <FileText className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <ResizableTh
                    colKey="date_shift"
                    width={widths.date_shift}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('date')}
                    className="p-3.5 pl-4 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Date & Shift</span>
                    {renderSortIndicator('date')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="staff"
                    width={widths.staff}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('staff_name')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Staff Member</span>
                    {renderSortIndicator('staff_name')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="hub"
                    width={widths.hub}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('hub_id')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Hub Station</span>
                    {renderSortIndicator('hub_id')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="accomplishments"
                    width={widths.accomplishments}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    <span>Summary of Accomplishments</span>
                  </ResizableTh>

                  <ResizableTh
                    colKey="serviced"
                    width={widths.serviced}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('vehicles_serviced')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Vehicles</span>
                    {renderSortIndicator('vehicles_serviced')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="issues"
                    width={widths.issues}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('customer_issues_resolved')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Issues</span>
                    {renderSortIndicator('customer_issues_resolved')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="blockers"
                    width={widths.blockers}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    <span>Blockers & Handover</span>
                  </ResizableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] text-zinc-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No shift activity logs found matching the filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const hub = hubs.find((h) => h.id === log.hub_id);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                        <td className="p-3.5 pl-4">
                          <span className="font-mono font-bold text-zinc-100 block">
                            {formatDate(log.date)}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {log.shift_type} Shift
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">
                              {(log.staff_name || 'Staff').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-zinc-200 block">{log.staff_name || 'Staff Member'}</span>
                              <span className="text-[10px] text-zinc-500">{log.staff_role || 'Technician'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-zinc-300">
                          {hub ? hub.name : log.hub_id}
                        </td>

                        <td className="p-3.5 text-zinc-200">
                          <p className="line-clamp-2 max-w-sm">{log.accomplishments || 'Shift routine operations completed.'}</p>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {log.vehicles_serviced || 0}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-blue-400">
                          {log.customer_issues_resolved || 0}
                        </td>

                        <td className="p-3.5 text-zinc-400">
                          {log.blockers ? (
                            <span className="text-amber-400 text-xs line-clamp-1">
                              ⚠️ {log.blockers}
                            </span>
                          ) : log.handover_notes ? (
                            <span className="text-zinc-400 text-xs line-clamp-1">
                              📝 {log.handover_notes}
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-xs">—</span>
                          )}
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

      {/* VIEW 3: REPORT VIEW */}
      {viewMode === 'report' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shifts by Shift Type */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span>Shifts by Time Interval</span>
              </h3>
              <div className="space-y-2.5">
                {(['MORNING', 'EVENING', 'NIGHT', 'GENERAL'] as const).map((sType) => {
                  const subset = filteredLogs.filter((l) => l.shift_type === sType);
                  const totalServiced = subset.reduce((acc, l) => acc + (l.vehicles_serviced || 0), 0);
                  return (
                    <div key={sType} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 block">{sType}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{subset.length} shifts logged</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">{totalServiced} vehicles</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hub Activity Breakdown */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Hub Service Volume</span>
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {hubs.map((hub) => {
                  const subset = filteredLogs.filter((l) => l.hub_id === hub.id);
                  const totalVehicles = subset.reduce((acc, l) => acc + (l.vehicles_serviced || 0), 0);
                  const totalIssues = subset.reduce((acc, l) => acc + (l.customer_issues_resolved || 0), 0);
                  return (
                    <div key={hub.id} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 block">{hub.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{subset.length} shift logs</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-emerald-400 font-bold block">{totalVehicles} serviced</span>
                        <span className="text-blue-400">{totalIssues} resolved</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Contributing Staff */}
            <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span>Staff Activity Summary</span>
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {Array.from(new Set(filteredLogs.map((l) => l.staff_name).filter(Boolean))).map((name) => {
                  const staffLogs = filteredLogs.filter((l) => l.staff_name === name);
                  const totalServiced = staffLogs.reduce((acc, l) => acc + (l.vehicles_serviced || 0), 0);
                  return (
                    <div key={name} className="p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 block">{name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{staffLogs[0]?.staff_role || 'Technician'} ({staffLogs.length} logs)</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">{totalServiced} vehicles</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PIPELINE / KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['MORNING', 'EVENING', 'NIGHT', 'GENERAL'] as const).map((sType) => {
            const list = filteredLogs.filter((l) => l.shift_type === sType);
            return (
              <div key={sType} className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                  <span className="text-xs font-bold text-zinc-200">{sType} Shift</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400 border border-zinc-700">
                    {list.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                  {list.length === 0 ? (
                    <div className="p-6 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl">
                      No logs for {sType}.
                    </div>
                  ) : (
                    list.map((log) => {
                      const hub = hubs.find((h) => h.id === log.hub_id);
                      return (
                        <div
                          key={log.id}
                          className="p-3.5 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-600 transition space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-zinc-100 block">{log.staff_name || 'Staff Member'}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{log.date} • {hub?.name || log.hub_id}</span>
                            </div>
                            <span className="font-mono text-emerald-400 font-bold text-[11px]">{log.vehicles_serviced || 0} V</span>
                          </div>
                          <p className="text-zinc-300 line-clamp-2 text-[11px]">{log.accomplishments || 'Shift task completed'}</p>
                          {log.blockers && (
                            <p className="text-amber-400 text-[10px] truncate">⚠️ {log.blockers}</p>
                          )}
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

      {/* Modal: Submit Daily Activity Log */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="submit-shift-log-title">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
              <h3 id="submit-shift-log-title" className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-400" />
                <span>Submit Daily Shift & Activity Report</span>
              </h3>
              <button
                onClick={() => setShiftModalOpen(false)}
                aria-label="Close dialog"
                className="text-zinc-400 hover:text-zinc-200 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLog} className="p-5 space-y-3.5 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="shift-date-input" className="text-zinc-300 font-semibold">Shift Date</label>
                  <input
                    id="shift-date-input"
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="shift-timing-select" className="text-zinc-300 font-semibold">Shift Timing</label>
                  <select
                    id="shift-timing-select"
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="MORNING">Morning Shift (07:00 - 15:30)</option>
                    <option value="EVENING">Evening Shift (15:30 - 23:30)</option>
                    <option value="NIGHT">Night Shift (23:30 - 07:30)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="shift-hub-select" className="text-zinc-300 font-semibold">Hub Location</label>
                <select
                  id="shift-hub-select"
                  value={logHubId}
                  onChange={(e) => setLogHubId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="shift-accomplishments-input" className="text-zinc-300 font-semibold">Accomplishments & Key Activities</label>
                <textarea
                  id="shift-accomplishments-input"
                  rows={3}
                  required
                  value={accomplishments}
                  onChange={(e) => setAccomplishments(e.target.value)}
                  placeholder="Detailed work completed today (e.g. Serviced 8 CS scooters, replaced 3 throttle cables, swapped 12 depleted batteries)..."
                  className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="shift-vehicles-serviced-input" className="text-zinc-300 font-semibold">Vehicles Serviced Count</label>
                  <input
                    id="shift-vehicles-serviced-input"
                    type="number"
                    min="0"
                    value={vehiclesServiced}
                    onChange={(e) => setVehiclesServiced(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="shift-disputes-handled-input" className="text-zinc-300 font-semibold">Disputes / Issues Handled</label>
                  <input
                    id="shift-disputes-handled-input"
                    type="number"
                    min="0"
                    value={customerIssuesResolved}
                    onChange={(e) => setCustomerIssuesResolved(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="shift-blockers-input" className="text-zinc-300 font-semibold">Blockers / Roadblocks (Optional)</label>
                <textarea
                  id="shift-blockers-input"
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Any parts shortages, tools broken, or security issues requiring manager escalation..."
                  className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Media Attachments */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Attach Photos / Shift Receipts ({mediaAttachments.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {mediaAttachments.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {mediaAttachments.map((photo, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-zinc-800 aspect-square group">
                        <img src={photo} alt={`Report Media ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setMediaAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-rose-400 hover:text-rose-200 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Submit Activity Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
