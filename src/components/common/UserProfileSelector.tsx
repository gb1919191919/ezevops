'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/lib/store/appStore';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { ChevronDown, LogOut, CheckCircle2 } from 'lucide-react';

export function UserProfileSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUser = useAppStore((s) => s.currentUser);
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

  if (!currentUser) {
    return null;
  }

  const primaryRole = currentUser.roles?.[0]?.label || 'Operations Staff';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-[#1e1e22] border border-[#2a2a2f] hover:border-zinc-600 transition group"
        title="Authenticated Operator Account"
      >
        <div className="relative">
          <Image
            src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
            alt={currentUser.full_name}
            width={28}
            height={28}
            unoptimized
            className="w-7 h-7 rounded-lg object-cover ring-1 ring-zinc-700"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
        </div>

        <div className="hidden xl:flex flex-col text-left">
          <span className="text-xs font-bold text-zinc-200 leading-tight group-hover:text-white transition">
            {currentUser.full_name}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono leading-none mt-0.5 truncate max-w-[140px]">
            {currentUser.email || primaryRole}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#1c1c1f] border border-[#2a2a2f] shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 space-y-3">
          {/* User Details */}
          <div className="flex items-start gap-3 pb-3 border-b border-[#27272a]">
            <Image
              src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
              alt={currentUser.full_name}
              width={40}
              height={40}
              unoptimized
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-100 truncate">{currentUser.full_name}</h4>
              <p className="text-[11px] text-zinc-400 font-mono truncate">{currentUser.email}</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified Supabase Session</span>
              </div>
            </div>
          </div>

          {/* Assigned Roles */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Assigned Permissions & Roles
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentUser.roles?.map((role) => (
                <span
                  key={role.id}
                  className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold font-mono"
                >
                  {role.label}
                </span>
              )) || (
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px]">
                  Operations Staff
                </span>
              )}
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="pt-2 border-t border-[#27272a]">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
