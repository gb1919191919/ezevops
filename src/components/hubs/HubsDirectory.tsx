'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Hub, ChargerStatus, HubType } from '@/types';
import { getWhatsAppLink, getTelLink, formatPhone, cn } from '@/lib/utils';
import { ChargerStatusBadge, HubTypeBadge } from '../common/StatusBadge';
import {
  Building2,
  MapPin,
  Phone,
  MessageCircle,
  Zap,
  Sun,
  Moon,
  Shield,
  Plus,
  Edit2,
  X,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export function HubsDirectory() {
  const hubs = useAppStore((s) => s.hubs || []);
  const addHub = useAppStore((s) => s.addHub);
  const updateHub = useAppStore((s) => s.updateHub);
  const toggleChargerStatus = useAppStore((s) => s.toggleChargerStatus);
  const { isOwner, isManager } = useRBAC();

  // Edit Hub Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [hubName, setHubName] = useState('');
  const [hubCode, setHubCode] = useState('');
  const [hubType, setHubType] = useState<HubType>('BIKE_HUB');
  const [hubCity, setHubCity] = useState('Mumbai');
  const [hubAddress, setHubAddress] = useState('');
  const [pocName, setPocName] = useState('');
  const [pocPhone, setPocPhone] = useState('+91 ');
  const [dayGuardName, setDayGuardName] = useState('');
  const [dayGuardPhone, setDayGuardPhone] = useState('+91 ');
  const [nightGuardName, setNightGuardName] = useState('');
  const [nightGuardPhone, setNightGuardPhone] = useState('+91 ');
  const [chargingTotal, setChargingTotal] = useState(12);

  // Add Hub Modal
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Charger quick toggle state
  const [chargerModalOpen, setChargerModalOpen] = useState(false);
  const [targetHubForCharger, setTargetHubForCharger] = useState<Hub | null>(null);
  const [targetPortNumber, setTargetPortNumber] = useState<number>(1);
  const [selectedChargerStatus, setSelectedChargerStatus] = useState<ChargerStatus>('ACTIVE');
  const [chargerRemarks, setChargerRemarks] = useState('');

  const handleOpenEdit = (hub: Hub) => {
    setSelectedHub(hub);
    setHubName(hub.name);
    setHubCode(hub.code);
    setHubType(hub.type);
    setHubCity(hub.city);
    setHubAddress(hub.address);
    setPocName(hub.poc_name);
    setPocPhone(hub.poc_phone);
    setDayGuardName(hub.day_guard_name || '');
    setDayGuardPhone(hub.day_guard_phone || '');
    setNightGuardName(hub.night_guard_name || '');
    setNightGuardPhone(hub.night_guard_phone || '');
    setChargingTotal(hub.charging_points_total);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHub) return;

    updateHub(selectedHub.id, {
      name: hubName.trim(),
      code: hubCode.trim().toUpperCase(),
      type: hubType,
      city: hubCity,
      address: hubAddress.trim(),
      poc_name: pocName.trim(),
      poc_phone: pocPhone.trim(),
      day_guard_name: dayGuardName.trim(),
      day_guard_phone: dayGuardPhone.trim(),
      night_guard_name: nightGuardName.trim(),
      night_guard_phone: nightGuardPhone.trim(),
      charging_points_total: Number(chargingTotal),
    });

    toast.success(`Hub details for '${hubName}' updated!`);
    setEditModalOpen(false);
    setSelectedHub(null);
  };

  const handleCreateHub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubName.trim() || !hubCode.trim()) {
      toast.error('Hub name and code are required.');
      return;
    }

    addHub({
      name: hubName.trim(),
      code: hubCode.trim().toUpperCase(),
      type: hubType,
      city: hubCity,
      address: hubAddress.trim(),
      poc_name: pocName.trim(),
      poc_phone: pocPhone.trim(),
      day_guard_name: dayGuardName.trim(),
      day_guard_phone: dayGuardPhone.trim(),
      night_guard_name: nightGuardName.trim(),
      night_guard_phone: nightGuardPhone.trim(),
      charging_points_total: Number(chargingTotal),
      charging_points_active: Number(chargingTotal),
      is_active: true,
    });

    toast.success(`New hub '${hubName}' created!`);
    setAddModalOpen(false);
  };

  const handleOpenChargerModal = (hub: Hub, portNumber: number) => {
    setTargetHubForCharger(hub);
    setTargetPortNumber(portNumber);

    const log = hub.charger_logs?.find((l) => l.connector_number === `P${portNumber}`);
    setSelectedChargerStatus(log ? log.status : 'ACTIVE');
    setChargerRemarks(log?.remarks || '');
    setChargerModalOpen(true);
  };

  const handleSaveChargerStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHubForCharger) return;

    toggleChargerStatus(
      targetHubForCharger.id,
      targetPortNumber,
      selectedChargerStatus,
      chargerRemarks.trim()
    );

    toast.success(`Port ${targetPortNumber} status updated to ${selectedChargerStatus}`);
    setChargerModalOpen(false);
    setTargetHubForCharger(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Regional Hubs & Charging Directory
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Emergency contacts, day & night security rotations, and interactive charger condition matrix
          </p>
        </div>

        {(isOwner || isManager) && (
          <button
            onClick={() => {
              setHubName('');
              setHubCode('');
              setHubType('BIKE_HUB');
              setHubCity('Mumbai');
              setHubAddress('');
              setPocName('');
              setPocPhone('+91 ');
              setDayGuardName('');
              setDayGuardPhone('+91 ');
              setNightGuardName('');
              setNightGuardPhone('+91 ');
              setChargingTotal(12);
              setAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Hub</span>
          </button>
        )}
      </div>

      {/* Hub Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {hubs.map((hub) => {
          const dayGuardNameVal = hub.day_guard_name || 'Not Assigned';
          const dayGuardPhoneVal = hub.day_guard_phone || '';
          const hasDayGuard = Boolean(dayGuardPhoneVal && dayGuardPhoneVal.replace(/[^\d]/g, '').length >= 10);

          const nightGuardNameVal = hub.night_guard_name || 'Not Assigned';
          const nightGuardPhoneVal = hub.night_guard_phone || '';
          const hasNightGuard = Boolean(nightGuardPhoneVal && nightGuardPhoneVal.replace(/[^\d]/g, '').length >= 10);

          return (
            <div
              key={hub.id}
              className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 hover:border-zinc-700 transition shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Hub Title, Code & Edit Button */}
                <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                        {hub.code}
                      </span>
                      <HubTypeBadge type={hub.type} />
                      <h3 className="font-bold text-base text-zinc-100">{hub.name}</h3>
                    </div>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span>{hub.address}</span>
                    </p>
                  </div>

                  {(isOwner || isManager) && (
                    <button
                      onClick={() => handleOpenEdit(hub)}
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition flex items-center gap-1 text-xs"
                      title="Edit Hub Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {/* Hub POC Contact Box with WhatsApp & Call */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      Hub POC Manager
                    </span>
                    <p className="font-bold text-xs text-zinc-100">{hub.poc_name || 'Hub Manager'}</p>
                    <p className="text-zinc-400 font-mono text-[11px]">{hub.poc_phone ? formatPhone(hub.poc_phone) : 'No phone listed'}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hub.poc_phone && (
                      <>
                        <a
                          href={getTelLink(hub.poc_phone)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Call</span>
                        </a>
                        <a
                          href={getWhatsAppLink(hub.poc_phone, hub.poc_name, hub.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold transition flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Day & Night Guard Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Day Guard */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <span className="text-zinc-400 font-semibold flex items-center gap-1 text-[11px]">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Day Guard (06:00 - 18:00)
                    </span>
                    <div>
                      <p className="font-bold text-zinc-200">{dayGuardNameVal}</p>
                      <p className="text-[11px] font-mono text-zinc-400">{hasDayGuard ? formatPhone(dayGuardPhoneVal) : 'No contact'}</p>
                    </div>
                    {hasDayGuard ? (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-900">
                        <a
                          href={getTelLink(dayGuardPhoneVal)}
                          className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-[11px] text-center flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>Call</span>
                        </a>
                        <a
                          href={getWhatsAppLink(dayGuardPhoneVal, dayGuardNameVal, hub.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 text-emerald-400 font-medium text-[11px] text-center flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    ) : (
                      <div className="pt-1 border-t border-zinc-900 text-[10px] text-zinc-500 italic">
                        Not assigned
                      </div>
                    )}
                  </div>

                  {/* Night Guard */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <span className="text-zinc-400 font-semibold flex items-center gap-1 text-[11px]">
                      <Moon className="w-3.5 h-3.5 text-blue-400" />
                      Night Guard (18:00 - 06:00)
                    </span>
                    <div>
                      <p className="font-bold text-zinc-200">{nightGuardNameVal}</p>
                      <p className="text-[11px] font-mono text-zinc-400">{hasNightGuard ? formatPhone(nightGuardPhoneVal) : 'No contact'}</p>
                    </div>
                    {hasNightGuard ? (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-900">
                        <a
                          href={getTelLink(nightGuardPhoneVal)}
                          className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-[11px] text-center flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>Call</span>
                        </a>
                        <a
                          href={getWhatsAppLink(nightGuardPhoneVal, nightGuardNameVal, hub.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 text-emerald-400 font-medium text-[11px] text-center flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    ) : (
                      <div className="pt-1 border-t border-zinc-900 text-[10px] text-zinc-500 italic">
                        Not assigned
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Charger Bay Grid */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Charging Bays ({hub.charging_points_active} / {hub.charging_points_total} Active)</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Tap port to change condition</span>
                  </div>

                  {/* Visual Connector Buttons Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {Array.from({ length: hub.charging_points_total || 8 }).map((_, idx) => {
                      const portNumber = idx + 1;
                      const log = hub.charger_logs?.find((l) => l.connector_number === `P${portNumber}`);
                      const status = log ? log.status : 'ACTIVE';

                      return (
                        <button
                          key={portNumber}
                          onClick={() => handleOpenChargerModal(hub, portNumber)}
                          className={cn(
                            'p-2 rounded-lg border text-center transition flex flex-col items-center gap-0.5',
                            status === 'ACTIVE' &&
                              'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60',
                            status === 'CONNECTOR_NOT_WORKING' &&
                              'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-500/60',
                            status === 'CONNECTOR_DAMAGED' &&
                              'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:border-rose-500/60',
                            status === 'CHARGER_DAMAGED' &&
                              'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:border-rose-500/60',
                            status === 'OFFLINE_TRIPPED' &&
                              'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                          )}
                          title={`Port ${portNumber}: ${status}`}
                        >
                          <span className="font-mono font-bold text-[11px]">P{portNumber}</span>
                          <span className="text-[9px] uppercase font-semibold truncate max-w-full">
                            {status === 'ACTIVE' ? 'Active' : 'Defect'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Hub Modal */}
      {editModalOpen && selectedHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">Edit Hub Parameters</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub Name</label>
                  <input
                    type="text"
                    required
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub Code</label>
                  <input
                    type="text"
                    required
                    value={hubCode}
                    onChange={(e) => setHubCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub Type</label>
                  <select
                    value={hubType}
                    onChange={(e) => setHubType(e.target.value as HubType)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="BIKE_HUB">Bike Hub</option>
                    <option value="STOCK_HUB">Central Stock Hub</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">City</label>
                  <input
                    type="text"
                    required
                    value={hubCity}
                    onChange={(e) => setHubCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Total Charger Ports</label>
                  <input
                    type="number"
                    min="1"
                    value={chargingTotal}
                    onChange={(e) => setChargingTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Full Address</label>
                <textarea
                  rows={2}
                  required
                  value={hubAddress}
                  onChange={(e) => setHubAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* POC Contact */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub POC Name</label>
                  <input
                    type="text"
                    required
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">POC Mobile (+91)</label>
                  <input
                    type="text"
                    required
                    value={pocPhone}
                    onChange={(e) => setPocPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Day Guard */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Day Guard Name</label>
                  <input
                    type="text"
                    value={dayGuardName}
                    onChange={(e) => setDayGuardName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Day Guard Mobile</label>
                  <input
                    type="text"
                    value={dayGuardPhone}
                    onChange={(e) => setDayGuardPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Night Guard */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Night Guard Name</label>
                  <input
                    type="text"
                    value={nightGuardName}
                    onChange={(e) => setNightGuardName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Night Guard Mobile</label>
                  <input
                    type="text"
                    value={nightGuardPhone}
                    onChange={(e) => setNightGuardPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Hub Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">Create Operational Hub</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHub} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Whitefield Tech Park Hub"
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HUB-BLR-04"
                    value={hubCode}
                    onChange={(e) => setHubCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub Type</label>
                  <select
                    value={hubType}
                    onChange={(e) => setHubType(e.target.value as HubType)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="BIKE_HUB">Bike Hub</option>
                    <option value="STOCK_HUB">Central Stock Hub</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">City</label>
                  <input
                    type="text"
                    required
                    value={hubCity}
                    onChange={(e) => setHubCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Charging Ports</label>
                  <input
                    type="number"
                    min="1"
                    value={chargingTotal}
                    onChange={(e) => setChargingTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Full Address</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Street, locality, postal code..."
                  value={hubAddress}
                  onChange={(e) => setHubAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">POC Manager Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">POC Phone (+91)</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98801 12345"
                    value={pocPhone}
                    onChange={(e) => setPocPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Create Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Charger Status Toggle Modal */}
      {chargerModalOpen && targetHubForCharger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Bay Port P{targetPortNumber} Condition
              </h3>
              <button
                onClick={() => setChargerModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Update operational status for charger port at{' '}
              <strong className="text-zinc-200">{targetHubForCharger.name}</strong>.
            </p>

            <form onSubmit={handleSaveChargerStatus} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Select Condition</label>
                <select
                  value={selectedChargerStatus}
                  onChange={(e) => setSelectedChargerStatus(e.target.value as ChargerStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  <option value="ACTIVE">Active (Working Normal)</option>
                  <option value="CONNECTOR_NOT_WORKING">Connector Not Working</option>
                  <option value="CONNECTOR_DAMAGED">Connector Damaged</option>
                  <option value="CHARGER_DAMAGED">Charger Damaged</option>
                  <option value="POWER_LINE_ISSUE">Power Line Issue</option>
                  <option value="OFFLINE_TRIPPED">Offline / Tripped</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Defect Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Pin lock stuck, latch broken..."
                  value={chargerRemarks}
                  onChange={(e) => setChargerRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setChargerModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Apply Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
