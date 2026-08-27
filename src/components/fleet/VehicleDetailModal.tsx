'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Vehicle, VehicleStatus, ScooterModel } from '@/types';
import { VehicleStatusBadge } from '../common/StatusBadge';
import { formatDate, formatRelativeTime, formatCurrency, cn } from '@/lib/utils';
import {
  X,
  Car,
  Key,
  Shield,
  MapPin,
  Clock,
  History,
  Wrench,
  DollarSign,
  Layers,
  ArrowRight,
  RefreshCw,
  Edit2,
  CheckCircle2,
  Sparkles,
  Gauge,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export function VehicleDetailModal({ vehicle, onClose }: VehicleDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'job_cards' | 'parts' | 'audit'>('overview');

  // Full Edit Modal State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editModel, setEditModel] = useState<ScooterModel>(vehicle?.model || 'CS Model');
  const [editKey, setEditKey] = useState(vehicle?.key_number || '');
  const [editIotId, setEditIotId] = useState(vehicle?.vehicle_id || '');
  const [editVin, setEditVin] = useState(vehicle?.vin || '');
  const [editHubId, setEditHubId] = useState(vehicle?.current_hub_id || '');
  const [editOdo, setEditOdo] = useState<number>(vehicle?.odometer_km || 0);
  const [editStatus, setEditStatus] = useState<VehicleStatus>(vehicle?.current_status || 'Available');
  const [editReason, setEditReason] = useState(vehicle?.status_change_reason || '');

  // Quick Status change state
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus>('Available');
  const [statusReason, setStatusReason] = useState('');

  const hubs = useAppStore((s) => s.hubs);
  const jobCards = useAppStore((s) => s.jobCards);
  const auditLogs = useAppStore((s) => s.auditLogs);
  const updateVehicle = useAppStore((s) => s.updateVehicle);
  const requestVehicleStatus = useAppStore((s) => s.requestVehicleStatus);
  const approveVehicleStatus = useAppStore((s) => s.approveVehicleStatus);
  const { isOwner, isManager } = useRBAC();

  if (!vehicle) return null;

  const currentHub = hubs.find((h) => h.id === vehicle.current_hub_id);
  const linkedJobCards = jobCards.filter((j) => j.vehicle_id === vehicle.id);

  // Compute lifetime parts consumed
  const vehicleParts = linkedJobCards
    .flatMap((j) => j.parts || [])
    .filter((p) => p.is_approved);

  const totalMaintenanceCost = vehicleParts.reduce(
    (acc, p) => acc + p.quantity * p.unit_cost_snapshot,
    0
  );

  const vehicleAudit = auditLogs.filter(
    (log) => log.table_name === 'vehicles' && log.record_id === vehicle.id
  );

  const handleOpenEdit = () => {
    setEditModel(vehicle.model);
    setEditKey(vehicle.key_number);
    setEditIotId(vehicle.vehicle_id);
    setEditVin(vehicle.vin);
    setEditHubId(vehicle.current_hub_id);
    setEditOdo(vehicle.odometer_km || 0);
    setEditStatus(vehicle.current_status);
    setEditReason(vehicle.status_change_reason || '');
    setIsEditMode(true);
  };

  const handleSaveVehicleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIotId.trim() || editIotId.trim().length < 10) {
      toast.error('Vehicle IoT ID must be a valid numerical string.');
      return;
    }
    if (!editKey.trim()) {
      toast.error('Key number is required.');
      return;
    }

    updateVehicle(vehicle.id, {
      model: editModel,
      key_number: editKey.trim(),
      vehicle_id: editIotId.trim(),
      vin: editVin.trim(),
      current_hub_id: editHubId,
      odometer_km: Number(editOdo),
      current_status: editStatus,
      status_change_reason: editReason.trim() || null,
      last_odometer_updated_at: new Date().toISOString(),
    });

    toast.success(`Vehicle Key ${editKey} details updated successfully!`);
    setIsEditMode(false);
  };

  const handleRequestStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim()) {
      toast.error('A justification reason is required for status changes.');
      return;
    }

    requestVehicleStatus(vehicle.id, selectedStatus, statusReason.trim(), isOwner || isManager);
    toast.success(`Vehicle status updated to ${selectedStatus}`);
    setIsChangingStatus(false);
    setStatusReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-zinc-100">
                  Key: {vehicle.key_number}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  (IoT: {vehicle.vehicle_id})
                </span>
                <VehicleStatusBadge status={vehicle.current_status} />
              </div>
              <p className="text-xs text-zinc-400">
                Model: <strong className="text-zinc-200">{vehicle.model}</strong> • Hub: <strong className="text-zinc-200">{currentHub?.name || 'Unassigned'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(isOwner || isManager) && !isEditMode && (
              <button
                onClick={handleOpenEdit}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Vehicle</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Full Edit Form Mode */}
          {isEditMode ? (
            <div className="p-5 rounded-2xl bg-[#141416] border border-[#2a2a2f] space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Edit Vehicle Specifications</span>
                </h3>
                <span className="text-[10px] font-mono text-zinc-500">ID: {vehicle.id}</span>
              </div>

              <form onSubmit={handleSaveVehicleEdit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Scooter Model</label>
                    <select
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value as ScooterModel)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="CS Model">CS Model</option>
                      <option value="Ola Model">Ola Model</option>
                      <option value="Single Light Model">Single Light Model</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Key Number (4-digit)</label>
                    <input
                      type="text"
                      required
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">14-15 Digit IoT ID (IMEI)</label>
                    <input
                      type="text"
                      required
                      value={editIotId}
                      onChange={(e) => setEditIotId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Chassis / VIN Number</label>
                    <input
                      type="text"
                      value={editVin}
                      onChange={(e) => setEditVin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Assigned Hub</label>
                    <select
                      value={editHubId}
                      onChange={(e) => setEditHubId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                    >
                      {hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Odometer Reading (KM)</label>
                    <input
                      type="number"
                      min="0"
                      value={editOdo}
                      onChange={(e) => setEditOdo(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Operational Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as VehicleStatus)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Available">Available</option>
                      <option value="Needs Maintenance">Needs Maintenance</option>
                      <option value="Under Repair">Under Repair</option>
                      <option value="Not Available">Not Available</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Status Reason / Triage Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Front rim repaired, ready for fleet dispatch"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                  >
                    Save Vehicle Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Quick Status Banner */}
              <div className="p-4 rounded-2xl bg-[#141416] border border-[#2a2a2f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                      Current Fleet Status
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <VehicleStatusBadge status={vehicle.current_status} />
                      {vehicle.status_change_reason && (
                        <span className="text-xs text-zinc-400 italic">
                          ({vehicle.status_change_reason})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Status Change Action */}
                <div className="flex items-center gap-2">
                  {!isChangingStatus ? (
                    <button
                      onClick={() => {
                        setSelectedStatus(vehicle.current_status);
                        setIsChangingStatus(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#1e1e22] hover:bg-[#27272f] border border-[#2a2a2f] text-xs font-semibold text-zinc-200 transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Change Status</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleRequestStatusChange}
                      className="flex items-center gap-2 flex-wrap"
                    >
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as VehicleStatus)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-xs text-zinc-200 focus:outline-none"
                      >
                        <option value="Available">Available</option>
                        <option value="Needs Maintenance">Needs Maintenance</option>
                        <option value="Under Repair">Under Repair</option>
                        <option value="Not Available">Not Available</option>
                      </select>

                      <input
                        type="text"
                        required
                        placeholder="Reason for change..."
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#1c1c1f] border border-[#2a2a2f] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                      />

                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
                      >
                        Apply
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsChangingStatus(false)}
                        className="px-2 py-1.5 bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs"
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center border-b border-[#2a2a2f] gap-4 text-xs font-semibold text-zinc-400">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    'py-2 border-b-2 transition flex items-center gap-1.5',
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-400 font-bold'
                      : 'border-transparent hover:text-zinc-200'
                  )}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Telemetry & Specifications</span>
                </button>

                <button
                  onClick={() => setActiveTab('job_cards')}
                  className={cn(
                    'py-2 border-b-2 transition flex items-center gap-1.5',
                    activeTab === 'job_cards'
                      ? 'border-blue-500 text-blue-400 font-bold'
                      : 'border-transparent hover:text-zinc-200'
                  )}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Job Cards ({linkedJobCards.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('parts')}
                  className={cn(
                    'py-2 border-b-2 transition flex items-center gap-1.5',
                    activeTab === 'parts'
                      ? 'border-blue-500 text-blue-400 font-bold'
                      : 'border-transparent hover:text-zinc-200'
                  )}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Parts & Spares ({vehicleParts.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={cn(
                    'py-2 border-b-2 transition flex items-center gap-1.5',
                    activeTab === 'audit'
                      ? 'border-blue-500 text-blue-400 font-bold'
                      : 'border-transparent hover:text-zinc-200'
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Trail ({vehicleAudit.length})</span>
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Odometer Reading
                      </div>
                      <div className="text-base font-mono font-bold text-zinc-100 mt-1">
                        {vehicle.odometer_km ? `${vehicle.odometer_km} KM` : 'Not Logged'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Scooter Model
                      </div>
                      <div className="text-xs font-bold text-zinc-100 mt-1">
                        {vehicle.model}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Key Number
                      </div>
                      <div className="text-base font-mono font-bold text-blue-400 mt-1">
                        {vehicle.key_number}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#141416] border border-[#2a2a2f]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Maintenance Spend
                      </div>
                      <div className="text-base font-mono font-bold text-emerald-400 mt-1">
                        {formatCurrency(totalMaintenanceCost)}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141416] border border-[#2a2a2f] space-y-2">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Telemetry & Hardware Identification
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block">15-Digit IoT ID (IMEI):</span>
                        <span className="font-mono font-bold text-zinc-100">{vehicle.vehicle_id}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Chassis / VIN:</span>
                        <span className="font-mono font-bold text-zinc-100">{vehicle.vin}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Current Assigned Hub:</span>
                        <span className="text-zinc-100 font-semibold">{currentHub?.name || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Last Inspected:</span>
                        <span className="text-zinc-100">
                          {vehicle.last_inspected_at ? formatDate(vehicle.last_inspected_at) : 'No inspection logged'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Job Cards */}
              {activeTab === 'job_cards' && (
                <div className="space-y-3">
                  {linkedJobCards.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-[#2a2a2f] rounded-2xl">
                      No maintenance job cards logged for this vehicle.
                    </div>
                  ) : (
                    linkedJobCards.map((job) => (
                      <div key={job.id} className="p-4 rounded-xl bg-[#141416] border border-[#2a2a2f] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-400">
                            Ticket #{job.ticket_number}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {formatDate(job.created_at)}
                          </span>
                        </div>
                        <p className="text-zinc-200 font-medium">{job.issue_description}</p>
                        {job.solution_applied && (
                          <div className="text-[11px] text-emerald-400 font-sans">
                            <strong>Solution: </strong> {job.solution_applied}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Consumed Spares */}
              {activeTab === 'parts' && (
                <div className="space-y-3">
                  {vehicleParts.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-[#2a2a2f] rounded-2xl">
                      No spare parts have been billed to this vehicle yet.
                    </div>
                  ) : (
                    vehicleParts.map((part) => (
                      <div key={part.id} className="p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-zinc-200">Part ID: {part.part_id}</div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Qty: {part.quantity} pcs @ {formatCurrency(part.unit_cost_snapshot)} each
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(part.quantity * part.unit_cost_snapshot)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Audit */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  {vehicleAudit.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-[#2a2a2f] rounded-2xl">
                      No audit mutations recorded for this vehicle yet.
                    </div>
                  ) : (
                    vehicleAudit.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-[#141416] border border-[#2a2a2f] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-blue-400 font-mono">{log.action}</span>
                          <span className="text-zinc-400 ml-2">by {log.performer_name || 'System'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">{formatDate(log.timestamp)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
