'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, PartInventory } from '@/types';
import { VehicleSearchCombobox } from '../common/VehicleSearchCombobox';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Wrench,
  Car,
  CheckSquare,
  Package,
  Camera,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Gauge,
  Zap,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

interface WizardProps {
  onSuccess?: () => void;
}

export function MaintenanceLoggerWizard({ onSuccess }: WizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [odometerKm, setOdometerKm] = useState<number | ''>('');
  const [issueDescription, setIssueDescription] = useState('');
  const [solutionApplied, setSolutionApplied] = useState('');
  const [photosUrl, setPhotosUrl] = useState<string[]>([]);
  const [stagedParts, setStagedParts] = useState<{ part_id: string; quantity: number }[]>([]);
  const [immediateApproval, setImmediateApproval] = useState<boolean>(true);

  // Checklist
  const [checklist, setChecklist] = useState({
    brakePads: false,
    throttleResponse: false,
    tyrePressure: false,
    headlampDRL: false,
    kickstandSensor: false,
    bmsDiagnostics: false,
  });

  const vehicles = useAppStore((s) => s.vehicles || []);
  const parts = useAppStore((s) => s.parts || []);
  const hubs = useAppStore((s) => s.hubs || []);
  const createJobCard = useAppStore((s) => s.createJobCard);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const handleAddPart = (partId: string) => {
    const existing = stagedParts.find((p) => p.part_id === partId);
    if (existing) {
      setStagedParts(
        stagedParts.map((p) => (p.part_id === partId ? { ...p, quantity: p.quantity + 1 } : p))
      );
    } else {
      setStagedParts([...stagedParts, { part_id: partId, quantity: 1 }]);
    }
  };

  const handleRemovePart = (partId: string) => {
    setStagedParts(stagedParts.filter((p) => p.part_id !== partId));
  };

  const handleUpdateQty = (partId: string, delta: number) => {
    setStagedParts(
      stagedParts
        .map((p) => {
          if (p.part_id === partId) {
            const next = p.quantity + delta;
            return next > 0 ? { ...p, quantity: next } : null;
          }
          return p;
        })
        .filter(Boolean) as { part_id: string; quantity: number }[]
    );
  };

  const handleSimulatePhotoUpload = () => {
    const mockPhotos = [
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600',
    ];
    setPhotosUrl(mockPhotos);
    toast.success('Inspection photos attached.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      toast.error('Please select a vehicle.');
      return;
    }
    if (!issueDescription.trim()) {
      toast.error('Defect description is required.');
      return;
    }

    const shouldAutoApprove = (isOwner || isManager) && immediateApproval;

    createJobCard(
      {
        vehicle_id: selectedVehicle.id,
        hub_id: selectedVehicle.current_hub_id,
        reported_by: currentUser?.id || 'usr-01',
        assigned_mechanic_id: currentUser?.id || 'usr-01',
        odometer_km: odometerKm !== '' ? Number(odometerKm) : undefined,
        issue_description: issueDescription.trim(),
        solution_applied: solutionApplied.trim() || null,
        photos_url: photosUrl,
      },
      stagedParts,
      shouldAutoApprove
    );

    if (shouldAutoApprove) {
      toast.success('Job card approved and spare parts committed immediately!');
    } else {
      toast.success('Job card created and spare parts staged for manager sign-off.');
    }

    if (onSuccess) onSuccess();
  };

  const totalEstimatedCost = stagedParts.reduce((acc, p) => {
    const partDef = parts.find((item) => item.id === p.part_id);
    return acc + (partDef?.unit_cost || 0) * p.quantity;
  }, 0);

  return (
    <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Wizard Header & Steps Tracker */}
      <div className="p-5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Open Maintenance Job Ticket
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            Step {currentStep} of 4
          </span>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { step: 1, label: 'Vehicle' },
            { step: 2, label: 'Inspection' },
            { step: 3, label: 'Spare Parts' },
            { step: 4, label: 'Review' },
          ].map((s) => (
            <div key={s.step} className="space-y-1">
              <div
                className={cn(
                  'h-1 rounded-full transition-all',
                  currentStep >= s.step ? 'bg-emerald-500' : 'bg-zinc-800'
                )}
              />
              <span
                className={cn(
                  'text-[10px] block text-center font-semibold',
                  currentStep === s.step ? 'text-emerald-400' : 'text-zinc-500'
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Steps Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs text-zinc-300">
        {/* STEP 1: Select Vehicle */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Select Target EV</h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Type any 3-4 digits of the 14-15 digit Vehicle ID or 4-digit Key code.
              </p>
            </div>

            <VehicleSearchCombobox
              autoFocus
              placeholder="Type 3-4 digits (e.g. 8601, B001, 62442)..."
              onSelect={(v) => {
                setSelectedVehicle(v);
                if (v.odometer_km) setOdometerKm(v.odometer_km);
              }}
            />

            {selectedVehicle ? (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-zinc-100">
                      {selectedVehicle.vehicle_id}
                    </span>
                    <span className="font-mono text-xs text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                      Key: {selectedVehicle.key_number}
                    </span>
                  </div>
                  <span className="text-emerald-400 font-bold text-xs">{selectedVehicle.model}</span>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  VIN: <span className="font-mono text-zinc-300">{selectedVehicle.vin}</span> • Last Odometer:{' '}
                  <span className="font-mono text-zinc-300">{selectedVehicle.odometer_km || 0} KM</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Please search and select a vehicle above to continue.
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={!selectedVehicle}
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-emerald-500 disabled:opacity-40 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <span>Continue to Inspection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Defect Diagnostics & Manual Odometer */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Inspection & Manual Distance Log</h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Log the current odometer reading and complete the 6-point checklist.
              </p>
            </div>

            {/* Manual Odometer Entry */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <label className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-400" />
                Current Odometer Reading (KM)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 4250"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono text-sm focus:outline-none focus:border-zinc-500"
              />
              <span className="text-[10px] text-zinc-500">
                Updating this distance logs the odometer with your staff ID and timestamp.
              </span>
            </div>

            {/* 6-Point Inspection Checklist */}
            <div className="space-y-2">
              <span className="font-bold text-zinc-300 uppercase text-[10px]">6-Point Safety Checklist</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'brakePads', label: 'Brake Pads & Rotors' },
                  { key: 'throttleResponse', label: 'Throttle Response' },
                  { key: 'tyrePressure', label: 'Tyre Pressure (32 PSI)' },
                  { key: 'headlampDRL', label: 'LED Headlamp & Tail' },
                  { key: 'kickstandSensor', label: 'Kickstand Sensor' },
                  { key: 'bmsDiagnostics', label: 'Battery BMS Health' },
                ].map((item) => (
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
                      checklist[item.key as keyof typeof checklist]
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    )}
                  >
                    <span>{item.label}</span>
                    {checklist[item.key as keyof typeof checklist] && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Description */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-200">Defect Description *</label>
              <textarea
                required
                rows={2}
                placeholder="Describe observed defect, noise, electrical symptom..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Solution Applied */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-200">Action / Repair Performed</label>
              <input
                type="text"
                placeholder="e.g. Cleaned caliper, replaced brake pads, torqued clamp"
                value={solutionApplied}
                onChange={(e) => setSolutionApplied(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!issueDescription.trim()}
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-emerald-500 disabled:opacity-40 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <span>Continue to Parts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Spare Parts Requisition */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Stage Spare Parts</h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Select parts from catalog to stage for replacement.
              </p>
            </div>

            {/* Quick Part Adder */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Available Spare Catalog</span>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {parts.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleAddPart(p.id)}
                    className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-zinc-200 truncate">{p.name}</div>
                      <span className="font-mono text-emerald-400 text-[11px]">
                        {formatCurrency(p.unit_cost)}
                      </span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Staged Parts Basket */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Staged Parts ({stagedParts.length})
              </span>

              {stagedParts.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-900/40">
                  No spare parts staged for this ticket.
                </div>
              ) : (
                <div className="space-y-2">
                  {stagedParts.map((sp) => {
                    const partDef = parts.find((item) => item.id === sp.part_id);
                    return (
                      <div
                        key={sp.part_id}
                        className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-zinc-200">{partDef?.name}</div>
                          <span className="font-mono text-emerald-400 text-[11px]">
                            {formatCurrency(partDef?.unit_cost || 0)} each
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(sp.part_id, -1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-zinc-100">{sp.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(sp.part_id, 1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePart(sp.part_id)}
                            className="p-1 text-rose-400 hover:text-rose-300 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <span>Review Summary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit (With Immediate Approval Bypass for Authorized Roles) */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Review & Submit Job Ticket</h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Verify the ticket details before submission.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">Target EV:</span>
                <span className="font-mono font-bold text-zinc-200">
                  {selectedVehicle?.vehicle_id} (Key: {selectedVehicle?.key_number})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Logged Odometer:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {odometerKm !== '' ? `${odometerKm.toLocaleString('en-IN')} KM` : 'Unchanged'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Issue:</span>
                <span className="text-zinc-200 font-medium max-w-xs text-right">{issueDescription}</span>
              </div>
              {solutionApplied && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Solution:</span>
                  <span className="text-emerald-400 font-medium">{solutionApplied}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-zinc-800">
                <span className="text-zinc-400 font-bold">Estimated Parts Cost:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatCurrency(totalEstimatedCost)}
                </span>
              </div>
            </div>

            {/* Immediate Approval Bypass Option for Owner / Manager */}
            {(isOwner || isManager) && (
              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Immediate Manager Approval</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Bypass double-approval queue & commit parts deduction immediately.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={immediateApproval}
                  onChange={(e) => setImmediateApproval(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs transition shadow-md"
              >
                {(isOwner || isManager) && immediateApproval ? 'Approve & Commit Work' : 'Submit Job Card'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
