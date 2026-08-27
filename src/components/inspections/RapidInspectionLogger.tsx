'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, VehicleStatus } from '@/types';
import { VehicleSearchCombobox } from '../common/VehicleSearchCombobox';
import { VehicleStatusBadge } from '../common/StatusBadge';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import {
  ShieldCheck,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  Check,
  X,
  History,
  FileCheck,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';

export function RapidInspectionLogger() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [odometerKm, setOdometerKm] = useState<number | ''>('');
  const [targetStatus, setTargetStatus] = useState<VehicleStatus>('Available');
  const [notes, setNotes] = useState('');

  // 6-Point Checklist State
  const [checklist, setChecklist] = useState({
    brakes_passed: true,
    throttle_passed: true,
    tyres_passed: true,
    lights_passed: true,
    stand_sensor_passed: true,
    bms_health_passed: true,
  });

  const vehicles = useAppStore((s) => s.vehicles);
  const hubs = useAppStore((s) => s.hubs);
  const inspections = useAppStore((s) => s.inspections);
  const logInspection = useAppStore((s) => s.logInspection);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      toast.error('Please select a vehicle first.');
      return;
    }
    if (odometerKm === '' || Number(odometerKm) < 0) {
      toast.error('Please enter a valid current odometer reading in KM.');
      return;
    }

    logInspection({
      vehicle_id: selectedVehicle.id,
      hub_id: selectedVehicle.current_hub_id,
      odometer_km: Number(odometerKm),
      brakes_passed: checklist.brakes_passed,
      throttle_passed: checklist.throttle_passed,
      tyres_passed: checklist.tyres_passed,
      lights_passed: checklist.lights_passed,
      stand_sensor_passed: checklist.stand_sensor_passed,
      bms_health_passed: checklist.bms_health_passed,
      recommended_status: targetStatus,
      notes: notes.trim() || undefined,
    });

    toast.success(
      `Inspection logged for EV ${selectedVehicle.vehicle_id}! Odometer updated to ${odometerKm} KM.`
    );
    setSelectedVehicle(null);
    setOdometerKm('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Regular Vehicle Inspection & Safety Audit
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Rapid 30-second field check to log odometer distance, 6-point safety checklist, and update vehicle operational health
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rapid Inspection Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form
            onSubmit={handleAuditSubmit}
            className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-5 text-xs text-zinc-300 shadow-sm"
          >
            <div className="space-y-1">
              <label className="font-semibold text-zinc-200 block text-xs">
                Select EV to Inspect
              </label>
              <VehicleSearchCombobox
                autoFocus
                placeholder="Type 3-4 digits (e.g. 8601, B001, K101)..."
                onSelect={(v) => {
                  setSelectedVehicle(v);
                  if (v.odometer_km) setOdometerKm(v.odometer_km);
                  setTargetStatus(v.current_status);
                }}
              />
            </div>

            {selectedVehicle ? (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                {/* Vehicle Meta Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-zinc-100">
                      {selectedVehicle.vehicle_id}
                    </span>
                    <span className="font-mono text-xs text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                      Key: {selectedVehicle.key_number}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {selectedVehicle.model}
                    </span>
                  </div>
                  <VehicleStatusBadge status={selectedVehicle.current_status} />
                </div>

                {/* Manual Odometer Input */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-200 flex items-center gap-1.5 text-xs">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                    Current Odometer (KM) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Enter current KM reading..."
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm focus:outline-none focus:border-zinc-500"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Previous recorded distance: {selectedVehicle.odometer_km || 0} KM
                  </span>
                </div>

                {/* 6-Point Safety Checklist */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      6-Point Rapid Safety Checklist (Tap to toggle Pass/Fail)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'brakes_passed', label: 'Brake Pads & Pressure' },
                      { key: 'throttle_passed', label: 'Throttle Response' },
                      { key: 'tyres_passed', label: 'Tyre Pressure & Tread' },
                      { key: 'lights_passed', label: 'LED Headlamp & Tail' },
                      { key: 'stand_sensor_passed', label: 'Side Stand Cutoff' },
                      { key: 'bms_health_passed', label: 'Battery / BMS Normal' },
                    ].map((item) => {
                      const isPassed = checklist[item.key as keyof typeof checklist];
                      return (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() =>
                            setChecklist({
                              ...checklist,
                              [item.key]: !checklist[item.key as keyof typeof checklist],
                            })
                          }
                          className={cn(
                            'p-2.5 rounded-xl border text-left transition flex items-center justify-between text-xs',
                            isPassed
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold'
                          )}
                        >
                          <span>{item.label}</span>
                          <span
                            className={cn(
                              'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded',
                              isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            )}
                          >
                            {isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Status Selection */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <label className="text-zinc-400 font-semibold block text-xs">
                    Assign Vehicle Status Recommendation
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Available', 'Needs Maintenance', 'Under Repair', 'Not Available'] as VehicleStatus[]).map(
                      (st) => (
                        <button
                          type="button"
                          key={st}
                          onClick={() => setTargetStatus(st)}
                          className={cn(
                            'py-2 px-2 rounded-xl border text-xs font-semibold transition text-center',
                            targetStatus === st
                              ? 'bg-emerald-500 text-black font-extrabold border-emerald-400 shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          )}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Inspection Remarks / Observations</label>
                  <input
                    type="text"
                    placeholder="e.g. Mild scratches on right side fairing, brakes smooth..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Commit Inspection & Update Data</span>
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Please search and select a vehicle above to begin inspection.
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Recent Inspections Log History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Recent Inspection Logs</span>
              </h3>
              <span className="text-xs font-mono text-zinc-500">{inspections.length} Logged</span>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {inspections.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">
                  No inspection logs recorded in this session yet. Complete an inspection on the left to see audit records.
                </p>
              ) : (
                inspections.map((insp) => {
                  const v = vehicles.find((veh) => veh.id === insp.vehicle_id);
                  return (
                    <div
                      key={insp.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-zinc-200">
                            {v?.vehicle_id || insp.vehicle_id}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            (Key: {v?.key_number || 'N/A'})
                          </span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold">
                          {insp.odometer_km.toLocaleString('en-IN')} KM
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Inspector: {insp.inspector_name}</span>
                        <span>{formatRelativeTime(insp.inspected_at)}</span>
                      </div>

                      {insp.notes && (
                        <p className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-900">
                          &quot;{insp.notes}&quot;
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
