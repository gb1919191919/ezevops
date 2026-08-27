'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { JobCard, JobCardPart } from '@/types';
import { ApprovalBadge } from '../common/StatusBadge';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  Car,
  Clock,
  DollarSign,
  Package,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  X,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

export function JobCardsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | '7D' | '14D' | '30D' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedJobForSpares, setSelectedJobForSpares] = useState<JobCard | null>(null);

  const jobCards = useAppStore((s) => s.jobCards);
  const vehicles = useAppStore((s) => s.vehicles);
  const hubs = useAppStore((s) => s.hubs);
  const parts = useAppStore((s) => s.parts);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const approveJobCard = useAppStore((s) => s.approveJobCard);
  const rejectJobCard = useAppStore((s) => s.rejectJobCard);
  const clearBadge = useAppStore((s) => s.clearBadge);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const isGlobalHub = selectedHubIds.includes('ALL') || selectedHubIds.length === 0;

  // Clear sidebar badge on visiting Job Cards (1.2)
  useEffect(() => {
    clearBadge('job_cards');
  }, [clearBadge]);

  // Date filtering logic (6.2)
  const filteredJobCards = useMemo(() => {
    const now = new Date().getTime();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    return jobCards.filter((job) => {
      if (!isGlobalHub && !selectedHubIds.includes(job.hub_id)) return false;

      const isFullAdmin = isOwner || isManager;
      if (!isFullAdmin) {
        const isAssigned = job.assigned_mechanic_id === currentUser?.id;
        const isReporter = job.reported_by === currentUser?.id;
        const isUserHub = currentUser?.assigned_hub_id && job.hub_id === currentUser.assigned_hub_id;
        if (!isAssigned && !isReporter && !isUserHub) return false;
      }

      if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;

      // Date Presets filter
      const jobTime = new Date(job.created_at).getTime();
      if (datePreset === '7D' && jobTime < sevenDaysAgo) return false;
      if (datePreset === '14D' && jobTime < fourteenDaysAgo) return false;
      if (datePreset === '30D' && jobTime < thirtyDaysAgo) return false;
      if (datePreset === 'CUSTOM') {
        if (customStartDate && new Date(job.created_at) < new Date(customStartDate)) return false;
        if (customEndDate && new Date(job.created_at) > new Date(customEndDate + 'T23:59:59')) return false;
      }

      if (!searchTerm.trim()) return true;

      const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
      const q = searchTerm.toLowerCase();

      const matchesTicket = `#${job.ticket_number}`.includes(q);
      const matchesVehicleId = (vehicle?.vehicle_id || '').toLowerCase().includes(q);
      const matchesCustomId = (vehicle?.custom_vehicle_id || '').toLowerCase().includes(q);
      const matchesKey = (vehicle?.key_number || '').toLowerCase().includes(q);
      const matchesDesc = job.issue_description.toLowerCase().includes(q);

      return matchesTicket || matchesVehicleId || matchesCustomId || matchesKey || matchesDesc;
    });
  }, [jobCards, isGlobalHub, selectedHubIds, isOwner, isManager, currentUser, statusFilter, datePreset, customStartDate, customEndDate, searchTerm, vehicles]);

  // Compute Total Cost of Spares in Filtered Set
  const totalFilteredSparesSpend = useMemo(() => {
    return filteredJobCards.reduce((total, job) => {
      const jobPartsTotal = (job.parts || []).reduce(
        (sum, p) => sum + p.quantity * p.unit_cost_snapshot,
        0
      );
      return total + jobPartsTotal;
    }, 0);
  }, [filteredJobCards]);

  const handleApprove = (id: string) => {
    approveJobCard(id, 'Approved by Operations Manager');
    toast.success('Job card approved! Spare parts physically deducted from hub stock.');
  };

  const handleReject = (id: string) => {
    const reason = prompt('Enter reason for job card rejection:') || 'Rejected by Manager';
    rejectJobCard(id, reason);
    toast.error('Job card rejected.');
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredJobCards.map((job) => {
      const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
      const hub = hubs.find((h) => h.id === job.hub_id);
      const partsTotal = (job.parts || []).reduce((sum, p) => sum + p.quantity * p.unit_cost_snapshot, 0);

      return {
        'Ticket #': job.ticket_number,
        'Vehicle Key': vehicle?.key_number || '-',
        'Vehicle ID': vehicle?.custom_vehicle_id || vehicle?.vehicle_id || '-',
        'Chassis VIN': vehicle?.vin || '-',
        'Hub': hub?.name.split(' (')[0] || '-',
        'Issue Description': job.issue_description,
        'Status': job.status,
        'Spares Count': job.parts?.length || 0,
        'Total Spares Cost (INR)': partsTotal,
        'Logged Date': formatDate(job.created_at),
        'Approved Date': job.approved_at ? formatDate(job.approved_at) : '-',
      };
    });

    exportToCSV('ezev_mumbai_job_cards', data);
  };

  const handleExportPDF = () => {
    const headers = ['Ticket', 'Key', 'Vehicle ID', 'Hub', 'Status', 'Spares Qty', 'Cost', 'Date'];
    const rows = filteredJobCards.map((job) => {
      const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
      const hub = hubs.find((h) => h.id === job.hub_id);
      const partsTotal = (job.parts || []).reduce((sum, p) => sum + p.quantity * p.unit_cost_snapshot, 0);
      return [
        `#${job.ticket_number}`,
        vehicle?.key_number || '-',
        vehicle?.custom_vehicle_id || vehicle?.vehicle_id || '-',
        hub?.name.split(' (')[0] || '-',
        job.status,
        job.parts?.length.toString() || '0',
        formatCurrency(partsTotal),
        formatDate(job.created_at),
      ];
    });

    exportToPDF('Maintenance Job Cards Ledger', `${filteredJobCards.length} Tickets`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Total Maintenance Tickets</span>
            <Wrench className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono font-black text-2xl text-zinc-100">{filteredJobCards.length}</div>
          <p className="text-[11px] text-zinc-500">{jobCards.filter((j) => j.status === 'PENDING').length} Pending sign-off</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Spares Allocated Spend</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-mono font-black text-2xl text-purple-300">
            {formatCurrency(totalFilteredSparesSpend)}
          </div>
          <p className="text-[11px] text-zinc-500">Cumulative parts replacement value</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Completed Repairs</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-mono font-black text-2xl text-blue-400">
            {jobCards.filter((j) => j.status === 'APPROVED').length}
          </div>
          <p className="text-[11px] text-zinc-500">Signed off & road-ready</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono font-black text-2xl text-amber-400">
            {jobCards.filter((j) => j.status === 'PENDING').length}
          </div>
          <p className="text-[11px] text-zinc-500">Awaiting manager sign-off</p>
        </div>
      </div>

      {/* Control Bar: Search, Date Presets, View Switcher & Export */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f] backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search ticket #, Key, Vehicle ID, or defect..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Tickets ({jobCards.length})</option>
              <option value="PENDING" className="bg-[#1c1c1f]">Pending Review</option>
              <option value="APPROVED" className="bg-[#1c1c1f]">Approved</option>
              <option value="REJECTED" className="bg-[#1c1c1f]">Rejected</option>
            </select>
          </div>

          {/* 6.2 Date Presets (7D, 14D, 30D, Custom) */}
          <div className="flex items-center bg-[#141416] border border-[#2a2a2f] rounded-xl p-1 gap-1 text-xs">
            {(['ALL', '7D', '14D', '30D', 'CUSTOM'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold text-[11px] transition',
                  datePreset === preset
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {preset === 'ALL' ? 'All Time' : preset}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if CUSTOM selected */}
          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2 py-1 text-xs">
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

          {/* Universal View Switcher */}
          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          {/* Export Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
              title="Export Job Cards to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={handleExportPDF}
              className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
              title="Export Job Cards to PDF"
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
                  <th className="p-3.5 pl-4">Ticket & Vehicle</th>
                  <th className="p-3.5">Hub & Date</th>
                  <th className="p-3.5">Issue / Defect Description</th>
                  <th className="p-3.5">Parts Consumed</th>
                  <th className="p-3.5">Spares Cost</th>
                  <th className="p-3.5">Approval Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] text-zinc-300">
                {filteredJobCards.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No job cards found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredJobCards.map((job) => {
                    const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
                    const hub = hubs.find((h) => h.id === job.hub_id);
                    const partsTotal = (job.parts || []).reduce(
                      (acc, p) => acc + p.quantity * p.unit_cost_snapshot,
                      0
                    );

                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-zinc-800/40 transition cursor-pointer"
                        onClick={() => setSelectedJobForSpares(job)}
                      >
                        <td className="p-3.5 pl-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">
                              #{job.ticket_number}
                            </span>
                            <span className="font-mono font-bold text-blue-300 text-xs px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30">
                              Key: #{vehicle?.key_number || 'N/A'}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                            {vehicle?.custom_vehicle_id || vehicle?.vehicle_id}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-zinc-200 font-medium">
                            {hub?.name.split(' (')[0] || 'Store 1'}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {formatDate(job.created_at)}
                          </span>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <p className="text-zinc-200 line-clamp-1 font-medium">
                            {job.issue_description}
                          </p>
                          {job.solution_applied && (
                            <p className="text-[10px] text-zinc-500 italic mt-0.5 line-clamp-1">
                              Action: {job.solution_applied}
                            </p>
                          )}
                        </td>

                        {/* 5.1 & 6.2 Parts Consumed Badge & Drawer Trigger */}
                        <td className="p-3.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJobForSpares(job);
                            }}
                            className="px-2 py-1 rounded-lg bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition"
                            title="Click to view itemized spares drawer"
                          >
                            <Package className="w-3.5 h-3.5 text-blue-400" />
                            <span>{job.parts?.length || 0} Parts Used</span>
                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                          </button>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-purple-300">
                          {formatCurrency(partsTotal)}
                        </td>

                        <td className="p-3.5">
                          <ApprovalBadge status={job.status} />
                        </td>

                        <td className="p-3.5 text-right pr-4 space-x-1.5">
                          {job.status === 'PENDING' && (isOwner || isManager) ? (
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleApprove(job.id)}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg text-xs transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(job.id)}
                                className="px-2 py-1 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 rounded-lg text-xs transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJobForSpares(job);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-300 text-xs transition"
                            >
                              Details
                            </button>
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

      {/* VIEW 2: REPORT VIEW (COST & PARTS BREAKDOWN) */}
      {viewMode === 'report' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Job Card Spares Breakdown</span>
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredJobCards.map((job) => {
                const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
                const partsCost = (job.parts || []).reduce((s, p) => s + p.quantity * p.unit_cost_snapshot, 0);
                return (
                  <div key={job.id} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">#{job.ticket_number}</span>
                        <span className="font-bold text-zinc-200">Key #{vehicle?.key_number}</span>
                      </div>
                      <span className="font-mono font-bold text-purple-300">{formatCurrency(partsCost)}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {job.parts && job.parts.length > 0 ? (
                        job.parts
                          .map((p) => {
                            const part = parts.find((pt) => pt.id === p.part_id);
                            return `${p.quantity}x ${part?.name || p.part_id}`;
                          })
                          .join(', ')
                      ) : (
                        'No replacement parts used'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Maintenance Spend by Status</span>
            </h3>
            <div className="space-y-2">
              {(['APPROVED', 'PENDING', 'REJECTED'] as const).map((st) => {
                const subset = filteredJobCards.filter((j) => j.status === st);
                const total = subset.reduce((sum, j) => {
                  return sum + (j.parts || []).reduce((pSum, p) => pSum + p.quantity * p.unit_cost_snapshot, 0);
                }, 0);

                return (
                  <div key={st} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-zinc-200">{st} Tickets ({subset.length})</div>
                      <div className="text-[10px] text-zinc-500">Total parts value</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrency(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PIPELINE / KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => {
            const list = filteredJobCards.filter((j) => j.status === st);
            return (
              <div key={st} className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200">{st}</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {list.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {list.length === 0 ? (
                    <div className="p-6 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl">
                      No tickets in {st}.
                    </div>
                  ) : (
                    list.map((job) => {
                      const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
                      const partsCost = (job.parts || []).reduce((s, p) => s + p.quantity * p.unit_cost_snapshot, 0);
                      return (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJobForSpares(job)}
                          className="p-3 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-600 cursor-pointer transition text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-emerald-400">#{job.ticket_number}</span>
                            <span className="font-mono text-blue-300 font-bold">Key #{vehicle?.key_number}</span>
                          </div>
                          <p className="text-zinc-200 line-clamp-2">{job.issue_description}</p>
                          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800">
                            <span>{job.parts?.length || 0} Spares</span>
                            <span className="font-mono text-purple-300 font-bold">{formatCurrency(partsCost)}</span>
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

      {/* 5.1 & 6.2 Expandable Item Drawer / Job Card Spares Modal */}
      {selectedJobForSpares && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                  #{selectedJobForSpares.ticket_number}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Job Card Maintenance & Spare Parts Breakdown
                  </h3>
                  {(() => {
                    const v = vehicles.find((veh) => veh.id === selectedJobForSpares.vehicle_id);
                    return (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Vehicle Key #{v?.key_number} ({v?.custom_vehicle_id || v?.vehicle_id}) • {formatDate(selectedJobForSpares.created_at)}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <button
                onClick={() => setSelectedJobForSpares(null)}
                className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Issue Description Box */}
              <div className="p-3.5 rounded-xl bg-[#141416] border border-[#27272a] space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Reported Problem</span>
                <p className="text-xs text-zinc-200">{selectedJobForSpares.issue_description}</p>
                {selectedJobForSpares.solution_applied && (
                  <p className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-800 mt-1">
                    Mechanic Action: {selectedJobForSpares.solution_applied}
                  </p>
                )}
              </div>

              {/* Itemized Spares List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    <span>Allocated & Consumed Spare Parts ({selectedJobForSpares.parts?.length || 0})</span>
                  </h4>
                </div>

                {!selectedJobForSpares.parts || selectedJobForSpares.parts.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
                    No replacement spare parts logged for this job card.
                  </div>
                ) : (
                  <div className="border border-[#2a2a2f] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#141416] text-zinc-400 border-b border-[#27272a] text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="p-2.5 pl-3">Spare Part & SKU</th>
                          <th className="p-2.5">Quantity</th>
                          <th className="p-2.5">Unit Cost</th>
                          <th className="p-2.5 text-right pr-3">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272a] text-zinc-300">
                        {selectedJobForSpares.parts.map((p) => {
                          const partCatalog = parts.find((pt) => pt.id === p.part_id);
                          return (
                            <tr key={p.id} className="hover:bg-zinc-800/30">
                              <td className="p-2.5 pl-3">
                                <div className="font-bold text-zinc-200">{partCatalog?.name || p.part_id}</div>
                                <div className="text-[10px] font-mono text-blue-400">{partCatalog?.sku || '-'}</div>
                              </td>
                              <td className="p-2.5 font-mono font-bold text-zinc-200">
                                {p.quantity} Pcs
                              </td>
                              <td className="p-2.5 font-mono text-zinc-300">
                                {formatCurrency(p.unit_cost_snapshot)}
                              </td>
                              <td className="p-2.5 text-right pr-3 font-mono font-bold text-purple-300">
                                {formatCurrency(p.quantity * p.unit_cost_snapshot)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              {selectedJobForSpares.parts && selectedJobForSpares.parts.length > 0 && (
                <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">Total Job Card Cost:</span>
                  <span className="font-mono font-bold text-base text-purple-300">
                    {formatCurrency(
                      selectedJobForSpares.parts.reduce((sum, p) => sum + p.quantity * p.unit_cost_snapshot, 0)
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#141416] border-t border-[#27272a] flex items-center justify-between">
              <ApprovalBadge status={selectedJobForSpares.status} />
              <button
                onClick={() => setSelectedJobForSpares(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
