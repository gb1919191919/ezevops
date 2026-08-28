'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ConfirmModal } from '../common/ConfirmModal';
import { KpiCardContainer } from '../common/KpiCardContainer';
import {
  CheckSquare,
  Shield,
  Clock,
  Car,
  Wrench,
  DollarSign,
  Package,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export function ApprovalsDesk() {
  const vehicles = useAppStore((s) => s.vehicles || []);
  const jobCards = useAppStore((s) => s.jobCards || []);
  const refunds = useAppStore((s) => s.refunds || []);
  const hubs = useAppStore((s) => s.hubs || []);
  const partsCatalog = useAppStore((s) => s.parts || []);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const approveVehicleStatus = useAppStore((s) => s.approveVehicleStatus);
  const rejectVehicleStatus = useAppStore((s) => s.rejectVehicleStatus);
  const approveJobCard = useAppStore((s) => s.approveJobCard);
  const rejectJobCard = useAppStore((s) => s.rejectJobCard);
  const verifyRefund = useAppStore((s) => s.verifyRefund);
  const rejectRefund = useAppStore((s) => s.rejectRefund);
  const clearBadge = useAppStore((s) => s.clearBadge);

  const { isOwner, isManager } = useRBAC();
  const isGlobalHub = selectedHubIds.includes('ALL') || selectedHubIds.length === 0;

  // Custom in-app rejection modal state
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    type: 'vehicle' | 'job' | 'refund';
    targetId: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'job',
    targetId: '',
    title: '',
    description: '',
  });
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Clear sidebar approvals badge immediately upon mount
  useEffect(() => {
    clearBadge('approvals');
  }, [clearBadge]);

  const stagedVehicles = vehicles.filter((v) => {
    if (v.pending_status === null) return false;
    if (!isGlobalHub && v.current_hub_id && !selectedHubIds.includes(v.current_hub_id)) return false;
    return true;
  });

  const pendingJobCards = jobCards.filter((j) => {
    if (j.status !== 'PENDING') return false;
    if (!isGlobalHub && !selectedHubIds.includes(j.hub_id)) return false;
    return true;
  });

  const pendingRefunds = refunds.filter((r) => r.status === 'SUBMITTED');

  const totalPending = stagedVehicles.length + pendingJobCards.length + pendingRefunds.length;

  // 6.1 Dispute & Job Card Financial Auto-Calculations
  const totalPendingDisputeValue = useMemo(
    () => pendingRefunds.reduce((sum, r) => sum + r.amount, 0),
    [pendingRefunds]
  );

  const totalPendingSparesValue = useMemo(
    () =>
      pendingJobCards.reduce((sum, j) => {
        const partsCost = (j.parts || []).reduce((pSum, p) => pSum + p.quantity * p.unit_cost_snapshot, 0);
        return sum + partsCost;
      }, 0),
    [pendingJobCards]
  );

  if (!isOwner && !isManager) {
    return (
      <div className="p-8 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Approvals Desk Restricted</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Approving vehicle status overrides, maintenance job card releases, and customer refunds requires Operations Manager or Super Admin role.
          </p>
        </div>
      </div>
    );
  }

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#3b82f6', '#f59e0b'],
      });
    } catch {}
  };

  const handleApproveVehicle = (id: string) => {
    approveVehicleStatus(id);
    triggerCelebration();
    toast.success('Approved vehicle state transition!');
  };

  const handleOpenRejectModal = (type: 'vehicle' | 'job' | 'refund', id: string, title: string, description: string) => {
    setRejectionNotes('');
    setRejectModal({
      isOpen: true,
      type,
      targetId: id,
      title,
      description,
    });
  };

  const handleConfirmRejection = () => {
    const notes = rejectionNotes.trim() || 'Rejected by Manager';
    if (rejectModal.type === 'vehicle') {
      rejectVehicleStatus(rejectModal.targetId);
      toast.error('Vehicle state change request rejected.');
    } else if (rejectModal.type === 'job') {
      rejectJobCard(rejectModal.targetId, notes);
      toast.error('Job card rejected.');
    } else if (rejectModal.type === 'refund') {
      rejectRefund(rejectModal.targetId, notes);
      toast.error('Customer dispute claim rejected.');
    }
    setRejectModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleApproveJob = (id: string) => {
    approveJobCard(id, 'Approved via Priority Approvals Desk');
    triggerCelebration();
    toast.success('Approved Job Card and committed inventory deduction.');
  };

  const handleVerifyRefund = (id: string) => {
    verifyRefund(id, 'Verified via Approvals Desk');
    triggerCelebration();
    toast.success('Dispute claim verified and approved for settlement.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            Operations Priority Approvals Desk
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Unified sign-off desk for staged vehicle transitions, maintenance parts allocation, and customer claims
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Queue:</span>
            <strong className="font-mono text-amber-300">{totalPending}</strong>
          </span>
        </div>
      </div>

      {/* Aggregate Financial Breakdown Counters */}
      <KpiCardContainer
        storageKey="approvals-kpis"
        title="Pending Sign-off Queues"
        subtitle="Itemized financial exposure and authorization bottlenecks"
      >
        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-blue-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Staged Vehicles</span>
            <Car className="kpi-icon w-4 h-4 text-blue-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-blue-400">{stagedVehicles.length} Units</div>
          <p className="text-[11px] text-zinc-500">Status transition sign-offs</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Pending Spares Value</span>
            <Wrench className="kpi-icon w-4 h-4 text-amber-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-amber-400">
            {formatCurrency(totalPendingSparesValue)}
          </div>
          <p className="text-[11px] text-zinc-500">{pendingJobCards.length} Job Cards in review</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-purple-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Pending Dispute Claims</span>
            <DollarSign className="kpi-icon w-4 h-4 text-purple-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-purple-300">
            {formatCurrency(totalPendingDisputeValue)}
          </div>
          <p className="text-[11px] text-zinc-500">{pendingRefunds.length} Claims awaiting verification</p>
        </div>
      </KpiCardContainer>

      {/* Main 3-Column Desk Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Staged Vehicles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" />
              <span>Vehicle State Overrides</span>
            </h3>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-xs font-bold">
              {stagedVehicles.length}
            </span>
          </div>

          {stagedVehicles.length === 0 ? (
            <div className="p-6 text-center border border-zinc-800 rounded-2xl bg-zinc-950/40 text-zinc-500 text-xs">
              No staged vehicle status overrides in queue.
            </div>
          ) : (
            stagedVehicles.map((v) => {
              const hub = hubs.find((h) => h.id === v.current_hub_id);
              return (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 shadow-sm hover:border-zinc-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-zinc-100">
                          {v.custom_vehicle_id || (v.id || '').toUpperCase()}
                        </span>
                        <span className="font-mono text-xs text-blue-300 font-bold px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30">
                          Key: #{v.key_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                        {v.vehicle_id} • {hub?.name || 'Central'}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Current:</span>
                      <span className="font-bold text-zinc-300">{v.current_status}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Requested:</span>
                      <span className="font-bold text-amber-300">{v.pending_status}</span>
                    </div>
                    {v.status_change_reason && (
                      <p className="text-[10px] text-zinc-400 italic pt-1 border-t border-zinc-900">
                        &quot;{v.status_change_reason}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApproveVehicle(v.id)}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs transition shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        handleOpenRejectModal(
                          'vehicle',
                          v.id,
                          'Reject Vehicle State Transition',
                          `Are you sure you want to reject the requested state transition for ${v.custom_vehicle_id || v.id}?`
                        )
                      }
                      className="px-3 py-2 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 font-bold rounded-xl text-xs transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section 2: Maintenance Job Cards & Itemized Spares */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Job Cards & Spares Sign-off</span>
            </h3>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
              {pendingJobCards.length}
            </span>
          </div>

          {pendingJobCards.length === 0 ? (
            <div className="p-6 text-center border border-zinc-800 rounded-2xl bg-zinc-950/40 text-zinc-500 text-xs">
              No job cards awaiting manager approval.
            </div>
          ) : (
            pendingJobCards.map((j) => {
              const vehicle = vehicles.find((v) => v.id === j.vehicle_id);
              const totalCost = (j.parts || []).reduce(
                (acc, p) => acc + p.quantity * p.unit_cost_snapshot,
                0
              );

              return (
                <div
                  key={j.id}
                  className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 shadow-sm hover:border-zinc-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          #{j.ticket_number}
                        </span>
                        <span className="font-mono text-xs font-bold text-zinc-200">
                          Key #{vehicle?.key_number || 'N/A'} ({vehicle?.custom_vehicle_id || vehicle?.vehicle_id || 'Vehicle'})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                        {j.issue_description}
                      </p>
                    </div>
                  </div>

                  {/* Explicit Itemized Spare Parts Display */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] border-b border-zinc-900 pb-1.5 font-semibold text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-purple-400" />
                        <span>Staged Spares ({j.parts?.length || 0})</span>
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>

                    {(j.parts && j.parts.length > 0) ? (
                      <div className="space-y-1.5">
                        {j.parts.map((part, pIdx) => {
                          const partInfo =
                            partsCatalog.find((p) => p.id === part.part_id) || part.part;
                          const partName = partInfo?.name || `Part SKU: ${part.part_id}`;
                          const lineCost = part.quantity * part.unit_cost_snapshot;

                          return (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between text-[11px] gap-2"
                            >
                              <span
                                className="text-zinc-300 font-medium truncate max-w-[200px]"
                                title={partName}
                              >
                                {partName}{' '}
                                <strong className="text-purple-300 font-mono">
                                  × {part.quantity}
                                </strong>
                              </span>
                              <span className="font-mono text-zinc-400 shrink-0">
                                {formatCurrency(lineCost)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 italic">No parts required for this ticket.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApproveJob(j.id)}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs transition shadow-sm"
                    >
                      Sign-off & Commit
                    </button>
                    <button
                      onClick={() =>
                        handleOpenRejectModal(
                          'job',
                          j.id,
                          `Reject Job Card #${j.ticket_number}`,
                          'Provide rejection notes or instructions for the mechanic to revise the job card.'
                        )
                      }
                      className="px-3 py-2 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 font-bold rounded-xl text-xs transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section 3: Customer Ride Disputes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span>Disputes Verification</span>
            </h3>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-xs font-bold">
              {pendingRefunds.length}
            </span>
          </div>

          {pendingRefunds.length === 0 ? (
            <div className="p-6 text-center border border-zinc-800 rounded-2xl bg-zinc-950/40 text-zinc-500 text-xs">
              No unverified customer disputes in queue.
            </div>
          ) : (
            pendingRefunds.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 shadow-sm hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-purple-400">
                        Ride #{r.ride_id}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {formatCurrency(r.amount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      Phone: {r.user_phone} • {r.payout_type}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                    Customer Reason:
                  </span>
                  <p className="text-zinc-300 italic text-[11px]">&quot;{r.reason}&quot;</p>
                  <span className="text-[10px] text-zinc-500 block pt-1">
                    Logged by {r.requester_name} ({r.requester_role}) • {formatDate(r.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleVerifyRefund(r.id)}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs transition shadow-sm"
                  >
                    Verify & Authorize
                  </button>
                  <button
                    onClick={() =>
                      handleOpenRejectModal(
                        'refund',
                        r.id,
                        `Reject Dispute for Ride #${r.ride_id}`,
                        'Enter dispute rejection rationale for accounting and customer support records.'
                      )
                    }
                    className="px-3 py-2 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 font-bold rounded-xl text-xs transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* In-App Rejection Modal */}
      <ConfirmModal
        isOpen={rejectModal.isOpen}
        title={rejectModal.title}
        description={rejectModal.description}
        confirmText="Confirm Rejection"
        cancelText="Keep in Queue"
        variant="danger"
        onConfirm={handleConfirmRejection}
        onClose={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 block">
            Rejection Notes / Audit Reason:
          </label>
          <textarea
            value={rejectionNotes}
            onChange={(e) => setRejectionNotes(e.target.value)}
            placeholder="State reason for rejection..."
            rows={3}
            className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
