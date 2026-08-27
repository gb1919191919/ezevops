'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { useAppStore } from '@/lib/store/appStore';
import { RoleCode } from '@/types';
import { Shield, ChevronDown, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function RoleSwitcher() {
  const { activeRoles, toggleRole, setActiveRoles } = useRBAC();
  const customRoles = useAppStore((s) => s.customRoles);
  const currentUser = useAppStore((s) => s.currentUser);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if current user is an Owner / Super Admin
  const isActualOwner =
    Boolean(currentUser?.roles?.some((r) => r.code === 'owner')) ||
    currentUser?.email === 'bhuvnesh3568@gmail.com' ||
    currentUser?.email === 'bhuvnesh@ezev.in';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleToggle = (code: RoleCode) => {
    if (!isActualOwner) {
      toast.error('Permission Denied', {
        description: 'Only Super Admins (Owners) can switch active role previews.',
      });
      return;
    }
    toggleRole(code);
    toast.info(`Toggled ${code.toUpperCase()} role preview`);
  };

  // If user is not an owner, render a locked badge
  if (!isActualOwner) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-500 cursor-not-allowed" title="Role switching is restricted to Super Admin (Owner)">
        <Lock className="w-3 h-3 text-zinc-500" />
        <span className="capitalize font-mono text-[11px] text-zinc-400">
          {currentUser?.roles?.[0]?.label || 'Staff'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] border border-[#2a2a2f] hover:border-zinc-600 text-xs font-semibold text-zinc-200 transition"
        title="Super Admin: Switch role preview to test permissions"
      >
        <Shield className="w-3.5 h-3.5 text-blue-400" />
        <span className="capitalize text-xs">
          {activeRoles.length === 1 ? activeRoles[0] : `${activeRoles.length} Active Roles`}
        </span>
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1.5 border-b border-[#27272a] mb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                Owner Role Preview Switcher
              </span>
              <span className="text-[11px] text-zinc-400">
                Test UI and permissions as other team roles
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-[9px] font-bold border border-blue-500/20">
              OWNER ONLY
            </span>
          </div>

          <div className="space-y-1">
            {customRoles.map((role) => {
              const isSelected = activeRoles.includes(role.code) || activeRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleToggle(role.code)}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-xl text-xs transition text-left',
                    isSelected
                      ? 'bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141416]'
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs truncate text-zinc-100">{role.label}</div>
                    {role.description && (
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">{role.description}</div>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-[#27272a] flex items-center justify-between text-[10px]">
            <button
              onClick={() => {
                setActiveRoles(['owner']);
                toast.success('Reset to Super Admin (Owner)');
              }}
              className="text-zinc-400 hover:text-blue-400 transition font-medium"
            >
              Reset to Owner
            </button>

            <button
              onClick={() => {
                setActiveRoles(['manager', 'rsa']);
                toast.success('Switched to Dual: Manager + RSA');
              }}
              className="text-zinc-400 hover:text-blue-400 transition font-medium"
            >
              Set Dual Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
