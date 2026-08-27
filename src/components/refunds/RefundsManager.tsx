'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Refund, RefundPayoutType, RefundStatus } from '@/types';
import { RefundBadge } from '../common/StatusBadge';
import { formatCurrency, formatDate, formatDateOnly, formatPhone, cn } from '@/lib/utils';
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
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export function RefundsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  const filteredRefunds = refunds.filter((r) => {
    // Role-based scoping: Non-admins only see claims they submitted
    if (!isFullAdmin && r.requested_by !== currentUser.id) {
      return false;
    }

    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase();
    const matchesPhone = r.user_phone.toLowerCase().includes(q);
    const matchesRide = r.ride_id.toLowerCase().includes(q);
    const matchesReason = r.reason.toLowerCase().includes(q);
    const matchesRequester = (r.requester_name || '').toLowerCase().includes(q);
    const matchesFrappe = (r.frappe_reference || '').toLowerCase().includes(q);

    return matchesPhone || matchesRide || matchesReason || matchesRequester || matchesFrappe;
  });

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
    toast.success('Dispute settled! Auto-stamped date, time & voucher.');
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
    toast.error(`Refund claim rejected: ${selectedRefundToReject.ride_id}`);
    setRejectModalOpen(false);
    setSelectedRefundToReject(null);
  };

  const totalDisputedAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
  const settledAmount = refunds.filter((r) => r.status === 'SETTLED').reduce((sum, r) => sum + r.amount, 0);
  const pendingCount = refunds.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Customer Ride Disputes & Frappe Refund Desk
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

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-emerald-500/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Settled (Frappe Cleared)
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {formatCurrency(settledAmount)}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {refunds.filter((r) => r.status === 'SETTLED').length} settled cases
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Pending Action / Review
          </div>
          <div className="text-xl font-mono font-bold text-amber-400 mt-1">
            {pendingCount} claims
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {refunds.filter((r) => r.status === 'SUBMITTED').length} newly submitted
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by customer phone, ride ID, reason, requester name, or Frappe ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Disputes Table */}
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
                <th className="p-3.5 text-right pr-4">Frappe Settlement</th>
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
                      <div className="font-mono font-bold text-zinc-100 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        <span>{formatPhone(r.user_phone)}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {r.ride_id} • {formatDateOnly(r.ride_date)}
                      </div>
                    </td>

                    <td className="p-3.5 max-w-sm">
                      <div className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                        {r.reason}
                      </div>
                      {r.internal_remarks && (
                        <div className="text-[10px] text-zinc-500 mt-0.5 italic">
                          Remarks: {r.internal_remarks}
                        </div>
                      )}
                      {r.rejection_reason && (
                        <div className="text-[10px] text-rose-400 mt-0.5">
                          Declined: {r.rejection_reason}
                        </div>
                      )}
                    </td>

                    {/* Exact 3-Decimal Amount Display */}
                    <td className="p-3.5 font-mono font-bold text-sm text-zinc-100">
                      {formatCurrency(r.amount)}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                          r.payout_type === 'Bank Payout'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        )}
                      >
                        {r.payout_type === 'Bank Payout' ? (
                          <Building className="w-3 h-3 text-purple-400" />
                        ) : (
                          <Wallet className="w-3 h-3 text-blue-400" />
                        )}
                        <span>{r.payout_type}</span>
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-zinc-200">{r.requester_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{r.requester_role}</div>
                    </td>

                    <td className="p-3.5">
                      <RefundBadge status={r.status} />
                    </td>

                    <td className="p-3.5 text-right pr-4 space-y-1">
                      {r.status === 'SETTLED' ? (
                        <div>
                          <span className="font-mono text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 inline-block">
                            {r.frappe_reference || 'SETTLED'}
                          </span>
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            {r.settled_by_name ? `By ${r.settled_by_name}` : 'Auto'}
                          </div>
                        </div>
                      ) : r.status === 'REJECTED' ? (
                        <span className="text-[10px] text-rose-400 font-mono">Rejected</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {isFullAdmin && (
                            <>
                              <button
                                onClick={() => handleOneClickSettle(r.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition shadow-sm flex items-center gap-1"
                                title="1-Click Frappe Settlement"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Settle</span>
                              </button>

                              <button
                                onClick={() => handleOpenReject(r)}
                                className="px-2 py-1 rounded-lg bg-[#141416] hover:bg-rose-500/20 border border-[#2a2a2f] hover:border-rose-500/40 text-rose-400 text-[11px] font-semibold transition"
                                title="Reject Dispute Claim"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Dispute Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
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
                <label className="text-zinc-400 font-semibold">Refund Payout Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutType('EzEv Wallet')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left flex items-center gap-2 transition',
                      payoutType === 'EzEv Wallet'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-300 font-bold'
                        : 'bg-[#141416] border-[#2a2a2f] text-zinc-400'
                    )}
                  >
                    <Wallet className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-xs">EzEv Wallet</div>
                      <span className="text-[10px] text-zinc-500">In-App Credit</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutType('Bank Payout')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left flex items-center gap-2 transition',
                      payoutType === 'Bank Payout'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-bold'
                        : 'bg-[#141416] border-[#2a2a2f] text-zinc-400'
                    )}
                  >
                    <Building className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs">Bank Payout</div>
                      <span className="text-[10px] text-zinc-500">UPI / Account</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Customer Mobile Number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98801 12345"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Ride ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RIDE-MUM-2026-101"
                    value={rideId}
                    onChange={(e) => setRideId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Ride Date</label>
                  <input
                    type="date"
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Exact 3-Decimal Amount Input */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Disputed Amount (₹ INR, accepts decimals e.g. 26.367)</label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0.001"
                  placeholder="26.367"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Customer Dispute Reason</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Scooter paused but timer did not stop / bike startup glitch..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Internal Ops Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="Checked GPS telemetry, bike stationary at hub..."
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
                  Log Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && selectedRefundToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Reject Refund Dispute</span>
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
                Are you sure you want to reject the dispute for ride <strong className="text-zinc-100">{selectedRefundToReject.ride_id}</strong> ({formatCurrency(selectedRefundToReject.amount)})?
              </p>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Rejection Rationale / Audit Note</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Telemetry indicates vehicle was active in motion outside geofence..."
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272a]">
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
