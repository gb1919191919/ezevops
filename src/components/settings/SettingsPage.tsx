'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLE_DEFINITIONS } from '@/lib/rbac';
import { INITIAL_PERMISSIONS } from '@/lib/store/mockData';
import { supabaseUrl } from '@/lib/supabase/client';
import { Role, Profile, PermissionKey } from '@/types';
import { formatPhone, cn } from '@/lib/utils';
import {
  Database,
  Shield,
  Key,
  Copy,
  Check,
  RefreshCw,
  Server,
  Users,
  Plus,
  Lock,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'database'>('users');
  const [copied, setCopied] = useState<string | null>(null);

  // New Staff Modal
  const [newStaffOpen, setNewStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('+91 ');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleIds, setStaffRoleIds] = useState<string[]>(['role-04']);

  // New Role Modal
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [roleCode, setRoleCode] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePermissions, setRolePermissions] = useState<PermissionKey[]>(['vehicle:view']);

  const customRoles = useAppStore((s) => s.customRoles);
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const addCustomRole = useAppStore((s) => s.addCustomRole);
  const updateRolePermissions = useAppStore((s) => s.updateRolePermissions);
  const addStaffProfile = useAppStore((s) => s.addStaffProfile);
  const resetToDefaultData = useAppStore((s) => s.resetToDefaultData);
  const { effectivePermissions } = useRBAC();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleResetData = () => {
    if (confirm('Reset application state back to default seed datasets?')) {
      resetToDefaultData();
      toast.success('Application state reset to default Indian seed data.');
    }
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffPhone.trim()) {
      toast.error('Staff name and phone number are required.');
      return;
    }

    const assignedRoles = customRoles.filter((r) => staffRoleIds.includes(r.id) || staffRoleIds.includes(r.code));

    addStaffProfile({
      full_name: staffName.trim(),
      phone: staffPhone.trim(),
      email: staffEmail.trim() || undefined,
      is_active: true,
      roles: assignedRoles,
      avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120`,
    });

    toast.success(`Registered staff profile for ${staffName.trim()}!`);
    setNewStaffOpen(false);
    setStaffName('');
    setStaffPhone('+91 ');
    setStaffEmail('');
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleLabel.trim() || !roleCode.trim()) {
      toast.error('Role label and code identifier are required.');
      return;
    }

    addCustomRole({
      code: roleCode.trim().toLowerCase().replace(/\s+/g, '_'),
      label: roleLabel.trim(),
      description: roleDesc.trim() || undefined,
      permissions: rolePermissions,
      is_system: false,
    });

    toast.success(`Custom role '${roleLabel.trim()}' created!`);
    setNewRoleOpen(false);
    setRoleCode('');
    setRoleLabel('');
    setRoleDesc('');
  };

  const togglePermissionForRole = (roleId: string, permKey: PermissionKey) => {
    const role = customRoles.find((r) => r.id === roleId);
    if (!role) return;

    const currentPerms = role.permissions || [];
    let updated: PermissionKey[];
    if (currentPerms.includes(permKey)) {
      updated = currentPerms.filter((p) => p !== permKey);
    } else {
      updated = [...currentPerms, permKey];
    }
    updateRolePermissions(roleId, updated);
    toast.success(`Updated permissions for ${role.label}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            System Governance & RBAC Administration
          </h2>
          <p className="text-xs text-zinc-400">
            Internal staff accounts, dynamic custom roles, granular permissions, and database sync
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Reset Local State</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800 gap-4 text-xs font-semibold text-zinc-400">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'py-3 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'users' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent hover:text-zinc-200'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staffProfiles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            'py-3 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'roles' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent hover:text-zinc-200'
          )}
        >
          <Shield className="w-4 h-4" />
          <span>Roles & Permissions Matrix ({customRoles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={cn(
            'py-3 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'database' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent hover:text-zinc-200'
          )}
        >
          <Database className="w-4 h-4" />
          <span>Database & Supabase Config</span>
        </button>
      </div>

      {/* Tab 1: Staff Directory */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Registered operational personnel across regional hubs.
            </p>
            <button
              onClick={() => setNewStaffOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-4">Staff Member</th>
                  <th className="p-3.5">Mobile Contact</th>
                  <th className="p-3.5">Assigned Roles</th>
                  <th className="p-3.5 text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {staffProfiles.map((staff) => (
                  <tr key={staff.id} className="hover:bg-zinc-800/40 transition">
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-zinc-100">{staff.full_name}</div>
                      {staff.email && <div className="text-[11px] text-zinc-500 font-mono">{staff.email}</div>}
                    </td>

                    <td className="p-3.5 font-mono text-zinc-200">
                      {formatPhone(staff.phone)}
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {staff.roles?.map((r) => (
                          <span
                            key={r.id}
                            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-emerald-400 font-bold"
                          >
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3.5 text-right pr-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Custom Roles & Permissions Matrix */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Configure dynamic custom roles and toggle granular permission entitlements.
            </p>
            <button
              onClick={() => setNewRoleOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Role</span>
            </button>
          </div>

          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-4">Permission Action</th>
                  {customRoles.map((role) => (
                    <th key={role.id} className="p-3.5 text-center font-mono">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {INITIAL_PERMISSIONS.map((perm) => (
                  <tr key={perm.id} className="hover:bg-zinc-900/50">
                    <td className="p-3.5 pl-4">
                      <div className="font-mono text-emerald-400 font-bold">{perm.code}</div>
                      <span className="text-[10px] text-zinc-500">{perm.description}</span>
                    </td>

                    {customRoles.map((role) => {
                      const hasPerm = (role.permissions || []).includes(perm.code);
                      return (
                        <td key={role.id} className="p-3.5 text-center">
                          <button
                            onClick={() => togglePermissionForRole(role.id, perm.code)}
                            className={cn(
                              'w-6 h-6 rounded-lg border inline-flex items-center justify-center transition',
                              hasPerm
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400'
                            )}
                          >
                            {hasPerm ? '✓' : '-'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Database & Supabase */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-zinc-100">Supabase Connection Parameters</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                Connected
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    Supabase URL
                  </span>
                  <p className="font-mono text-zinc-200 mt-0.5">{supabaseUrl}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(supabaseUrl, 'Supabase URL')}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition"
                >
                  {copied === 'Supabase URL' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    Publishable Anon Key
                  </span>
                  <p className="font-mono text-zinc-400 text-[11px] mt-0.5 truncate max-w-sm sm:max-w-md">
                    sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      'sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI',
                      'Publishable Key'
                    )
                  }
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition"
                >
                  {copied === 'Publishable Key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Staff Modal */}
      {newStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Add Staff Account</h3>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Mobile Number (+91)</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98801 12345"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="ramesh@ezev.in"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Assign Operational Roles</label>
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-zinc-900 border border-zinc-700 max-h-32 overflow-y-auto">
                  {customRoles.map((role) => {
                    const isSelected = staffRoleIds.includes(role.id) || staffRoleIds.includes(role.code);
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => {
                          if (isSelected) {
                            setStaffRoleIds(staffRoleIds.filter((id) => id !== role.id && id !== role.code));
                          } else {
                            setStaffRoleIds([...staffRoleIds, role.id]);
                          }
                        }}
                        className={cn(
                          'p-1.5 rounded-lg border text-left text-[11px] transition flex items-center justify-between',
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        )}
                      >
                        <span className="truncate">{role.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewStaffOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Role Modal */}
      {newRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Create Custom Role</h3>

            <form onSubmit={handleCreateRole} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regional Battery Auditor"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Role Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. battery_auditor"
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Role scope and responsibilities..."
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewRoleOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
