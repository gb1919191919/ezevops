'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { StickyNote, X, Plus, Sparkles, Check, Tag, Building2 } from 'lucide-react';
import { NoteCategory } from '@/types';
import { toast } from 'sonner';

export function QuickNoteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('GENERAL');
  const [isPinned, setIsPinned] = useState(false);
  const hubs = useAppStore((s) => s.hubs);
  const activeHubId = useAppStore((s) => s.activeHubId);
  const [selectedHub, setSelectedHub] = useState<string>(activeHubId === 'ALL' ? '' : activeHubId);
  const createNote = useAppStore((s) => s.createNote);
  const currentUser = useAppStore((s) => s.currentUser);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) {
      toast.error('Please enter note title or content');
      return;
    }

    createNote({
      title: title.trim() || 'Quick Operational Note',
      content: content.trim(),
      category,
      hub_id: selectedHub || undefined,
      is_pinned: isPinned,
    });

    toast.success('Note Captured & Saved', {
      description: `Logged by ${currentUser?.full_name || 'Staff Member'}`,
    });

    setTitle('');
    setContent('');
    setIsPinned(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Quick Note & Scratchpad</h3>
              <p className="text-[10px] text-zinc-400 font-mono">1-Click Operational Dispatch & Logs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Note Title / Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Battery pack #42 high temperature / RSA dispatched..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#4b6bfb] transition font-medium"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 focus:outline-none focus:border-[#4b6bfb]"
              >
                <option value="GENERAL">General Memo</option>
                <option value="SHIFT_HANDOVER">Shift Handover</option>
                <option value="URGENT">Urgent / Alert</option>
                <option value="HUB_NOTICE">Hub Notice</option>
                <option value="MECHANICAL">Mechanical / Spares</option>
                <option value="ROUGH">Rough Note</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Linked Hub (Optional)
              </label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 focus:outline-none focus:border-[#4b6bfb]"
              >
                <option value="">All Hubs (Global)</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name?.split(' (')?.[0] || h.name || h.code || 'Hub'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Details & Action Notes
            </label>
            <textarea
              rows={4}
              placeholder="Type checklist items, technician observations, vehicle IMEI, or customer details..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#4b6bfb] transition font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinNoteCheck"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
            />
            <label htmlFor="pinNoteCheck" className="text-xs text-zinc-300 cursor-pointer">
              Pin this note to the top of the Team Notes board
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#27272a] flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-mono">
              Author: {currentUser?.full_name || 'Staff User'} ({currentUser?.roles?.[0]?.label || 'Staff'})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
