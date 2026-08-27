'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Refund, RefundPayoutType, RefundStatus } from '@/types';
import { RefundBadge } from '../common/StatusBadge';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatCurrency, formatDate, formatPhone, cn } from '@/lib/utils';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTh } from '../common/ResizableTh';
import { KpiCardContainer } from '../common/KpiCardContainer';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Building,
  Smartphone,
  User,
  Shield,
  X,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Check,
  Edit2,
  Image as ImageIcon,
  Paperclip,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type RefundSortField = 'amount' | 'ride_date' | 'status' | 'user_phone' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function RefundsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [payoutFilter, setPayoutFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Sorting
  const [sortField, setSortField] = useState<RefundSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Create dispute modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [custPhone, setCustPhone] = useState('+91 ');
  const [rideId, setRideId] = useState('');
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountInput, setAmountInput] = useState<string>('26.25');
  const [payoutType, setPayoutType] = useState<RefundPayoutType>('EzEv Wallet');
  const [reason, setReason] = useState('');
  const [internalRemarks, setInternalRemarks] = useState('');
  const [createEvidence, setCreateEvidence] = useState<string[]>([]);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  // Edit dispute modal (Admin / Super Admin)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRefundToEdit, setSelectedRefundToEdit] = useState<Refund | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editPayoutType, setEditPayoutType] = useState<RefundPayoutType>('EzEv Wallet');
  const [editReason, setEditReason] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editStatus, setEditStatus] = useState<RefundStatus>('SUBMITTED');
  const [editEvidence, setEditEvidence] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // In-App Confirm modal for rejection
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    refundId: string;
    rideId: string;
  }>({
    isOpen: false,
    refundId: '',
    rideId: '',
  });
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const refunds = useAppStore((s) => s.refunds || []);
  const currentUser = useAppStore((s) => s.currentUser);
  const createRefund = useAppStore((s) => s.createRefund);
  const verifyRefund = useAppStore((s) => s.verifyRefund);
  const settleRefund = useAppStore((s) => s.settleRefund);
  const rejectRefund = useAppStore((s) => s.rejectRefund);
  const { isOwner, isManager } = useRBAC();

  const isFullAdmin = isOwner || isManager;

  // Resizable columns
  const { widths, startResizing } = useResizableColumns('refunds-table', {
    customer_ride: 180,
    reason: 240,
    amount: 120,
    payout: 140,
    requester: 150,
    status: 120,
    actions: 160,
  });

  const handleSort = (field: RefundSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleCreateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setCreateEvidence((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Attached ${files.length} evidence file(s)`);
  };

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setEditEvidence((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Attached ${files.length} evidence file(s)`);
  };

  const filteredRefunds = useMemo(() => {
    const list = refunds.filter((r) => {
      // Role-based scoping: Non-admins only see claims they submitted
      if (!isFullAdmin && r.requested_by !== currentUser?.id) {
        return false;
      }

      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (payoutFilter !== 'ALL' && r.payout_type !== payoutFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const matchesPhone = (r.user_phone || '').toLowerCase().includes(q);
      const matchesRide = (r.ride_id || '').toLowerCase().includes(q);
      const matchesReason = (r.reason || '').toLowerCase().includes(q);
      const matchesRequester = (r.requester_name || '').toLowerCase().includes(q);

      return matchesPhone || matchesRide || matchesReason || matchesRequester;
    });

    return list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'amount') {
        comp = a.amount - b.amount;
      } else if (sortField === 'ride_date') {
        comp = (a.ride_date || '').localeCompare(b.ride_date || '');
      } else if (sortField === 'status') {
        comp = a.status.localeCompare(b.status);
      } else if (sortField === 'user_phone') {
        comp = a.user_phone.localeCompare(b.user_phone);
      } else if (sortField === 'created_at') {
        comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [refunds, isFullAdmin, currentUser, statusFilter, payoutFilter, searchTerm, sortField, sortOrder]);

  // Aggregate Metrics
  const totalDisputedAmount = useMemo(() => refunds.reduce((sum, r) => sum + r.amount, 0), [refunds]);
  const pendingAmount = useMemo(
    () => refunds.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').reduce((sum, r) => sum + r.amount, 0),
    [refunds]
  );
  const settledAmount = useMemo(
    () => refunds.filter((r) => r.status === 'SETTLED').reduce((sum, r) => sum + r.amount, 0),
    [refunds]
  );
  const rejectedAmount = useMemo(
    () => refunds.filter((r) => r.status === 'REJECTED').reduce((sum, r) => sum + r.amount, 0),
    [refunds]
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custPhone.trim() || !rideId.trim() || !reason.trim()) {
      toast.error('Customer phone, ride ID, and reason are required.');
      return;
    }

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive refund amount.');
      return;
    }

    createRefund({
      user_phone: custPhone.trim(),
      ride_id: rideId.trim(),
      ride_date: rideDate,
      amount: parsedAmount,
      payout_type: payoutType,
      reason: reason.trim(),
      internal_remarks: internalRemarks.trim() || null,
      frappe_reference: null,
      evidence_attachments: createEvidence.length > 0 ? createEvidence : undefined,
    } as any);

    toast.success(`Dispute logged: ${formatCurrency(parsedAmount)} (${payoutType})`);
    setCreateModalOpen(false);
    setCustPhone('+91 ');
    setRideId('');
    setAmountInput('26.25');
    setReason('');
    setInternalRemarks('');
    setCreateEvidence([]);
  };

  const handleOpenEdit = (r: Refund) => {
    setSelectedRefundToEdit(r);
    setEditAmount(r.amount);
    setEditPayoutType(r.payout_type);
    setEditReason(r.reason);
    setEditRemarks(r.internal_remarks || '');
    setEditStatus(r.status);
    setEditEvidence((r as any).evidence_attachments || []);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundToEdit) return;

    useAppStore.setState((state) => ({
      refunds: state.refunds.map((r) =>
        r.id === selectedRefundToEdit.id
          ? {
              ...r,
              amount: editAmount,
              payout_type: editPayoutType,
              reason: editReason.trim(),
              internal_remarks: editRemarks.trim() || null,
              status: editStatus,
              evidence_attachments: editEvidence,
            }
          : r
      ),
    }));

    toast.success(`Updated claim for Ride #${selectedRefundToEdit.ride_id}`);
    setEditModalOpen(false);
  };

  const handleOneClickSettle = (id: string) => {
    settleRefund(id);
    toast.success('Dispute settled! Marked as completed in database.');
  };

  const handleConfirmReject = () => {
    if (!rejectModal.refundId) return;
    const notes = rejectReasonInput.trim() || 'Claim invalid';
    rejectRefund(rejectModal.refundId, notes);
    toast.error(`Refund claim rejected: Ride #${rejectModal.rideId}`);
    setRejectModal({ isOpen: false, refundId: '', rideId: '' });
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredRefunds.map((r) => ({
      'Phone Number': r.user_phone,
      'Ride ID': r.ride_id,
      'Ride Date': r.ride_date,
      'Amount (INR)': r.amount,
      'Payout Method': r.payout_type,
      'Dispute Reason': r.reason,
      'Internal Remarks': r.internal_remarks || 'None',
      Status: r.status,
      'Requested By': r.requester_name,
      'Created At': formatDate(r.created_at),
    }));
    exportToCSV(data, 'ezev_customer_disputes');
    toast.success('Exported Disputes to CSV');
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Ride ID', dataKey: 'ride' },
      { header: 'Phone', dataKey: 'phone' },
      { header: 'Amount', dataKey: 'amount' },
      { header: 'Payout', dataKey: 'payout' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Reason', dataKey: 'reason' },
    ];
    const data = filteredRefunds.map((r) => ({
      ride: `#${r.ride_id}`,
      phone: r.user_phone,
      amount: formatCurrency(r.amount),
      payout: r.payout_type,
      status: r.status,
      reason: r.reason.slice(0, 40),
    }));
    exportToPDF('EzEv Mumbai Customer Dispute Claims', columns, data, 'ezev_disputes_summary.pdf');
    toast.success('Generated PDF Report');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Customer Ride Dispute & Refund Processing
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Log and audit ride fare disputes with multi-attribute filtering, evidence upload, and claim editing
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Dispute Claim</span>
        </button>
      </div>

      {/* Financial Exposure KPI Cards with Layout Controls */}
      <KpiCardContainer
        storageKey="refunds-kpis"
        title="Dispute Financial Overview"
        subtitle="Cumulative financial exposure, settled disbursements, and claim approval rates"
      >
        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Total Claims Logged</span>
            <DollarSign className="kpi-icon w-4 h-4 text-zinc-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-zinc-100">
            {formatCurrency(totalDisputedAmount)}
          </div>
          <p className="text-[11px] text-zinc-500">{refunds.length} Total Claims</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Pending Verification</span>
            <Clock className="kpi-icon w-4 h-4 text-amber-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-amber-400">
            {formatCurrency(pendingAmount)}
          </div>
          <p className="text-[11px] text-zinc-500">
            {refunds.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').length} Pending Claims
          </p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Settled Payouts</span>
            <CheckCircle2 className="kpi-icon w-4 h-4 text-emerald-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-emerald-400">
            {formatCurrency(settledAmount)}
          </div>
          <p className="text-[11px] text-zinc-500">Disbursed to Wallet / Bank</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-rose-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Rejected Claims</span>
            <XCircle className="kpi-icon w-4 h-4 text-rose-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-rose-400">
            {formatCurrency(rejectedAmount)}
          </div>
          <p className="text-[11px] text-zinc-500">Invalid dispute claims</p>
        </div>
      </KpiCardContainer>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by phone, ride ID, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Statuses</option>
              <option value="SUBMITTED" className="bg-[#1c1c1f]">Submitted</option>
              <option value="VERIFIED" className="bg-[#1c1c1f]">Verified</option>
              <option value="SETTLED" className="bg-[#1c1c1f]">Settled</option>
              <option value="REJECTED" className="bg-[#1c1c1f]">Rejected</option>
            </select>
          </div>

          {/* Payout Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Wallet className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={payoutFilter}
              onChange={(e) => setPayoutFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Payouts</option>
              <option value="EzEv Wallet" className="bg-[#1c1c1f]">EzEv Wallet</option>
              <option value="Bank Payout" className="bg-[#1c1c1f]">Bank Payout</option>
            </select>
          </div>

          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export Disputes to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={handleExportPDF}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export Disputes to PDF Report"
          >
            <FileText className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* VIEW 1: DENSE OPERATIONAL TABLE VIEW WITH RESIZABLE HEADERS & SORTING */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <ResizableTh
                    colKey="customer_ride"
                    width={widths.customer_ride}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('ride_date')}
                    className="p-3.5 pl-4 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Customer & Ride</span>
                    {sortField === 'ride_date' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    )}
                  </ResizableTh>

                  <ResizableTh
                    colKey="reason"
                    width={widths.reason}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Dispute Reason & Evidence
                  </ResizableTh>

                  <ResizableTh
                    colKey="amount"
                    width={widths.amount}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('amount')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Amount (INR)</span>
                    {sortField === 'amount' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    )}
                  </ResizableTh>

                  <ResizableTh
                    colKey="payout"
                    width={widths.payout}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Payout Method
                  </ResizableTh>

                  <ResizableTh
                    colKey="requester"
                    width={widths.requester}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Requested By
                  </ResizableTh>

                  <ResizableTh
                    colKey="status"
                    width={widths.status}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('status')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    )}
                  </ResizableTh>

                  <th style={{ width: `${widths.actions || 160}px` }} className="p-3.5 text-right pr-4">
                    Resolution / Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] text-zinc-300">
                {filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No disputes match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((r) => {
                    const attachments = (r as any).evidence_attachments || [];

                    return (
                      <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3.5 pl-4">
                          <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                            <span>{formatPhone(r.user_phone)}</span>
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                            Ride #{r.ride_id} • {r.ride_date}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="text-zinc-200 block max-w-xs">{r.reason}</span>
                          {r.internal_remarks && (
                            <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                              Note: {r.internal_remarks}
                            </span>
                          )}
                          {r.rejection_reason && (
                            <span className="text-[10px] text-rose-400 font-semibold block mt-0.5">
                              Declined: {r.rejection_reason}
                            </span>
                          )}
                          {attachments.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                <span>{attachments.length} Evidence file(s)</span>
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-sm text-zinc-100">
                          {formatCurrency(r.amount)}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1',
                              r.payout_type === 'EzEv Wallet'
                                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                            )}
                          >
                            {r.payout_type === 'EzEv Wallet' ? (
                              <Wallet className="w-3 h-3" />
                            ) : (
                              <Building className="w-3 h-3" />
                            )}
                            <span>{r.payout_type}</span>
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-medium text-zinc-300">{r.requester_name}</div>
                          <div className="text-[10px] text-zinc-500">{r.requester_role}</div>
                        </td>

                        <td className="p-3.5">
                          <RefundBadge status={r.status} />
                        </td>

                        <td className="p-3.5 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Claim Editing for Admin / Super Admin */}
                            {isFullAdmin && (
                              <button
                                onClick={() => handleOpenEdit(r)}
                                className="p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
                                title="Edit Claim Details"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                              </button>
                            )}

                            {r.status === 'SUBMITTED' && isFullAdmin && (
                              <>
                                <button
                                  onClick={() => verifyRefund(r.id)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectReasonInput('');
                                    setRejectModal({
                                      isOpen: true,
                                      refundId: r.id,
                                      rideId: r.ride_id,
                                    });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {r.status === 'VERIFIED' && isFullAdmin && (
                              <button
                                onClick={() => handleOneClickSettle(r.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-sm"
                              >
                                Settle
                              </button>
                            )}

                            {r.status === 'SETTLED' && (
                              <div className="text-[11px] font-mono text-emerald-400 flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settled</span>
                              </div>
                            )}

                            {r.status === 'REJECTED' && (
                              <span className="text-[11px] text-rose-500 font-mono">Rejected</span>
                            )}
                          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span>Payout Method Distribution</span>
            </h3>
            <div className="space-y-2">
              {['EzEv Wallet', 'Bank Payout'].map((pType) => {
                const subset = filteredRefunds.filter((r) => r.payout_type === pType);
                const sum = subset.reduce((acc, r) => acc + r.amount, 0);
                return (
                  <div key={pType} className="p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-zinc-200">{pType}</div>
                      <div className="text-[10px] text-zinc-500">{subset.length} Claims</div>
                    </div>
                    <span className="font-mono font-bold text-blue-400">{formatCurrency(sum)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Dispute Resolution Efficiency</span>
            </h3>
            <div className="space-y-2">
              {(['SUBMITTED', 'VERIFIED', 'SETTLED', 'REJECTED'] as RefundStatus[]).map((st) => {
                const subset = filteredRefunds.filter((r) => r.status === st);
                const sum = subset.reduce((acc, r) => acc + r.amount, 0);
                return (
                  <div key={st} className="p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] flex justify-between items-center text-xs">
                    <div className="font-bold text-zinc-200">{st} ({subset.length})</div>
                    <span className="font-mono font-bold text-zinc-300">{formatCurrency(sum)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PIPELINE / KANBAN STATUS VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['SUBMITTED', 'VERIFIED', 'SETTLED', 'REJECTED'] as RefundStatus[]).map((st) => {
            const list = filteredRefunds.filter((r) => r.status === st);
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
                    list.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-600 transition text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-100">{formatPhone(r.user_phone)}</span>
                          <span className="font-mono font-bold text-emerald-400">{formatCurrency(r.amount)}</span>
                        </div>
                        <p className="text-zinc-400 line-clamp-2">{r.reason}</p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                          <span>Ride #{r.ride_id}</span>
                          <span>{r.payout_type}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Dispute with Evidence Upload */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span>Log Customer Dispute Claim</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Ride ID / Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10492"
                    value={rideId}
                    onChange={(e) => setRideId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Ride Date</label>
                  <input
                    type="date"
                    required
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Refund Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono text-sm focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Payout Method</label>
                <select
                  value={payoutType}
                  onChange={(e) => setPayoutType(e.target.value as RefundPayoutType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="EzEv Wallet">EzEv Wallet Balance Credit</option>
                  <option value="Bank Payout">Direct Bank Account Transfer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Customer Dispute Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Scooter motor cut off after 200m; customer stranded"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Upload Ride Screenshots / Receipts ({createEvidence.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Attach</span>
                  </button>
                  <input
                    ref={createFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleCreateFileUpload}
                    className="hidden"
                  />
                </div>

                {createEvidence.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {createEvidence.map((photo, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-zinc-800 aspect-square group">
                        <img src={photo} alt={`Evidence ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCreateEvidence((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-rose-400 hover:text-rose-200 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
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
                  Submit Dispute Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Claim (Admin / Super Admin) */}
      {editModalOpen && selectedRefundToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Edit Claim (Ride #{selectedRefundToEdit.ride_id})</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Claim Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Payout Method</label>
                  <select
                    value={editPayoutType}
                    onChange={(e) => setEditPayoutType(e.target.value as RefundPayoutType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="EzEv Wallet">EzEv Wallet</option>
                    <option value="Bank Payout">Bank Payout</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Claim Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as RefundStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="SETTLED">SETTLED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Dispute Reason</label>
                <textarea
                  rows={2}
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Internal Audit Remarks</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Audit notes or transaction UTR..."
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Evidence / Receipts ({editEvidence.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Attach</span>
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleEditFileUpload}
                    className="hidden"
                  />
                </div>

                {editEvidence.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {editEvidence.map((photo, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-zinc-800 aspect-square group">
                        <img src={photo} alt={`Evidence ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditEvidence((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-rose-400 hover:text-rose-200 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled In-App Confirmation Modal for Dispute Rejection */}
      <ConfirmModal
        isOpen={rejectModal.isOpen}
        title={`Reject Dispute for Ride #${rejectModal.rideId}`}
        description="State dispute rejection reason for accounting and customer support records."
        confirmText="Confirm Rejection"
        variant="danger"
        onConfirm={handleConfirmReject}
        onClose={() => setRejectModal({ isOpen: false, refundId: '', rideId: '' })}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 block">Rejection Reason:</label>
          <textarea
            value={rejectReasonInput}
            onChange={(e) => setRejectReasonInput(e.target.value)}
            placeholder="e.g. GPS logs confirm trip completed normally without breakdown..."
            rows={3}
            className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
