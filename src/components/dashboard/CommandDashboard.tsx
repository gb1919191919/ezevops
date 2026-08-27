'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { StatCard } from '../common/StatCard';
import { formatCurrency, formatPhone, cn } from '@/lib/utils';
import {
  Car,
  CheckSquare,
  Package,
  Wrench,
  Zap,
  Building2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Plus,
  Activity,
  Warehouse,
} from 'lucide-react';

export function CommandDashboard() {
  const vehicles = useAppStore((s) => s.vehicles);
  const hubs = useAppStore((s) => s.hubs);
  const jobCards = useAppStore((s) => s.jobCards);
  const hubStock = useAppStore((s) => s.hubStock);
  const refunds = useAppStore((s) => s.refunds);
  const inspections = useAppStore((s) => s.inspections);
  const { isOwner, isManager } = useRBAC();

  const activeVehicles = vehicles.filter((v) => v.is_active);
  const availableVehicles = activeVehicles.filter((v) => v.current_status === 'Available');
  const needsMaintVehicles = activeVehicles.filter((v) => v.current_status === 'Needs Maintenance');
  const underRepairVehicles = activeVehicles.filter(
    (v) => v.current_status === 'Under Repair' || v.pending_status === 'Under Repair'
  );
  const notAvailableVehicles = activeVehicles.filter((v) => v.current_status === 'Not Available');

  const pendingJobCards = jobCards.filter((j) => j.status === 'PENDING');
  const stagedVehicles = activeVehicles.filter((v) => v.pending_status !== null);
  const pendingRefunds = refunds.filter((r) => r.status === 'SUBMITTED');

  const totalPendingApprovals =
    pendingJobCards.length + stagedVehicles.length + pendingRefunds.length;

  const lowStockAlerts = hubStock.filter(
    (s) => s.physical_stock - s.pending_allocated_stock < s.min_threshold
  );

  const totalChargingPoints = hubs.reduce((acc, h) => acc + h.charging_points_total, 0);
  const activeChargingPoints = hubs.reduce((acc, h) => acc + h.charging_points_active, 0);
  const chargingUtilization =
    totalChargingPoints > 0 ? Math.round((activeChargingPoints / totalChargingPoints) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100">
              Fleet Operations Command
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Operational overview across regional hubs, vehicle readiness, and maintenance queues
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/inspections"
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Rapid Inspection</span>
            </Link>
            <Link
              href="/job-cards"
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4" />
              <span>Open Job Card</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Fleet Size"
          value={activeVehicles.length}
          subtitle={`${availableVehicles.length} Ready • ${underRepairVehicles.length} Repair`}
          icon={Car}
          color="emerald"
          trend={{ value: `${Math.round((availableVehicles.length / (activeVehicles.length || 1)) * 100)}% Ready`, isPositive: true }}
        />

        <StatCard
          title="Approvals Desk"
          value={totalPendingApprovals}
          subtitle={`${pendingJobCards.length} Jobs • ${stagedVehicles.length} Staged EVs`}
          icon={CheckSquare}
          color="amber"
          badge={totalPendingApprovals > 0 ? `${totalPendingApprovals} Pending` : undefined}
          trend={{ value: `${pendingRefunds.length} Refund Claims`, isPositive: false }}
        />

        <StatCard
          title="Charging Bays"
          value={`${activeChargingPoints} / ${totalChargingPoints}`}
          subtitle={`${chargingUtilization}% Active Ports`}
          icon={Zap}
          color="blue"
          trend={{ value: `${hubs.length} Hubs`, isPositive: true }}
        />

        <StatCard
          title="Low Stock Triggers"
          value={lowStockAlerts.length}
          subtitle={`${hubStock.length} Tracked Parts`}
          icon={Package}
          color="rose"
          badge={lowStockAlerts.length > 0 ? 'ALERT' : undefined}
          trend={{ value: `${lowStockAlerts.length} Below Min`, isPositive: false }}
        />
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Approvals & Staged Fleet Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Approvals Box */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-zinc-100">
                  Priority Approvals Desk Queue
                </h3>
              </div>
              <Link
                href="/approvals"
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <span>View Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {totalPendingApprovals === 0 ? (
              <div className="p-8 text-center border border-zinc-800 rounded-xl bg-zinc-950/40 text-zinc-500 text-xs">
                Approvals desk is completely clear.
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Pending Job Cards */}
                {pendingJobCards.slice(0, 2).map((job) => {
                  const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
                  return (
                    <div
                      key={job.id}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs">
                          #{job.ticket_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-200">
                              {vehicle?.vehicle_id} (Key: {vehicle?.key_number})
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                              Job Card
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                            {job.issue_description}
                          </p>
                        </div>
                      </div>

                      <Link
                        href="/approvals"
                        className="px-3 py-1 bg-zinc-800 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold text-zinc-200 transition"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })}

                {/* Staged Vehicle Transitions */}
                {stagedVehicles.slice(0, 2).map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-xs">
                        EV
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-zinc-200">
                            {v.vehicle_id} (Key: {v.key_number})
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">
                            Status Transition
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {v.current_status} ➔ <strong className="text-amber-300">{v.pending_status}</strong>
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/approvals"
                      className="px-3 py-1 bg-zinc-800 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold text-zinc-200 transition"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fleet Status Breakdown Matrix */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-zinc-100">
                  Fleet Operational State Breakdown
                </h3>
              </div>
              <Link
                href="/fleet"
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <span>Fleet Master</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                <span className="text-zinc-400 font-medium">Available</span>
                <div className="font-mono font-black text-lg text-emerald-400">
                  {availableVehicles.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                <span className="text-zinc-400 font-medium">Needs Maint</span>
                <div className="font-mono font-black text-lg text-amber-400">
                  {needsMaintVehicles.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                <span className="text-zinc-400 font-medium">Under Repair</span>
                <div className="font-mono font-black text-lg text-rose-400">
                  {underRepairVehicles.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                <span className="text-zinc-400 font-medium">Not Available</span>
                <div className="font-mono font-black text-lg text-zinc-400">
                  {notAvailableVehicles.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Hubs & Low Stock Alerts */}
        <div className="space-y-6">
          {/* Low Stock Alerts Box */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-zinc-100">Low Stock Alerts</h3>
              </div>
              <Link
                href="/inventory"
                className="text-xs font-semibold text-rose-400 hover:underline flex items-center gap-1"
              >
                <span>Stock Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {lowStockAlerts.length === 0 ? (
              <div className="p-6 text-center border border-zinc-800 rounded-xl bg-zinc-950 text-zinc-500 text-xs">
                All hub stock counts are above minimum thresholds.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockAlerts.slice(0, 3).map((stock) => {
                  const hub = hubs.find((h) => h.id === stock.hub_id);
                  const available = stock.physical_stock - stock.pending_allocated_stock;
                  return (
                    <div
                      key={stock.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-rose-950 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200">
                          {stock.part_id === 'p-04' ? 'Waterproof Throttle Grip' : 'Spare Component'}
                        </span>
                        <span className="font-mono font-bold text-rose-400">
                          {available} left (Min: {stock.min_threshold})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">{hub?.name.split(' (')[0]}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connected Hubs Summary */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-zinc-100">Hub Infrastructure</h3>
              </div>
              <Link
                href="/hubs"
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <span>Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {hubs.slice(0, 4).map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
                      {h.type === 'STOCK_HUB' && <Warehouse className="w-3.5 h-3.5 text-purple-400" />}
                      <span>{h.name.split(' (')[0]}</span>
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      POC: {h.poc_name} ({formatPhone(h.poc_phone)})
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-emerald-400 font-bold">
                      {h.charging_points_active} Ports
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
