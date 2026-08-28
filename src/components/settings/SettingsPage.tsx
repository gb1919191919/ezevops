"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useRBAC } from "@/hooks/useRBAC";
import { INITIAL_PERMISSIONS } from "@/lib/store/initialData";
import { ROLE_DEFINITIONS } from "@/lib/rbac";
import { supabaseUrl } from "@/lib/supabase/client";
import { exportFullDatabaseBackup } from "@/lib/exportUtils";
import { Role, Profile, PermissionKey } from "@/types";
import { formatPhone, cn } from "@/lib/utils";
import {
  Database,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Server,
  Users,
  Plus,
  Lock,
  CheckCircle2,
  Edit2,
  Download,
  X,
  Search,
  CheckSquare,
  Square,
  Sliders,
  Filter,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "database">("users");
  const [copied, setCopied] = useState<string | null>(null);

  // Filter & Search state for Permission Matrix
  const [permSearch, setPermSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");

  // New Staff Modal
  const [newStaffOpen, setNewStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("+91 ");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRoleIds, setStaffRoleIds] = useState<string[]>(["role-04"]);

  // Edit Staff Modal (8.3)
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffPhone, setEditStaffPhone] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffRoleIds, setEditStaffRoleIds] = useState<string[]>([]);
  const [editStaffActive, setEditStaffActive] = useState(true);

  // New Role Modal
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [roleCode, setRoleCode] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [rolePermissions, setRolePermissions] = useState<PermissionKey[]>([
    "vehicle:view",
    "inspections:view",
    "job:view",
    "inventory:view",
    "shift_logs:view",
    "channels:view",
  ]);

  const customRoles = useAppStore((s) => s.customRoles || []);
  const staffProfiles = useAppStore((s) => s.staffProfiles || []);
  const addCustomRole = useAppStore((s) => s.addCustomRole);
  const updateRolePermissions = useAppStore((s) => s.updateRolePermissions);
  const addStaffProfile = useAppStore((s) => s.addStaffProfile);
  const updateStaffProfile = useAppStore((s) => s.updateStaffProfile);
  const resetToDefaultData = useAppStore((s) => s.resetToDefaultData);
  const { isOwner } = useRBAC();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleResetData = () => {
    if (confirm("Reset application state back to default seed datasets?")) {
      resetToDefaultData();
      toast.success("Application state reset to default Indian seed data.");
    }
  };

  // Distinct modules for permissions filtering
  const distinctModules = useMemo(() => {
    const modules = new Set<string>();
    INITIAL_PERMISSIONS.forEach((p) => p?.module && modules.add(p.module));
    return Array.from(modules);
  }, []);

  // Filtered permissions list
  const filteredPermissions = useMemo(() => {
    return INITIAL_PERMISSIONS.filter((perm) => {
      if (selectedModule !== "ALL" && perm.module !== selectedModule) {
        return false;
      }
      if (permSearch.trim()) {
        const q = permSearch.toLowerCase();
        return (
          (perm.code || '').toLowerCase().includes(q) ||
          (perm.label && perm.label.toLowerCase().includes(q)) ||
          (perm.description && perm.description.toLowerCase().includes(q)) ||
          (perm.module || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedModule, permSearch]);

  // Group filtered permissions by module
  const permissionsByModule = useMemo(() => {
    const map = new Map<string, typeof INITIAL_PERMISSIONS>();
    filteredPermissions.forEach((perm) => {
      const existing = map.get(perm.module) || [];
      existing.push(perm);
      map.set(perm.module, existing);
    });
    return map;
  }, [filteredPermissions]);

  if (!isOwner) {
    return (
      <div className="p-8 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Super Admin Access Restricted</h2>
          <p className="text-xs text-zinc-400 mt-1">
            System configuration, database credentials, and staff role governance are restricted to Super Admin (Owner) accounts.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffPhone.trim()) {
      toast.error("Staff name and phone number are required.");
      return;
    }

    const assignedRoles = customRoles.filter((r) => staffRoleIds.includes(r.id) || staffRoleIds.includes(r.code));

    addStaffProfile({
      full_name: staffName.trim(),
      phone: staffPhone.trim(),
      email: staffEmail.trim() || undefined,
      is_active: true,
      roles: assignedRoles,
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120",
    });

    toast.success(`Registered staff profile for ${staffName.trim()}!`);
    setNewStaffOpen(false);
    setStaffName("");
    setStaffPhone("+91 ");
    setStaffEmail("");
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleLabel.trim() || !roleCode.trim()) {
      toast.error("Role label and code identifier are required.");
      return;
    }

    addCustomRole({
      code: roleCode.trim().toLowerCase().replace(/\s+/g, "_"),
      label: roleLabel.trim(),
      description: roleDesc.trim() || undefined,
      permissions: rolePermissions,
      is_system: false,
    });

    toast.success(`Custom role '${roleLabel.trim()}' created!`);
    setNewRoleOpen(false);
    setRoleCode("");
    setRoleLabel("");
    setRoleDesc("");
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
    toast.success(`Updated ${permKey} for ${role.label}`);
  };

  // Toggle all permissions in a specific module for a role
  const toggleModulePermissionsForRole = (roleId: string, moduleName: string, grant: boolean) => {
    const role = customRoles.find((r) => r.id === roleId);
    if (!role) return;

    const modulePermKeys = INITIAL_PERMISSIONS.filter((p) => p.module === moduleName).map((p) => p.code);
    const currentPerms = new Set(role.permissions || []);

    if (grant) {
      modulePermKeys.forEach((k) => currentPerms.add(k));
    } else {
      modulePermKeys.forEach((k) => currentPerms.delete(k));
    }

    updateRolePermissions(roleId, Array.from(currentPerms));
    toast.success(`${grant ? "Granted" : "Revoked"} all ${moduleName} permissions for ${role.label}`);
  };

  // Toggle all permissions for a role
  const toggleAllForRole = (roleId: string, grant: boolean) => {
    const role = customRoles.find((r) => r.id === roleId);
    if (!role) return;

    const allKeys = INITIAL_PERMISSIONS.map((p) => p.code);
    updateRolePermissions(roleId, grant ? allKeys : []);
    toast.success(`${grant ? "Granted all" : "Cleared all"} permissions for ${role.label}`);
  };

  // Apply Role Template in New Role Modal
  const applyRolePreset = (presetKey: "manager" | "rsa" | "mechanic" | "all" | "none") => {
    if (presetKey === "all") {
      setRolePermissions(INITIAL_PERMISSIONS.map((p) => p.code));
      toast.success("Applied All System Permissions");
    } else if (presetKey === "none") {
      setRolePermissions([]);
      toast.success("Cleared permissions");
    } else if (ROLE_DEFINITIONS[presetKey]) {
      setRolePermissions([...ROLE_DEFINITIONS[presetKey].permissions]);
      toast.success(`Cloned from ${ROLE_DEFINITIONS[presetKey].label}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            System Governance & RBAC Administration
          </h2>
          <p className="text-xs text-zinc-400">
            Internal staff accounts, dynamic custom roles, granular permissions matrix, and database parameters
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
          onClick={() => setActiveTab("users")}
          className={cn(
            "py-3 border-b-2 transition flex items-center gap-1.5",
            activeTab === "users" ? "border-emerald-500 text-emerald-400 font-bold" : "border-transparent hover:text-zinc-200"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staffProfiles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={cn(
            "py-3 border-b-2 transition flex items-center gap-1.5",
            activeTab === "roles" ? "border-emerald-500 text-emerald-400 font-bold" : "border-transparent hover:text-zinc-200"
          )}
        >
          <Shield className="w-4 h-4" />
          <span>Roles & Granular Permissions Matrix ({customRoles.length} Roles, {INITIAL_PERMISSIONS.length} Permissions)</span>
        </button>
        <button
          onClick={() => setActiveTab("database")}
          className={cn(
            "py-3 border-b-2 transition flex items-center gap-1.5",
            activeTab === "database" ? "border-emerald-500 text-emerald-400 font-bold" : "border-transparent hover:text-zinc-200"
          )}
        >
          <Database className="w-4 h-4" />
          <span>Database & Supabase Config</span>
        </button>
      </div>

      {/* Tab 1: Staff Directory */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Registered operational personnel across regional hubs.
            </p>
            <button
              onClick={() => setNewStaffOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition flex items-center gap-1 shadow-sm"
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
                  <th className="p-3.5 text-right pr-4">Status & Actions</th>
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

                    <td className="p-3.5 text-right pr-4 space-x-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full font-bold text-[10px]",
                        staff.is_active !== false ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                      )}>
                        {staff.is_active !== false ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingStaff(staff);
                          setEditStaffName(staff.full_name);
                          setEditStaffPhone(staff.phone);
                          setEditStaffEmail(staff.email || "");
                          setEditStaffRoleIds(staff.roles?.map((r) => r.id) || []);
                          setEditStaffActive(staff.is_active !== false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition inline-flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Edit2 className="w-3 h-3 text-blue-400" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Custom Roles & Granular Permissions Matrix */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {/* Action Bar & Module Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter permissions by keyword..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 w-64"
                />
              </div>

              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Modules ({INITIAL_PERMISSIONS.length})</option>
                {distinctModules.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setNewRoleOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Role</span>
            </button>
          </div>

          {/* Granular Permission Matrix Table */}
          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-3.5 pl-4 min-w-[280px]">Operational Capability & Scope</th>
                  {customRoles.map((role) => {
                    const count = (role.permissions || []).length;
                    return (
                      <th key={role.id} className="p-3.5 text-center font-mono min-w-[140px]">
                        <div className="font-bold text-zinc-200">{role.label}</div>
                        <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                          {count} / {INITIAL_PERMISSIONS.length} perms
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAllForRole(role.id, true)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold"
                            title="Grant all permissions to this role"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAllForRole(role.id, false)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold"
                            title="Revoke all permissions from this role"
                          >
                            Clear
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {Array.from(permissionsByModule.entries()).map(([moduleName, perms]) => (
                  <React.Fragment key={moduleName}>
                    {/* Module Section Header */}
                    <tr className="bg-zinc-900/80 border-t border-b border-zinc-800">
                      <td colSpan={customRoles.length + 1} className="py-2.5 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-extrabold text-zinc-200 text-xs uppercase tracking-wider">
                              {moduleName}
                            </span>
                            <span className="px-2 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                              {perms.length} actions
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]">
                            {customRoles.map((role) => (
                              <div key={role.id} className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleModulePermissionsForRole(role.id, moduleName, true)}
                                  className="text-[10px] text-emerald-400 hover:underline font-mono"
                                  title={`Grant all ${moduleName} to ${role.label}`}
                                >
                                  +All
                                </button>
                                <span className="text-zinc-600">/</span>
                                <button
                                  type="button"
                                  onClick={() => toggleModulePermissionsForRole(role.id, moduleName, false)}
                                  className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
                                  title={`Revoke all ${moduleName} from ${role.label}`}
                                >
                                  -None
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Permissions within this Module */}
                    {perms.map((perm) => (
                      <tr key={perm.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-bold text-[11px]">{perm.code}</span>
                            {perm.label && (
                              <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300">
                                {perm.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{perm.description}</p>
                        </td>

                        {customRoles.map((role) => {
                          const hasPerm = (role.permissions || []).includes(perm.code);
                          return (
                            <td key={role.id} className="p-3 text-center">
                              <button
                                onClick={() => togglePermissionForRole(role.id, perm.code)}
                                className={cn(
                                  "w-7 h-7 rounded-lg border inline-flex items-center justify-center transition text-xs font-bold",
                                  hasPerm
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-700 hover:text-zinc-400 hover:border-zinc-700"
                                )}
                                title={`Toggle ${perm.code} for ${role.label}`}
                              >
                                {hasPerm ? "✓" : "—"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Database & Supabase */}
      {activeTab === "database" && (
        <div className="space-y-5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    Supabase URL
                  </span>
                  <p className="font-mono text-zinc-200 mt-0.5 truncate">{supabaseUrl}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(supabaseUrl, "Supabase URL")}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition shrink-0"
                >
                  {copied === "Supabase URL" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    Publishable Key
                  </span>
                  <p className="font-mono text-zinc-400 text-[11px] mt-0.5 truncate">
                    sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      "sb_publishable_Zmbxm8Vjiqz8Zji9o_Jp8A_r6tqTlDI",
                      "Publishable Key"
                    )
                  }
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition shrink-0"
                >
                  {copied === "Publishable Key" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    Service Role Secret
                  </span>
                  <p className="font-mono text-emerald-400 text-[11px] mt-0.5 truncate">
                    Configured securely on server (Hidden)
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    JWKS URL
                  </span>
                  <p className="font-mono text-zinc-400 text-[11px] mt-0.5 truncate">
                    https://yliozdsnqnfjkpcuctwe.supabase.co/auth/v1/.well-known/jwks.json
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      "https://yliozdsnqnfjkpcuctwe.supabase.co/auth/v1/.well-known/jwks.json",
                      "JWKS URL"
                    )
                  }
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition shrink-0"
                >
                  {copied === "JWKS URL" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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
                          "p-1.5 rounded-lg border text-left text-[11px] transition flex items-center justify-between",
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400"
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

      {/* New Role Modal with Granular Presets */}
      {newRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Create Custom Role with Granular Permissions</span>
              </h3>
              <button onClick={() => setNewRoleOpen(false)} className="text-zinc-500 hover:text-zinc-300 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Role Name *</label>
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
                <label className="text-zinc-400 font-semibold">Role Code Identifier *</label>
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
                  placeholder="Role scope and operational responsibilities..."
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Template Presets */}
              <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Permission Presets:</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {rolePermissions.length} / {INITIAL_PERMISSIONS.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => applyRolePreset("manager")}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition"
                  >
                    Preset: Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset("rsa")}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition"
                  >
                    Preset: RSA
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset("mechanic")}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition"
                  >
                    Preset: Mechanic
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset("all")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-bold transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset("none")}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[11px] transition"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div className="space-y-1.5">
                <span className="text-zinc-400 font-semibold">Configure Granular Capabilities:</span>
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800 pr-1">
                  {INITIAL_PERMISSIONS.map((perm) => {
                    const isChecked = rolePermissions.includes(perm.code);
                    return (
                      <label
                        key={perm.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition",
                          isChecked
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400"
                        )}
                      >
                        <div>
                          <div className="font-semibold">{perm.label || perm.code}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{perm.code} • {perm.module}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRolePermissions((prev) => [...prev, perm.code]);
                            } else {
                              setRolePermissions((prev) => prev.filter((p) => p !== perm.code));
                            }
                          }}
                          className="rounded text-emerald-500 shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
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

      {/* Edit Staff Modal (8.3) */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Edit Staff Profile</span>
              </h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editStaffName.trim() || !editStaffPhone.trim()) {
                  toast.error("Name and mobile number are required.");
                  return;
                }
                const assignedRoles = customRoles.filter(
                  (r) => editStaffRoleIds.includes(r.id) || editStaffRoleIds.includes(r.code)
                );
                updateStaffProfile(editingStaff.id, {
                  full_name: editStaffName.trim(),
                  phone: editStaffPhone.trim(),
                  email: editStaffEmail.trim() || undefined,
                  roles: assignedRoles,
                  is_active: editStaffActive,
                });
                toast.success(`Updated staff profile for ${editStaffName}!`);
                setEditingStaff(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Mobile Number</label>
                <input
                  type="text"
                  required
                  value={editStaffPhone}
                  onChange={(e) => setEditStaffPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Account Status</label>
                <div className="flex items-center gap-4 p-2 rounded-xl bg-zinc-900 border border-zinc-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="accountStatus"
                      checked={editStaffActive}
                      onChange={() => setEditStaffActive(true)}
                    />
                    <span className="text-emerald-400 font-bold">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="accountStatus"
                      checked={!editStaffActive}
                      onChange={() => setEditStaffActive(false)}
                    />
                    <span className="text-zinc-400">Suspended / Inactive</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Assigned Operational Roles</label>
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-zinc-900 border border-zinc-700 max-h-36 overflow-y-auto">
                  {customRoles.map((role) => {
                    const isSelected = editStaffRoleIds.includes(role.id) || editStaffRoleIds.includes(role.code);
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => {
                          if (isSelected) {
                            setEditStaffRoleIds(editStaffRoleIds.filter((id) => id !== role.id && id !== role.code));
                          } else {
                            setEditStaffRoleIds([...editStaffRoleIds, role.id]);
                          }
                        }}
                        className={cn(
                          "p-2 rounded-lg border text-left text-[11px] transition flex items-center justify-between",
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400"
                        )}
                      >
                        <span className="truncate">{role.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
