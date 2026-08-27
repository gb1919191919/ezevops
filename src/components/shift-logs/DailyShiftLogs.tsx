'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { DailyShiftLog } from '@/types';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { formatDate, formatDateOnly, cn } from '@/lib/utils';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Car,
  Wrench,
  HelpCircle,
  X,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

export function DailyShiftLogs() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [hubFilter, setHubFilter] = useState('ALL');
  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  // Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftType, setShiftType] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [logHubId, setLogHubId] = useState('');
  const [accomplishments, setAccomplishments] = useState('');
  const [vehiclesServiced, setVehiclesServiced] = useState<number>(0);
  const [customerIssuesResolved, setCustomerIssuesResolved] = useState<number>(0);
  const [blockers, setBlockers] = useState('');

  const dailyShiftLogs = useAppStore((s) => s.dailyShiftLogs);
  const addDailyShiftLog = useAppStore((s) => s.addDailyShiftLog);
  const hubs = useAppStore((s) => s.hubs);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const filteredLogs = useMemo(() => {
    return dailyShiftLogs.filter((log) => {
      if (hubFilter !== 'ALL' && log.hub_id !== hubFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const hub = hubs.find((h) => h.id === log.hub_id);
      return (
        log.staff_name.toLowerCase().includes(q) ||
        log.accomplishments.toLowerCase().includes(q) ||
        (log.blockers || '').toLowerCase().includes(q) ||
        (hub?.name || '').toLowerCase().includes(q)
      );
    });
  }, [dailyShiftLogs, hubFilter, searchTerm, hubs]);

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
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredLogs.map((log) => {
      const hub = hubs.find((h) => h.id === log.hub_id);
      return {
        'Date': log.date,
        'Shift': log.shift_type,
        'Staff Name': log.staff_name,
        'Staff Role': log.staff_role,
        'Hub': hub?.name || log.hub_id,
        'Vehicles Serviced': log.vehicles_serviced,
        'Issues Resolved': log.customer_issues_resolved,
        'Accomplishments': log.accomplishments,
        'Blockers': log.blockers || 'None',
        'Submitted At': formatDate(log.created_at),
      };
    });

    exportToCSV('ezev_mumbai_shift_logs', data);
  };

  const handleExportPDF = () => {
    const headers = ['Date', 'Shift', 'Staff', 'Hub', 'Serviced', 'Resolved', 'Key Accomplishments'];
    const rows = filteredLogs.map((log) => {
      const hub = hubs.find((h) => h.id === log.hub_id);
      return [
        log.date,
        log.shift_type,
        log.staff_name,
        hub?.name.split(' (')[0] || log.hub_id,
        log.vehicles_serviced.toString(),
        log.customer_issues_resolved.toString(),
        log.accomplishments.slice(0, 35) + '...',
      ];
    });

    exportToPDF('Daily Operations Shift Logs', `${filteredLogs.length} Records`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Daily Shift Logs & Hub Activity Digest
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            End-of-shift summaries, vehicle service metrics, customer tickets resolved, and field escalation handovers
          </p>
        </div>

        <button
          onClick={() => setShiftModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Shift Handover Log</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f] backdrop-blur-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search shift logs by staff name, activities, or hub..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Hubs ({hubs.length})</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id} className="bg-[#1c1c1f]">
                  {h.name.split(' (')[0]}
                </option>
              ))}
            </select>
          </div>

          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export Shift Logs to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={handleExportPDF}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export Shift Logs to PDF"
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
                  <th className="p-3.5 pl-4">Staff & Shift</th>
                  <th className="p-3.5">Hub & Date</th>
                  <th className="p-3.5">Serviced / Resolved</th>
                  <th className="p-3.5">Key Accomplishments & Activities</th>
                  <th className="p-3.5">Blockers / Escalations</th>
                  <th className="p-3.5 text-right pr-4">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] text-zinc-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No shift logs recorded matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const hub = hubs.find((h) => h.id === log.hub_id);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3.5 pl-4">
                          <div className="font-bold text-zinc-100 text-xs">{log.staff_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-zinc-400 font-mono">{log.staff_role}</span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 font-mono text-[10px] font-bold">
                              {log.shift_type}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-zinc-200 font-medium">
                            {hub?.name.split(' (')[0] || log.hub_id}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">{log.date}</span>
                        </td>

                        <td className="p-3.5 font-mono">
                          <div className="text-emerald-400 font-bold">{log.vehicles_serviced} EVs Serviced</div>
                          <div className="text-blue-300 text-[11px]">{log.customer_issues_resolved} Tickets Cleared</div>
                        </td>

                        <td className="p-3.5 max-w-sm">
                          <p className="text-zinc-200 line-clamp-2">{log.accomplishments}</p>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          {log.blockers ? (
                            <span className="text-amber-400 text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span className="line-clamp-2">{log.blockers}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">None</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right pr-4 font-mono text-[10px] text-zinc-500">
                          {formatDate(log.created_at)}
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

      {/* VIEW 2: REPORT / DIGEST ACCORDION VIEW */}
      {viewMode === 'report' && (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const hub = hubs.find((h) => h.id === log.hub_id);
            return (
              <div key={log.id} className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100">{log.staff_name}</span>
                    <span className="text-xs text-zinc-400">({log.staff_role})</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-xs font-bold">
                      {log.shift_type} SHIFT
                    </span>
                  </div>
                  <span className="font-mono text-xs text-zinc-400">
                    {hub?.name.split(' (')[0]} • {log.date}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Shift Accomplishments</span>
                  <p className="text-xs text-zinc-200">{log.accomplishments}</p>
                </div>

                {log.blockers && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Blockers & Handovers
                    </span>
                    <p>{log.blockers}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: KANBAN SHIFT VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['MORNING', 'EVENING', 'NIGHT'] as const).map((sft) => {
            const list = filteredLogs.filter((l) => l.shift_type === sft);
            return (
              <div key={sft} className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200">{sft} SHIFT</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {list.length} Logs
                  </span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {list.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-zinc-200">
                        <span>{log.staff_name}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{log.date}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{log.accomplishments}</p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                        <span>{log.vehicles_serviced} EVs Serviced</span>
                        <span>{log.customer_issues_resolved} Tickets</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Shift Modal */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-400" />
                <span>Submit End-of-Shift Log</span>
              </h3>
              <button
                onClick={() => setShiftModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLog} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Shift Date *</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Shift Type *</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="MORNING">Morning Shift</option>
                    <option value="EVENING">Evening Shift</option>
                    <option value="NIGHT">Night Shift</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Operating Hub *</label>
                <select
                  value={logHubId}
                  onChange={(e) => setLogHubId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-semibold focus:outline-none cursor-pointer"
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Vehicles Serviced</label>
                  <input
                    type="number"
                    min="0"
                    value={vehiclesServiced}
                    onChange={(e) => setVehiclesServiced(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Customer Tickets Cleared</label>
                  <input
                    type="number"
                    min="0"
                    value={customerIssuesResolved}
                    onChange={(e) => setCustomerIssuesResolved(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Shift Activities & Accomplishments *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail tasks completed, battery swaps performed, inspections run..."
                  value={accomplishments}
                  onChange={(e) => setAccomplishments(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Handover Notes / Escalations</label>
                <textarea
                  rows={2}
                  placeholder="Note any unresolved issues, low stock parts, or vehicles requiring next shift attention..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
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
                  Submit Shift Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
