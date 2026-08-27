'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { AuditLog, BlockedUser } from '@/types';
import { formatDate, formatRelativeTime, formatPhone, formatCurrency, cn } from '@/lib/utils';
import {
  History,
  Search,
  Filter,
  Shield,
  FileCode,
  ArrowRight,
  Database,
  Lock,
  Sparkles,
  UserX,
  Smartphone,
  Car,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useRBAC } from '@/hooks/useRBAC';

export function AuditTrailExplorer() {
  const { isOwner } = useRBAC();
  const auditLogs = useAppStore((s) => s.auditLogs);
  const blockedUsers = useAppStore((s) => s.blockedUsers);
  const updateBlockedUser = useAppStore((s) => s.updateBlockedUser);
  const [activeTab, setActiveTab] = useState<'audit' | 'blocked'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  if (!isOwner) {
    return (
      <div className="p-8 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Audit Trail Restricted</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Access to cryptographic immutable audit logs and security records is restricted to Super Admin (Owner) accounts.
          </p>
        </div>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter((log) => {
    if (tableFilter !== 'ALL' && log.table_name !== tableFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchesPerformer = (log.performer_name || '').toLowerCase().includes(q);
    const matchesTable = log.table_name.toLowerCase().includes(q);
    const matchesAction = log.action.toLowerCase().includes(q);
    const matchesRecord = log.record_id.toLowerCase().includes(q);
    return matchesPerformer || matchesTable || matchesAction || matchesRecord;
  });

  const filteredBlocked = blockedUsers.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.user_name.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.vehicle_no.includes(q) ||
      b.reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Audit Ledger & Security Governance
          </h2>
          <p className="text-xs text-zinc-400">
            Append-only mutation history, cryptographic JSON diff snapshots, and security blocked accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs font-semibold text-zinc-300">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Append-Only Ledger</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#2a2a2f] gap-4 text-xs font-semibold text-zinc-400">
        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            'py-2.5 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'audit' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent hover:text-zinc-200'
          )}
        >
          <History className="w-4 h-4" />
          <span>System Mutation Ledger ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={cn(
            'py-2.5 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'blocked' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent hover:text-zinc-200'
          )}
        >
          <UserX className="w-4 h-4 text-rose-400" />
          <span>Blocked Accounts & Penalty Recoveries ({blockedUsers.length})</span>
        </button>
      </div>

      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by performer, table name, action, or record ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-zinc-900 text-zinc-200">
                  All Tables ({auditLogs.length})
                </option>
                <option value="vehicles" className="bg-zinc-900 text-zinc-200">
                  vehicles
                </option>
                <option value="hub_part_stock" className="bg-zinc-900 text-zinc-200">
                  hub_part_stock
                </option>
                <option value="job_cards" className="bg-zinc-900 text-zinc-200">
                  job_cards
                </option>
                <option value="refunds" className="bg-zinc-900 text-zinc-200">
                  refunds
                </option>
                <option value="sops" className="bg-zinc-900 text-zinc-200">
                  sops
                </option>
                <option value="tasks" className="bg-zinc-900 text-zinc-200">
                  tasks
                </option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-4">Timestamp</th>
                    <th className="p-3.5">Table Target</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Performed By</th>
                    <th className="p-3.5">Record ID</th>
                    <th className="p-3.5 text-right pr-4">JSON Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-zinc-300">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No audit records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-zinc-800/40 cursor-pointer transition"
                      >
                        <td className="p-3.5 pl-4 font-mono text-zinc-400">
                          <div>{formatDate(log.timestamp)}</div>
                          <span className="text-[10px] text-zinc-500">{formatRelativeTime(log.timestamp)}</span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-blue-400">
                          {log.table_name}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold font-mono border',
                              log.action === 'INSERT' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                              log.action === 'UPDATE' && 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                              log.action === 'SOFT_DELETE' && 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            )}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="p-3.5 font-medium text-zinc-200">
                          {log.performer_name || 'System / Service'}
                        </td>

                        <td className="p-3.5 font-mono text-[10px] text-zinc-500 truncate max-w-[120px]">
                          {log.record_id}
                        </td>

                        <td className="p-3.5 text-right pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-semibold text-xs transition inline-flex items-center gap-1"
                          >
                            <FileCode className="w-3.5 h-3.5 text-blue-400" />
                            <span>View Diff</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Blocked Users & Penalties */}
      {activeTab === 'blocked' && (
        <div className="space-y-4">
          <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-4">Blocked User</th>
                    <th className="p-3.5">Contact / Email</th>
                    <th className="p-3.5">EV Key No</th>
                    <th className="p-3.5">Incident & Reason</th>
                    <th className="p-3.5">Penalty Fee</th>
                    <th className="p-3.5">Recovery Status</th>
                    <th className="p-3.5 text-right pr-4">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-zinc-300">
                  {filteredBlocked.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        No blocked users registered in security database.
                      </td>
                    </tr>
                  ) : (
                    filteredBlocked.map((blk) => (
                      <tr key={blk.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3.5 pl-4">
                          <div className="font-bold text-zinc-100">{blk.user_name}</div>
                          <span className="text-[10px] text-zinc-500">{formatDate(blk.date)}</span>
                        </td>

                        <td className="p-3.5 font-mono text-zinc-300">
                          <div>{formatPhone(blk.phone)}</div>
                          <span className="text-[10px] text-zinc-500">{blk.user_email}</span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-zinc-200">
                          Key: {blk.vehicle_no}
                        </td>

                        <td className="p-3.5 max-w-md text-xs text-zinc-300 leading-relaxed">
                          {blk.reason}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-rose-400">
                          {formatCurrency(blk.recovery_amount)}
                        </td>

                        <td className="p-3.5">
                          <button
                            onClick={() => {
                              const nextStatus = blk.recovery_status === 'Pending' ? 'Recovered' : 'Pending';
                              updateBlockedUser(blk.id, { recovery_status: nextStatus });
                              toast.success(`Recovery status set to ${nextStatus}`);
                            }}
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition',
                              blk.recovery_status === 'Pending'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            )}
                          >
                            {blk.recovery_status}
                          </button>
                        </td>

                        <td className="p-3.5 text-right pr-4 text-zinc-400">
                          {blk.employee_name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* JSON Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#27272a] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-100">
                    Mutation Diff: <span className="font-mono text-blue-400">{selectedLog.table_name}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                    {selectedLog.action}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Performed by <strong className="text-zinc-200">{selectedLog.performer_name || 'System'}</strong> on {formatDate(selectedLog.timestamp)}
                </p>
              </div>

              <button onClick={() => setSelectedLog(null)} className="text-zinc-500 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px]">
                  Old Snapshot (Pre-mutation)
                </span>
                <pre className="p-3 rounded-xl bg-[#141416] border border-rose-950 text-rose-300 font-mono text-[11px] max-h-72 overflow-y-auto">
                  {selectedLog.old_data
                    ? JSON.stringify(selectedLog.old_data, null, 2)
                    : '(null / initial record)'}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                  New Snapshot (Post-mutation)
                </span>
                <pre className="p-3 rounded-xl bg-[#141416] border border-emerald-950 text-emerald-300 font-mono text-[11px] max-h-72 overflow-y-auto">
                  {selectedLog.new_data
                    ? JSON.stringify(selectedLog.new_data, null, 2)
                    : '(null)'}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-[#27272a] flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
