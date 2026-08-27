'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Refund, RefundPayoutType, RefundStatus } from '@/types';
import { RefundBadge } from '../common/StatusBadge';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatCurrency, formatDate, formatPhone, cn } from '@/lib/utils';
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
  ArrowUpRight,
  FileSpreadsheet,
  FileText,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export function RefundsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Create dispute modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [custPhone, setCustPhone] = useState('+91 ');
  const [rideId, setRideId] = useState('');
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountInput, setAmountInput] = useState<string>('26.25');
  const [payoutType, setPayoutType] = useState<RefundPayoutType>('EzEv Wallet');
  const [reason, setReason] = useState('');
  const [internalRemarks, setInternalRemarks] = useState('');

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRefundToReject, setSelectedRefundToReject] = useState<Refund | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const refunds = useAppStore((s) => s.refunds);
  const currentUser = useAppStore((s) => s.currentUser);
  const createRefund = useAppStore((s) => s.createRefund);
  const verifyRefund = useAppStore((s) => s.verifyRefund);
  const settleRefund = useAppStore((s) => s.settleRefund);
  const rejectRefund = useAppStore((s) => s.rejectRefund);
  const { isOwner, isManager } = useRBAC();

  const isFullAdmin = isOwner || isManager;

  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      // Role-based scoping: Non-admins only see claims they submitted
      if (!isFullAdmin && r.requested_by !== currentUser?.id) {
        return false;
      }

      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const matchesPhone = r.user_phone.toLowerCase().includes(q);
      const matchesRide = r.ride_id.toLowerCase().includes(q);
      const matchesReason = r.reason.toLowerCase().includes(q);
      const matchesRequester = (r.requester_name || '').toLowerCase().includes(q);

      return matchesPhone || matchesRide || matchesReason || matchesRequester;
    });
  }, [refunds, isFullAdmin, currentUser, statusFilter, searchTerm]);

  // 6.1 Dispute Financial Auto-Calculation
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
    });

    toast.success(`Dispute logged: ${formatCurrency(parsedAmount)} (${payoutType})`);
    setCreateModalOpen(false);
    setCustPhone('+91 ');
    setRideId('');
    setAmountInput('26.25');
    setReason('');
    setInternalRemarks('');
  };

  const handleOneClickSettle = (id: string) => {
    settleRefund(id);
    toast.success('Dispute settled! Marked as completed in database.');
  };

  const handleOpenReject = (r: Refund) => {
    setSelectedRefundToReject(r);
    setRejectReasonInput('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundToReject) return;
    if (!rejectReasonInput.trim()) {
      toast.error('Please specify a rejection reason.');
      return;
    }
    rejectRefund(selectedRefundToReject.id, rejectReasonInput.trim());
    toast.error(`Refund claim rejected: Ride #${selectedRefundToReject.ride_id}`);
    setRejectModalOpen(false);
    setSelectedRefundToReject(null);
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredRefunds.map((r) => ({
      'Ride ID': r.ride_id,
      'Customer Phone': r.user_phone,
      'Ride Date': r.ride_date,
      'Dispute Amount (INR)': r.amount,
      'Payout Type': r.payout_type,
      'Reason': r.reason,
      'Status': r.status,
      'Requested By': r.requester_name,
      'Settled By': r.settled_by_name || '-',
      'Settled Date': r.settled_at ? formatDate(r.settled_at) : '-',
      'Created Date': formatDate(r.created_at),
    }));

    exportToCSV('ezev_mumbai_disputes_ledger', data);
  };

  const handleExportPDF = () => {
    const headers = ['Ride ID', 'Phone', 'Date', 'Amount', 'Payout', 'Status', 'Reason', 'Requester'];
    const rows = filteredRefunds.map((r) => [
      r.ride_id,
      r.user_phone,
      r.ride_date,
      formatCurrency(r.amount),
      r.payout_type,
      r.status,
      r.reason.slice(0, 30),
      r.requester_name,
    ]);

    exportToPDF('Customer Disputes & Refund Ledger', `${filteredRefunds.length} Cases`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Customer Ride Disputes & Settlements
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            41 verified Mumbai dispute records • 3-decimal precise INR settlement • EzEv Wallet vs Direct Bank Payout
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Customer Claim</span>
        </button>
      </div>

      {/* 6.1 Dispute Financial Auto-Calculation Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Total Claims Value
          </div>
          <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
            {formatCurrency(totalDisputedAmount)}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {refunds.length} recorded dispute cases
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Pending Review & Approval
          </div>
          <div className="text-xl font-mono font-bold text-amber-400 mt-1">
            {formatCurrency(pendingAmount)}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {refunds.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').length} claims pending
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-emerald-500/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Settled & Payout Done
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {formatCurrency(settledAmount)}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {refunds.filter((r) => r.status === 'SETTLED').length} settled cases
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-rose-500/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Rejected Claims
          </div>
          <div className="text-xl font-mono font-bold text-rose-400 mt-1">
            {formatCurrency(rejectedAmount)}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {refunds.filter((r) => r.status === 'REJECTED').length} claims declined
          </span>
        </div>
      </div>

      {/* Filter, Search Bar & Universal View Switcher */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f]">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by customer phone, ride ID, reason, or staff requester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses ({refunds.length})</option>
            <option value="SUBMITTED">Submitted / YTS</option>
            <option value="VERIFIED">Verified</option>
            <option value="SETTLED">Settled</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Universal View Switcher */}
          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          {/* Export Actions */}
          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export Disputes to CSV / Excel"
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

      {/* VIEW 1: DENSE OPERATIONAL TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-4">Customer & Ride</th>
                  <th className="p-3.5">Dispute Reason</th>
                  <th className="p-3.5">Amount (INR)</th>
                  <th className="p-3.5">Payout Method</th>
                  <th className="p-3.5">Requested By</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Resolution / Settlement</th>
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
                  filteredRefunds.map((r) => (
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
                        {r.status === 'SUBMITTED' && isFullAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => verifyRefund(r.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleOpenReject(r)}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {r.status === 'VERIFIED' && isFullAdmin && (
                          <button
                            onClick={() => handleOneClickSettle(r.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-sm"
                          >
                            Complete Settlement
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
                      </td>
                    </tr>
                  ))
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
                  <div key={pType} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex justify-between items-center text-xs">
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
                  <div key={st} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex justify-between items-center text-xs">
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
                      No claims in {st}.
                    </div>
                  ) : (
                    list.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200">{formatPhone(r.user_phone)}</span>
                          <span className="font-mono font-bold text-emerald-400">{formatCurrency(r.amount)}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{r.reason}</p>
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

      {/* Create Dispute Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
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
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Customer Mobile Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Ride Reference ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 70041"
                    value={rideId}
                    onChange={(e) => setRideId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Ride Date *</label>
                  <input
                    type="date"
                    required
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Claim Amount (INR) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 26.25"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Payout Destination</label>
                  <select
                    value={payoutType}
                    onChange={(e) => setPayoutType(e.target.value as RefundPayoutType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="EzEv Wallet">EzEv Wallet</option>
                    <option value="Bank Payout">Bank Payout</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Customer Dispute Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ride terminated early due to flat tyre"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Internal Verification Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Confirmed with Churchgate Hub manager"
                  value={internalRemarks}
                  onChange={(e) => setInternalRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
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

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>Reject Dispute Claim</span>
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5 text-xs">
              <p className="text-zinc-300">
                Rejecting claim for Ride #{selectedRefundToReject?.ride_id} ({formatCurrency(selectedRefundToReject?.amount || 0)}).
              </p>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Rejection Justification *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this dispute claim is declined..."
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
