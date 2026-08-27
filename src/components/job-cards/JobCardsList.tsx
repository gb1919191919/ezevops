'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { JobCard } from '@/types';
import { ApprovalBadge } from '../common/StatusBadge';
import { formatDate, formatRelativeTime, formatCurrency, cn } from '@/lib/utils';
import {
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Car,
  Clock,
  DollarSign,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

export function JobCardsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const jobCards = useAppStore((s) => s.jobCards);
  const vehicles = useAppStore((s) => s.vehicles);
  const hubs = useAppStore((s) => s.hubs);
  const approveJobCard = useAppStore((s) => s.approveJobCard);
  const rejectJobCard = useAppStore((s) => s.rejectJobCard);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const filteredJobCards = jobCards.filter((job) => {
    const isFullAdmin = isOwner || isManager;
    if (!isFullAdmin) {
      const isAssigned = job.assigned_mechanic_id === currentUser.id;
      const isReporter = job.reported_by === currentUser.id;
      const isUserHub = currentUser.assigned_hub_id && job.hub_id === currentUser.assigned_hub_id;
      if (!isAssigned && !isReporter && !isUserHub) return false;
    }

    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;

    const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
    const q = searchTerm.toLowerCase();

    const matchesTicket = `#${job.ticket_number}`.includes(q);
    const matchesVehicleId = (vehicle?.vehicle_id || '').toLowerCase().includes(q);
    const matchesKey = (vehicle?.key_number || '').toLowerCase().includes(q);
    const matchesDesc = job.issue_description.toLowerCase().includes(q);

    return matchesTicket || matchesVehicleId || matchesKey || matchesDesc;
  });

  const handleApprove = (id: string) => {
    approveJobCard(id, 'Approved by Operations Manager');
    toast.success('Job card approved! Spare parts physically deducted from hub stock.');
  };

  const handleReject = (id: string) => {
    const reason = prompt('Enter reason for job card rejection:') || 'Rejected by Manager';
    rejectJobCard(id, reason);
    toast.error('Job card rejected.');
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by ticket #, 14-15 digit Vehicle ID, Key code, or defect..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="ALL" className="bg-zinc-900 text-zinc-200">
              All Tickets ({jobCards.length})
            </option>
            <option value="PENDING" className="bg-zinc-900 text-zinc-200">
              Pending Review
            </option>
            <option value="APPROVED" className="bg-zinc-900 text-zinc-200">
              Approved
            </option>
            <option value="REJECTED" className="bg-zinc-900 text-zinc-200">
              Rejected
            </option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredJobCards.length === 0 ? (
          <div className="p-12 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40 text-zinc-500 text-xs">
            No maintenance job tickets match the filter criteria.
          </div>
        ) : (
          filteredJobCards.map((job) => {
            const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
            const hub = hubs.find((h) => h.id === job.hub_id);

            const totalCost = (job.parts || []).reduce(
              (acc, p) => acc + p.quantity * p.unit_cost_snapshot,
              0
            );

            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 hover:border-zinc-700 transition shadow-sm"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs">
                      #{job.ticket_number}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-zinc-100">
                          {vehicle?.vehicle_id || 'Unknown EV'}
                        </span>
                        <span className="font-mono text-xs text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                          Key: {vehicle?.key_number}
                        </span>
                        <ApprovalBadge status={job.status} />
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {hub?.name.split(' (')[0]} • Logged {formatDate(job.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {job.status === 'PENDING' && (isOwner || isManager) && (
                      <>
                        <button
                          onClick={() => handleApprove(job.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Job</span>
                        </button>
                        <button
                          onClick={() => handleReject(job.id)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 font-bold text-xs transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Defect Reported</span>
                    <p className="text-zinc-200">{job.issue_description}</p>
                    {job.solution_applied && (
                      <p className="text-[11px] text-emerald-400 mt-1">
                        Repair: {job.solution_applied}
                      </p>
                    )}
                    {job.odometer_km && (
                      <p className="text-[11px] text-zinc-400 font-mono mt-1">
                        Odometer Reading: <strong className="text-zinc-200">{job.odometer_km.toLocaleString('en-IN')} KM</strong>
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-bold flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        Staged Parts
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>

                    {!job.parts || job.parts.length === 0 ? (
                      <p className="text-zinc-600 text-[11px]">No parts staged on this ticket.</p>
                    ) : (
                      <div className="space-y-1">
                        {job.parts.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-[11px] text-zinc-300"
                          >
                            <span>
                              {p.quantity}× {p.part?.name || 'Spare Part'}
                            </span>
                            <span className="font-mono text-zinc-400">
                              {formatCurrency(p.quantity * p.unit_cost_snapshot)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
