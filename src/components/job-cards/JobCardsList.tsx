'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { JobCard, JobCardPart, Vehicle } from '@/types';
import { ApprovalBadge } from '../common/StatusBadge';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTh } from '../common/ResizableTh';
import { KpiCardContainer } from '../common/KpiCardContainer';
import { ConfirmModal } from '../common/ConfirmModal';
import { VehicleDetailModal } from '../fleet/VehicleDetailModal';
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
  Plus,
  Image as ImageIcon,
  Paperclip,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type JobSortField = 'ticket_number' | 'vehicle_id' | 'created_at' | 'parts_cost' | 'status';
type SortOrder = 'asc' | 'desc';

export function JobCardsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | '7D' | '14D' | '30D' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedJobForSpares, setSelectedJobForSpares] = useState<JobCard | null>(null);
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<Vehicle | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<JobSortField>('ticket_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Create Job Card Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newHubId, setNewHubId] = useState('hub-store-01');
  const [newIssue, setNewIssue] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState(1);
  const [newStagedParts, setNewStagedParts] = useState<{ part_id: string; quantity: number; unit_cost_snapshot: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-App Confirm Modal State for Rejecting/Resolving tickets
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    jobId: string;
    action: 'approve' | 'reject' | 'resolve';
    title: string;
    description: string;
  }>({
    isOpen: false,
    jobId: '',
    action: 'approve',
    title: '',
    description: '',
  });
  const [rejectionNotes, setRejectionNotes] = useState('');

  const jobCards = useAppStore((s) => s.jobCards || []);
  const vehicles = useAppStore((s) => s.vehicles || []);
  const hubs = useAppStore((s) => s.hubs || []);
  const parts = useAppStore((s) => s.parts || []);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const createJobCard = useAppStore((s) => s.createJobCard);
  const approveJobCard = useAppStore((s) => s.approveJobCard);
  const rejectJobCard = useAppStore((s) => s.rejectJobCard);
  const clearBadge = useAppStore((s) => s.clearBadge);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const isGlobalHub = selectedHubIds.includes('ALL') || selectedHubIds.length === 0;

  // Resizable columns
  const { widths, startResizing } = useResizableColumns('jobcards-table', {
    ticket_veh: 190,
    hub_date: 150,
    issue: 240,
    parts: 160,
    cost: 120,
    status: 130,
    actions: 140,
  });

  // Clear sidebar badge on visiting Job Cards
  useEffect(() => {
    clearBadge('job_cards');
  }, [clearBadge]);

  const handleSort = (field: JobSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Date filtering logic
  const filteredJobCards = useMemo(() => {
    const now = new Date().getTime();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const list = jobCards.filter((job) => {
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
      const matchesDesc = (job.issue_description || '').toLowerCase().includes(q);

      return matchesTicket || matchesVehicleId || matchesCustomId || matchesKey || matchesDesc;
    });

    return list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'ticket_number') {
        comp = a.ticket_number - b.ticket_number;
      } else if (sortField === 'vehicle_id') {
        comp = (a.vehicle_id || '').localeCompare(b.vehicle_id || '');
      } else if (sortField === 'created_at') {
        comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'parts_cost') {
        const costA = (a.parts || []).reduce((s, p) => s + (p?.quantity || 0) * (p?.unit_cost_snapshot || 0), 0);
        const costB = (b.parts || []).reduce((s, p) => s + (p?.quantity || 0) * (p?.unit_cost_snapshot || 0), 0);
        comp = costA - costB;
      } else if (sortField === 'status') {
        comp = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [
    jobCards,
    isGlobalHub,
    selectedHubIds,
    isOwner,
    isManager,
    currentUser,
    statusFilter,
    datePreset,
    customStartDate,
    customEndDate,
    searchTerm,
    vehicles,
    sortField,
    sortOrder,
  ]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setNewPhotos((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Attached ${files.length} media file(s)`);
  };

  const handleAddStagedPart = () => {
    if (!selectedPartId) return;
    const partObj = parts.find((p) => p.id === selectedPartId);
    if (!partObj) return;

    setNewStagedParts((prev) => [
      ...prev,
      {
        part_id: partObj.id,
        quantity: selectedPartQty,
        unit_cost_snapshot: partObj.unit_cost,
      },
    ]);
    setSelectedPartId('');
    setSelectedPartQty(1);
  };

  const handleCreateJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleId || !newIssue.trim()) {
      toast.error('Please select a vehicle and specify the issue description.');
      return;
    }

    createJobCard({
      vehicle_id: newVehicleId,
      hub_id: newHubId,
      issue_description: newIssue.trim(),
      solution_applied: newSolution.trim() || undefined,
      reported_by: currentUser?.id || 'admin',
      assigned_mechanic_id: currentUser?.id || 'admin',
      photos_url: newPhotos,
      parts: newStagedParts.map((p, idx) => ({
        id: `temp-${Date.now()}-${idx}`,
        job_card_id: '',
        part_id: p.part_id,
        quantity: p.quantity,
        unit_cost_snapshot: p.unit_cost_snapshot,
        is_approved: false,
        created_at: new Date().toISOString(),
      })),
    });

    toast.success('Maintenance Job Card created and submitted for review!');
    setCreateModalOpen(false);
    setNewVehicleId('');
    setNewIssue('');
    setNewSolution('');
    setNewPhotos([]);
    setNewStagedParts([]);
  };

  const handleConfirmAction = () => {
    if (confirmModal.action === 'approve') {
      approveJobCard(confirmModal.jobId, 'Approved via Job Cards Desk');
      toast.success('Job card approved! Spare parts physically deducted from inventory.');
    } else if (confirmModal.action === 'reject') {
      rejectJobCard(confirmModal.jobId, rejectionNotes.trim() || 'Rejected by Manager');
      toast.error('Job card rejected.');
    }
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
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
        Hub: hub?.name ? (hub.name.split(' (')?.[0] || hub.name) : (hub?.code || '-'),
        'Issue Description': job.issue_description,
        Status: job.status,
        'Spares Count': job.parts?.length || 0,
        'Total Spares Cost (INR)': partsTotal,
        'Media Count': job.photos_url?.length || 0,
        'Logged Date': formatDate(job.created_at),
        'Approved Date': job.approved_at ? formatDate(job.approved_at) : '-',
      };
    });

    exportToCSV(data, 'ezev_mumbai_job_cards');
    toast.success('Job Cards exported to CSV');
  };

  const handleExportPDF = () => {
    const headers = [
      { header: 'Ticket', dataKey: 'ticket' },
      { header: 'Key', dataKey: 'key' },
      { header: 'Vehicle ID', dataKey: 'vehId' },
      { header: 'Hub', dataKey: 'hub' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Cost', dataKey: 'cost' },
      { header: 'Date', dataKey: 'date' },
    ];
    const rows = filteredJobCards.map((job) => {
      const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
      const hub = hubs.find((h) => h.id === job.hub_id);
      const partsTotal = (job.parts || []).reduce((sum, p) => sum + (p?.quantity || 0) * (p?.unit_cost_snapshot || 0), 0);
      return {
        ticket: `#${job.ticket_number}`,
        key: vehicle?.key_number || '-',
        vehId: vehicle?.custom_vehicle_id || vehicle?.vehicle_id || '-',
        hub: hub?.name ? (hub.name.split(' (')?.[0] || hub.name) : (hub?.code || '-'),
        status: job.status,
        cost: formatCurrency(partsTotal),
        date: formatDate(job.created_at),
      };
    });

    exportToPDF('Maintenance Job Cards Ledger', headers, rows, 'ezev_job_cards_ledger.pdf');
    toast.success('Exported Job Cards to PDF');
  };

  const renderSortIndicator = (field: JobSortField) => {
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
      {/* Top Metrics Cards with KpiCardContainer */}
      <KpiCardContainer
        storageKey="jobcards-kpis"
        title="Maintenance Job Cards Overview"
        subtitle="Operational repairs, spare parts consumption, and pending sign-offs"
      >
        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Total Maintenance Tickets</span>
            <Wrench className="kpi-icon w-4 h-4 text-emerald-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-zinc-100">{filteredJobCards.length}</div>
          <p className="text-[11px] text-zinc-500">
            {jobCards.filter((j) => j.status === 'PENDING').length} Pending sign-off
          </p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Spares Allocated Spend</span>
            <DollarSign className="kpi-icon w-4 h-4 text-purple-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-purple-300">
            {formatCurrency(totalFilteredSparesSpend)}
          </div>
          <p className="text-[11px] text-zinc-500">Cumulative parts replacement value</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Completed Repairs</span>
            <CheckCircle2 className="kpi-icon w-4 h-4 text-blue-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-blue-400">
            {jobCards.filter((j) => j.status === 'APPROVED').length}
          </div>
          <p className="text-[11px] text-zinc-500">Signed off & road-ready</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Pending Review</span>
            <Clock className="kpi-icon w-4 h-4 text-amber-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-amber-400">
            {jobCards.filter((j) => j.status === 'PENDING').length}
          </div>
          <p className="text-[11px] text-zinc-500">Awaiting manager sign-off</p>
        </div>
      </KpiCardContainer>

      {/* Control Bar: Search, Date Presets, View Switcher & Export */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f] backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by Ticket #, Key No, Vehicle ID, Issue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Create Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Job Card</span>
          </button>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Statuses</option>
              <option value="PENDING" className="bg-[#1c1c1f]">Pending</option>
              <option value="APPROVED" className="bg-[#1c1c1f]">Approved</option>
              <option value="REJECTED" className="bg-[#1c1c1f]">Rejected</option>
            </select>
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[#141416] border border-[#2a2a2f]">
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

      {/* VIEW 1: DENSE OPERATIONAL TABLE VIEW WITH RESIZABLE COLUMNS */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <ResizableTh
                    colKey="ticket_veh"
                    width={widths.ticket_veh}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('ticket_number')}
                    className="p-3.5 pl-4 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Ticket & Vehicle</span>
                    {renderSortIndicator('ticket_number')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="hub_date"
                    width={widths.hub_date}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('created_at')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Hub & Date</span>
                    {renderSortIndicator('created_at')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="issue"
                    width={widths.issue}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Issue / Defect Description
                  </ResizableTh>

                  <ResizableTh
                    colKey="parts"
                    width={widths.parts}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Parts Consumed & Media
                  </ResizableTh>

                  <ResizableTh
                    colKey="cost"
                    width={widths.cost}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('parts_cost')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Spares Cost</span>
                    {renderSortIndicator('parts_cost')}
                  </ResizableTh>

                  <ResizableTh
                    colKey="status"
                    width={widths.status}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('status')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Approval Status</span>
                    {renderSortIndicator('status')}
                  </ResizableTh>

                  <th style={{ width: `${widths.actions || 140}px` }} className="p-3.5 text-right pr-4">
                    Action
                  </th>
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
                            {vehicle && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVehicleForModal(vehicle);
                                }}
                                className="font-mono font-bold text-blue-300 text-xs px-1.5 py-0.2 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition"
                                title="Inspect Vehicle"
                              >
                                Key #{vehicle.key_number}
                              </button>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                            {vehicle?.custom_vehicle_id || vehicle?.vehicle_id}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-zinc-200 font-medium">
                            {hub?.name ? (hub.name.split(' (')?.[0] || hub.name) : (hub?.code || 'Store 1')}
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

                        {/* Parts & Media Badge */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJobForSpares(job);
                              }}
                              className="px-2 py-1 rounded-lg bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition"
                              title="Click to view itemized spares drawer"
                            >
                              <Package className="w-3.5 h-3.5 text-blue-400" />
                              <span>{job.parts?.length || 0} Parts</span>
                              <ChevronRight className="w-3 h-3 text-zinc-500" />
                            </button>
                            {job.photos_url && job.photos_url.length > 0 && (
                              <span
                                className="px-1.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono flex items-center gap-1"
                                title={`${job.photos_url.length} Media attachments`}
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>{job.photos_url.length}</span>
                              </span>
                            )}
                          </div>
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
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    jobId: job.id,
                                    action: 'approve',
                                    title: `Approve Job Card #${job.ticket_number}`,
                                    description: `Are you sure you want to approve this ticket and authorize stock deduction of ${formatCurrency(partsTotal)}?`,
                                  })
                                }
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg text-xs transition shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectionNotes('');
                                  setConfirmModal({
                                    isOpen: true,
                                    jobId: job.id,
                                    action: 'reject',
                                    title: `Reject Job Card #${job.ticket_number}`,
                                    description: 'Specify rejection notes for the mechanic to revise the repairs.',
                                  });
                                }}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 rounded-lg text-xs transition"
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

      {/* VIEW 2: REPORT VIEW */}
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
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobForSpares(job)}
                    className="p-3 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-700 cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">#{job.ticket_number}</span>
                        <span className="font-mono text-zinc-300 font-medium">Key #{vehicle?.key_number}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{job.issue_description}</p>
                    </div>
                    <div className="text-right font-mono font-bold text-purple-300">
                      {formatCurrency(partsCost)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Resolution Rate & Quality</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-[#141416] border border-[#27272a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Approved vs Total</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {filteredJobCards.filter((j) => j.status === 'APPROVED').length} / {filteredJobCards.length}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${
                        filteredJobCards.length > 0
                          ? (filteredJobCards.filter((j) => j.status === 'APPROVED').length /
                              filteredJobCards.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
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

      {/* VIEW 4: GRID CARDS VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredJobCards.length === 0 ? (
            <div className="col-span-full p-8 text-center text-zinc-500 bg-[#1e1e22] rounded-2xl border border-[#2a2a2f]">
              No job cards match the filter criteria.
            </div>
          ) : (
            filteredJobCards.map((job) => {
              const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
              const hub = hubs.find((h) => h.id === job.hub_id);
              const partsCost = (job.parts || []).reduce((s, p) => s + p.quantity * p.unit_cost_snapshot, 0);

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobForSpares(job)}
                  className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] hover:border-zinc-700 cursor-pointer transition shadow-sm space-y-3.5 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-emerald-400">
                            #{job.ticket_number}
                          </span>
                          <span className="font-mono font-bold text-xs text-blue-300">
                            Key #{vehicle?.key_number}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">{hub?.name || job.hub_id}</span>
                      </div>
                      <ApprovalBadge status={job.status} />
                    </div>

                    <p className="text-xs text-zinc-200 line-clamp-2">{job.issue_description}</p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[11px] text-zinc-400">
                      <span>Parts Used ({job.parts?.length || 0})</span>
                      <span className="font-mono font-bold text-purple-300">{formatCurrency(partsCost)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span>{formatDate(job.created_at)}</span>
                      <span className="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">View Details &rarr;</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Expandable Item Drawer / Job Card Spares & Media Modal */}
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

              {/* Media Attachments Section */}
              {selectedJobForSpares.photos_url && selectedJobForSpares.photos_url.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Media & Defect Attachments ({selectedJobForSpares.photos_url.length})</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedJobForSpares.photos_url.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center hover:border-zinc-600 transition"
                      >
                        {url.startsWith('data:image') || url.startsWith('http') ? (
                          <img src={url} alt={`Evidence #${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="p-2 text-center text-[10px] text-zinc-400">
                            <Paperclip className="w-4 h-4 mx-auto text-indigo-400 mb-1" />
                            <span>Attachment #{idx + 1}</span>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
                <div className="p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] flex items-center justify-between text-xs">
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

      {/* Modal: New Maintenance Job Card with Media Attachments */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span>Create Maintenance Job Card</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJobCard} className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Select EV / Scooter</label>
                  <select
                    required
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Choose vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        Key #{v.key_number} — {v.model} ({v.custom_vehicle_id || (v.id || '').toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Operating Hub</label>
                  <select
                    value={newHubId}
                    onChange={(e) => setNewHubId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Issue Description / Defect Details</label>
                <textarea
                  rows={2}
                  required
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                  placeholder="Describe failure symptoms (e.g., Brake pad completely worn, throttle wire cut)..."
                  className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Mechanic Action / Resolution Applied (Optional)</label>
                <input
                  type="text"
                  value={newSolution}
                  onChange={(e) => setNewSolution(e.target.value)}
                  placeholder="e.g. Replaced front brake disc and calibrated throttle potentiometer"
                  className="w-full p-2.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Media Attachments Uploader */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload Defect Evidence / Photos ({newPhotos.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Browse Files</span>
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

                {newPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {newPhotos.map((photo, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-zinc-800 aspect-square group">
                        <img src={photo} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-rose-400 hover:text-rose-200 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spare Parts Staging */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-purple-400" />
                  <span>Allocate Spare Parts from Store 1</span>
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="flex-1 p-2 rounded-xl bg-[#18181b] border border-[#2a2a2f] text-zinc-200 text-xs focus:outline-none"
                  >
                    <option value="">Select Spare Part...</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {formatCurrency(p.unit_cost)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={selectedPartQty}
                    onChange={(e) => setSelectedPartQty(Number(e.target.value))}
                    className="w-16 p-2 rounded-xl bg-[#18181b] border border-[#2a2a2f] text-zinc-100 font-mono text-center text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddStagedPart}
                    className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition"
                  >
                    Add
                  </button>
                </div>

                {newStagedParts.length > 0 && (
                  <div className="space-y-1 pt-2">
                    {newStagedParts.map((sp, idx) => {
                      const pt = parts.find((p) => p.id === sp.part_id);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px]"
                        >
                          <span className="text-zinc-200">
                            {pt?.name} <strong className="font-mono text-purple-300">× {sp.quantity}</strong>
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-zinc-300">{formatCurrency(sp.quantity * sp.unit_cost_snapshot)}</span>
                            <button
                              type="button"
                              onClick={() => setNewStagedParts((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Create & Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.action === 'reject' ? 'Confirm Rejection' : 'Confirm Approval'}
        variant={confirmModal.action === 'reject' ? 'danger' : 'primary'}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      >
        {confirmModal.action === 'reject' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">Rejection Notes:</label>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="State reason for rejecting job card..."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}
      </ConfirmModal>

      {/* Vehicle Detail Modal for Cross-Module Interlinking */}
      {selectedVehicleForModal && (
        <VehicleDetailModal
          vehicle={selectedVehicleForModal}
          isOpen={!!selectedVehicleForModal}
          onClose={() => setSelectedVehicleForModal(null)}
        />
      )}
    </div>
  );
}
