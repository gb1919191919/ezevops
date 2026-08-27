'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { AuditLog, BlockedUser } from '@/types';
import { formatDate, formatRelativeTime, formatPhone, formatCurrency, cn } from '@/lib/utils';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTh } from '../common/ResizableTh';
import { KpiCardContainer } from '../common/KpiCardContainer';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
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
  FileSpreadsheet,
  FileText,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';

type AuditSortField = 'timestamp' | 'table_name' | 'action' | 'performer_name';
type SortOrder = 'asc' | 'desc';

export function AuditTrailExplorer() {
  const { isOwner } = useRBAC();
  const auditLogs = useAppStore((s) => s.auditLogs || []);
  const blockedUsers = useAppStore((s) => s.blockedUsers || []);
  const updateBlockedUser = useAppStore((s) => s.updateBlockedUser);
  const [activeTab, setActiveTab] = useState<'audit' | 'blocked'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<AuditSortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Resizable columns
  const { widths: auditWidths, startResizing: startAuditResizing } = useResizableColumns('audit-logs-table', {
    timestamp: 160,
    table: 140,
    action: 120,
    performer: 160,
    record: 180,
    diff: 110,
  });

  const { widths: blockedWidths, startResizing: startBlockedResizing } = useResizableColumns('blocked-users-table', {
    user: 160,
    contact: 160,
    vehicle: 120,
    reason: 240,
    fee: 120,
    status: 130,
    logged_by: 130,
  });

  const handleSort = (field: AuditSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredLogs = useMemo(() => {
    const list = auditLogs.filter((log) => {
      if (tableFilter !== 'ALL' && log.table_name !== tableFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const matchesPerformer = (log.performer_name || '').toLowerCase().includes(q);
      const matchesTable = (log.table_name || '').toLowerCase().includes(q);
      const matchesAction = (log.action || '').toLowerCase().includes(q);
      const matchesRecord = (log.record_id || '').toLowerCase().includes(q);
      return matchesPerformer || matchesTable || matchesAction || matchesRecord;
    });

    return list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'timestamp') {
        comp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortField === 'table_name') {
        comp = (a.table_name || '').localeCompare(b.table_name || '');
      } else if (sortField === 'action') {
        comp = (a.action || '').localeCompare(b.action || '');
      } else if (sortField === 'performer_name') {
        comp = (a.performer_name || '').localeCompare(b.performer_name || '');
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [auditLogs, tableFilter, searchTerm, sortField, sortOrder]);

  const filteredBlocked = useMemo(() => {
    return blockedUsers.filter((b) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (b.user_name || '').toLowerCase().includes(q) ||
        (b.phone || '').includes(q) ||
        (b.vehicle_no || '').includes(q) ||
        (b.reason || '').toLowerCase().includes(q)
      );
    });
  }, [blockedUsers, searchTerm]);

  // Export handlers
  const handleExportCSV = () => {
    if (activeTab === 'audit') {
      const data = filteredLogs.map((log) => ({
        Timestamp: formatDate(log.timestamp),
        'Table Target': log.table_name,
        Action: log.action,
        'Performed By': log.performer_name || 'System',
        'Record ID': log.record_id,
        'Previous Data Snapshot': JSON.stringify(log.old_data || {}),
        'New Data Snapshot': JSON.stringify(log.new_data || {}),
      }));
      exportToCSV(data, 'ezev_audit_ledger');
      toast.success('Exported audit trail to CSV');
    } else {
      const data = filteredBlocked.map((b) => ({
        'User Name': b.user_name,
        Phone: b.phone,
        Email: b.user_email,
        'Vehicle Key': b.vehicle_no,
        'Incident Reason': b.reason,
        'Penalty Fee (INR)': b.recovery_amount,
        'Recovery Status': b.recovery_status,
        'Logged By': b.employee_name || 'Admin',
        Date: b.date,
      }));
      exportToCSV(data, 'ezev_blocked_users_penalties');
      toast.success('Exported blocked accounts to CSV');
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'audit') {
      const columns = [
        { header: 'Timestamp', dataKey: 'time' },
        { header: 'Table', dataKey: 'table' },
        { header: 'Action', dataKey: 'action' },
        { header: 'Performed By', dataKey: 'performer' },
        { header: 'Record ID', dataKey: 'recId' },
      ];
      const data = filteredLogs.map((log) => ({
        time: formatDate(log.timestamp),
        table: log.table_name,
        action: log.action,
        performer: log.performer_name || 'System',
        recId: log.record_id,
      }));
      exportToPDF('EzEv Mutation Audit Ledger', columns, data, 'ezev_audit_trail.pdf');
      toast.success('Generated PDF Report');
    } else {
      const columns = [
        { header: 'User', dataKey: 'user' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'EV Key', dataKey: 'key' },
        { header: 'Penalty (INR)', dataKey: 'fee' },
        { header: 'Status', dataKey: 'status' },
      ];
      const data = filteredBlocked.map((b) => ({
        user: b.user_name,
        phone: b.phone,
        key: b.vehicle_no,
        fee: formatCurrency(b.recovery_amount),
        status: b.recovery_status,
      }));
      exportToPDF('EzEv Security & Penalties Register', columns, data, 'ezev_penalties_register.pdf');
      toast.success('Generated PDF Report');
    }
  };

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

      {/* KPI Cards Container */}
      <KpiCardContainer
        storageKey="audit-kpis"
        title="Security & Mutation Metrics"
        subtitle="Cryptographic events, mutations, and blocked recovery counts"
      >
        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Total Audit Events
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-zinc-100 mt-1">
            {auditLogs.length} Records
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Immutable database mutations
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-blue-400">
            Updates & State Changes
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-blue-400 mt-1">
            {auditLogs.filter((l) => l.action === 'UPDATE').length} Events
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Entity modifications
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-rose-500/20">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Blocked Users
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-rose-400 mt-1">
            {blockedUsers.length} Accounts
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {blockedUsers.filter((b) => b.recovery_status === 'Pending').length} Pending penalties
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-emerald-500/20">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Penalty Amount Due
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-emerald-400 mt-1">
            {formatCurrency(
              blockedUsers
                .filter((b) => b.recovery_status === 'Pending')
                .reduce((sum, b) => sum + (b.recovery_amount || 0), 0)
            )}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Unrecovered damages
          </span>
        </div>
      </KpiCardContainer>

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

            <div className="flex items-center gap-2 flex-wrap">
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
                  <option value="vehicles" className="bg-zinc-900 text-zinc-200">vehicles</option>
                  <option value="hub_part_stock" className="bg-zinc-900 text-zinc-200">hub_part_stock</option>
                  <option value="job_cards" className="bg-zinc-900 text-zinc-200">job_cards</option>
                  <option value="refunds" className="bg-zinc-900 text-zinc-200">refunds</option>
                  <option value="sops" className="bg-zinc-900 text-zinc-200">sops</option>
                  <option value="tasks" className="bg-zinc-900 text-zinc-200">tasks</option>
                </select>
              </div>

              {/* Export */}
              <button
                onClick={handleExportCSV}
                className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
                title="Export Audit Logs to CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                onClick={handleExportPDF}
                className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
                title="Export Audit Logs to PDF"
              >
                <FileText className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>

          {/* Logs Table with Resizable Headers & Sorting */}
          <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                  <tr>
                    <ResizableTh
                      colKey="timestamp"
                      width={auditWidths.timestamp}
                      onResizeStart={startAuditResizing}
                      onClick={() => handleSort('timestamp')}
                      className="p-3.5 pl-4 cursor-pointer hover:bg-zinc-800/60 transition"
                    >
                      <span>Timestamp</span>
                      {sortField === 'timestamp' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </ResizableTh>

                    <ResizableTh
                      colKey="table"
                      width={auditWidths.table}
                      onResizeStart={startAuditResizing}
                      onClick={() => handleSort('table_name')}
                      className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                    >
                      <span>Table Target</span>
                      {sortField === 'table_name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </ResizableTh>

                    <ResizableTh
                      colKey="action"
                      width={auditWidths.action}
                      onResizeStart={startAuditResizing}
                      onClick={() => handleSort('action')}
                      className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                    >
                      <span>Action</span>
                      {sortField === 'action' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </ResizableTh>

                    <ResizableTh
                      colKey="performer"
                      width={auditWidths.performer}
                      onResizeStart={startAuditResizing}
                      onClick={() => handleSort('performer_name')}
                      className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                    >
                      <span>Performed By</span>
                      {sortField === 'performer_name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </ResizableTh>

                    <ResizableTh
                      colKey="record"
                      width={auditWidths.record}
                      onResizeStart={startAuditResizing}
                      className="p-3.5"
                    >
                      Record ID
                    </ResizableTh>

                    <th style={{ width: `${auditWidths.diff || 110}px` }} className="p-3.5 text-right pr-4">
                      JSON Diff
                    </th>
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
          <div className="flex items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search blocked users, phone, vehicle key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
                title="Export Penalties to CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                onClick={handleExportPDF}
                className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
                title="Export Penalties to PDF"
              >
                <FileText className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>

          <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                  <tr>
                    <ResizableTh
                      colKey="user"
                      width={blockedWidths.user}
                      onResizeStart={startBlockedResizing}
                      className="p-3.5 pl-4"
                    >
                      Blocked User
                    </ResizableTh>

                    <ResizableTh
                      colKey="contact"
                      width={blockedWidths.contact}
                      onResizeStart={startBlockedResizing}
                      className="p-3.5"
                    >
                      Contact / Email
                    </ResizableTh>

                    <ResizableTh
                      colKey="vehicle"
                      width={blockedWidths.vehicle}
                      onResizeStart={startBlockedResizing}
                      className="p-3.5"
                    >
                      EV Key No
                    </ResizableTh>

                    <ResizableTh
                      colKey="reason"
                      width={blockedWidths.reason}
                      onResizeStart={startBlockedResizing}
                      className="p-3.5"
                    >
                      Incident & Reason
                    </ResizableTh>

                    <ResizableTh
                      colKey="fee"
                      width={blockedWidths.fee}
                      onResizeStart={startBlockedResizing}
                      className="p-3.5"
                    >
                      Penalty Fee
                    </ResizableTh>

                    <ResizableTh
                      colKey="status"
                      width={blockedWidths.status}
                      onResizeStart={startBlockedResizing}
                      className="p-3.5"
                    >
                      Recovery Status
                    </ResizableTh>

                    <th style={{ width: `${blockedWidths.logged_by || 130}px` }} className="p-3.5 text-right pr-4">
                      Logged By
                    </th>
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
                          Key: #{blk.vehicle_no}
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
                              toast.success(`Updated penalty recovery status to: ${nextStatus}`);
                            }}
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer',
                              blk.recovery_status === 'Recovered'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                            )}
                          >
                            {blk.recovery_status}
                          </button>
                        </td>

                        <td className="p-3.5 text-right pr-4 font-mono text-zinc-400">
                          {blk.employee_name || 'Admin'}
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

      {/* JSON Diff Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">
                    Audit Log Diff: {selectedLog.table_name} ({selectedLog.action})
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ID: {selectedLog.id} • {formatDate(selectedLog.timestamp)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-zinc-500 font-sans font-semibold">Previous State (Old Data)</span>
                  <pre className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-zinc-400 overflow-x-auto text-[11px]">
                    {selectedLog.old_data
                      ? JSON.stringify(selectedLog.old_data, null, 2)
                      : 'null (Initial Creation)'}
                  </pre>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-sans font-semibold">Mutated State (New Data)</span>
                  <pre className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-emerald-400 overflow-x-auto text-[11px]">
                    {selectedLog.new_data
                      ? JSON.stringify(selectedLog.new_data, null, 2)
                      : 'null (Deleted)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#141416] border-t border-[#27272a] flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition"
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
