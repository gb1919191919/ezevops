'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, VehicleStatus } from '@/types';
import { VehicleSearchCombobox } from '../common/VehicleSearchCombobox';
import { VehicleStatusBadge } from '../common/StatusBadge';
import { formatDate, cn } from '@/lib/utils';
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
  Camera,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

export function RapidInspectionLogger() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [odometerKm, setOdometerKm] = useState<number | ''>('');
  const [targetStatus, setTargetStatus] = useState<VehicleStatus>('Available');
  const [notes, setNotes] = useState('');
  const [mediaAttachments, setMediaAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 6-Point Checklist State
  const [checklist, setChecklist] = useState({
    brakes_passed: true,
    throttle_passed: true,
    tyres_passed: true,
    lights_passed: true,
    stand_sensor_passed: true,
    bms_health_passed: true,
  });

  const vehicles = useAppStore((s) => s.vehicles || []);
  const hubs = useAppStore((s) => s.hubs || []);
  const inspections = useAppStore((s) => s.inspections || []);
  const logInspection = useAppStore((s) => s.logInspection);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  // Check if any defect is flagged (4.1)
  const hasDefects = Object.values(checklist).some((passed) => !passed);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setMediaAttachments((prev) => [...prev, uploadEvent.target!.result as string]);
          toast.success(`Attached defect evidence: ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

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

    // 4.1 Mandatory Media Upload if Defect is Flagged
    if (hasDefects && mediaAttachments.length === 0) {
      toast.error('Defect Evidence Mandatory', {
        description: 'You flagged safety defect(s). Please attach at least 1 photo or video evidence before submitting.',
      });
      fileInputRef.current?.click();
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
      recommended_status: hasDefects && targetStatus === 'Available' ? 'Needs Maintenance' : targetStatus,
      notes: notes.trim() || undefined,
    });

    toast.success(
      `Inspection logged for EV ${selectedVehicle.vehicle_id}! Odometer updated to ${odometerKm} KM.`
    );
    setSelectedVehicle(null);
    setOdometerKm('');
    setNotes('');
    setMediaAttachments([]);
    setChecklist({
      brakes_passed: true,
      throttle_passed: true,
      tyres_passed: true,
      lights_passed: true,
      stand_sensor_passed: true,
      bms_health_passed: true,
    });
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
            Rapid 30-second field check to log odometer distance, 6-point safety checklist, and dynamic defect evidence capture
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
                      {selectedVehicle.custom_vehicle_id || (selectedVehicle.id || '').toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-blue-300 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 font-bold">
                      Key: #{selectedVehicle.key_number}
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
                    {hasDefects && (
                      <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Defects Flagged (Photo Evidence Required)
                      </span>
                    )}
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
                          onClick={() => {
                            const updated = !isPassed;
                            setChecklist({
                              ...checklist,
                              [item.key]: updated,
                            });
                            if (!updated && targetStatus === 'Available') {
                              setTargetStatus('Needs Maintenance');
                            }
                          }}
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

                {/* 4.1 Conditional Media Upload */}
                {hasDefects ? (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-rose-400" />
                        <span className="font-bold text-xs text-rose-200">
                          Mandatory Defect Photo / Video Proof *
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-300 font-mono">Required for Submission</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs transition flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Defect Photo / Video</span>
                      </button>
                      <span className="text-[11px] text-zinc-400">
                        {mediaAttachments.length} evidence file(s) attached
                      </span>
                    </div>

                    {mediaAttachments.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {mediaAttachments.map((media, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-rose-500/40 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={media} alt="Defect" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setMediaAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        All checklist items passed. Media upload is optional.
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] text-blue-400 hover:underline"
                      >
                        Attach Photo (Optional)
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

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
                            {v?.custom_vehicle_id || v?.vehicle_id || insp.vehicle_id}
                          </span>
                          <span className="font-mono text-[10px] text-blue-300 font-bold">
                            (Key: #{v?.key_number || 'N/A'})
                          </span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold">
                          {(insp.odometer_km ?? 0).toLocaleString('en-IN')} KM
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Inspector: {insp.inspector_name}</span>
                        <span>{formatDate(insp.inspected_at)}</span>
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
