'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/appStore';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Profile } from '@/types';
import { ChevronDown, Check, UserCheck, Shield, LogIn, LogOut, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function UserProfileSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUser = useAppStore((s) => s.currentUser);
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setActiveRoles = useAppStore((s) => s.setActiveRoles);
  const { signOut } = useSupabaseAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStaff = (profile: Profile) => {
    setCurrentUser(profile);
    const roleCodes = profile.roles?.map((r) => r.code) || ['manager'];
    setActiveRoles(roleCodes);
    setIsOpen(false);
    toast.success(`Active staff: ${profile.full_name}`, {
      description: `${profile.email || 'No email'} (${profile.roles?.map((r) => r.label).join(', ') || 'Staff'})`,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const primaryRole = currentUser.roles?.[0]?.label || 'Operations Staff';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-[#1e1e22] border border-[#2a2a2f] hover:border-zinc-600 transition group"
        title="Active Operator Profile & Auth"
      >
        <div className="relative">
          <img
            src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
            alt={currentUser.full_name}
            className="w-7 h-7 rounded-lg object-cover ring-1 ring-zinc-700"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-zinc-950" />
        </div>

        <div className="hidden xl:flex flex-col text-left">
          <span className="text-xs font-bold text-zinc-200 leading-tight group-hover:text-white transition">
            {currentUser.full_name}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono leading-none mt-0.5">
            {currentUser.email || primaryRole}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="px-2.5 py-2 border-b border-[#27272a] mb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                Operator Account & Role
              </span>
              <span className="text-[11px] text-zinc-400">
                Logged in as <strong className="text-zinc-200">{currentUser.email || currentUser.full_name}</strong>
              </span>
            </div>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>

          {/* Quick Staff Switch List */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {staffProfiles.map((profile) => {
              const isSelected = profile.id === currentUser.id;
              const roleTitle = profile.roles?.map((r) => r.label).join(', ') || 'Staff';

              return (
                <button
                  key={profile.id}
                  onClick={() => handleSelectStaff(profile)}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-xl text-xs transition text-left',
                    isSelected
                      ? 'bg-blue-500/15 text-blue-200 font-medium border border-blue-500/30'
                      : 'text-zinc-300 hover:bg-[#141416] border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-zinc-700 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate text-zinc-100">
                        {profile.full_name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">
                        {profile.email} • {roleTitle}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Sign In / Sign Out */}
          <div className="mt-2 pt-2 border-t border-[#27272a] flex items-center justify-between text-xs">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 font-medium transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Email Auth Login</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
