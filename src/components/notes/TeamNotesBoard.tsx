'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { TeamNote, NoteCategory, NoteStatus } from '@/types';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import {
  StickyNote,
  Plus,
  Pin,
  PinOff,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  User,
  Building2,
  AlertTriangle,
  Sparkles,
  X,
  Tag,
  CheckCircle2,
  Archive,
  RotateCcw,
  Flame,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export function TeamNotesBoard() {
  const [activeTab, setActiveTab] = useState<NoteStatus>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [hubFilter, setHubFilter] = useState<string>('ALL');

  // Modal State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('GENERAL');
  const [notePriority, setNotePriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [noteHubId, setNoteHubId] = useState<string>('');
  const [noteTagsInput, setNoteTagsInput] = useState('');
  const [noteIsPinned, setNoteIsPinned] = useState(false);

  const teamNotes = useAppStore((s) => s.teamNotes);
  const hubs = useAppStore((s) => s.hubs);
  const createNote = useAppStore((s) => s.createNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const archiveNote = useAppStore((s) => s.archiveNote);
  const resolveNote = useAppStore((s) => s.resolveNote);
  const restoreNote = useAppStore((s) => s.restoreNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const bulkDisposeOldNotes = useAppStore((s) => s.bulkDisposeOldNotes);
  const togglePinNote = useAppStore((s) => s.togglePinNote);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const filteredNotes = teamNotes.filter((n) => {
    const noteStatus = n.status || 'ACTIVE';
    if (noteStatus !== activeTab) return false;
    if (categoryFilter !== 'ALL' && n.category !== categoryFilter) return false;
    if (hubFilter !== 'ALL' && n.hub_id !== hubFilter) return false;
    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.author_name.toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const regularNotes = filteredNotes.filter((n) => !n.is_pinned);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('GENERAL');
    setNotePriority('NORMAL');
    setNoteHubId('');
    setNoteTagsInput('');
    setNoteIsPinned(false);
    setNoteModalOpen(true);
  };

  const handleOpenEdit = (n: TeamNote) => {
    setIsEditing(true);
    setSelectedNoteId(n.id);
    setNoteTitle(n.title);
    setNoteContent(n.content);
    setNoteCategory(n.category);
    setNotePriority(n.priority || 'NORMAL');
    setNoteHubId(n.hub_id || '');
    setNoteTagsInput((n.tags || []).join(', '));
    setNoteIsPinned(n.is_pinned);
    setNoteModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) {
      toast.error('Please enter note title or content');
      return;
    }

    const parsedTags = noteTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing && selectedNoteId) {
      updateNote(selectedNoteId, {
        title: noteTitle.trim() || 'Team Operational Note',
        content: noteContent.trim(),
        category: noteCategory,
        priority: notePriority,
        hub_id: noteHubId || null,
        tags: parsedTags,
        is_pinned: noteIsPinned,
      });
      toast.success('Note updated');
    } else {
      createNote({
        title: noteTitle.trim() || 'Team Operational Note',
        content: noteContent.trim(),
        category: noteCategory,
        priority: notePriority,
        hub_id: noteHubId || null,
        tags: parsedTags,
        is_pinned: noteIsPinned,
      });
      toast.success('Quick note posted to scratchpad');
    }

    setNoteModalOpen(false);
  };

  const handleResolveNote = (id: string) => {
    resolveNote(id);
    toast.success('Note marked as Done & Resolved (Moved from Active Scratchpad)');
  };

  const handleArchiveNote = (id: string) => {
    archiveNote(id);
    toast.info('Note archived');
  };

  const handleRestoreNote = (id: string) => {
    restoreNote(id);
    toast.success('Note restored back to Active Scratchpad');
  };

  const handleBulkDispose = () => {
    bulkDisposeOldNotes();
    toast.success('Purged old resolved & archived notes. Scratchpad is clean!');
  };

  const activeCount = teamNotes.filter((n) => (n.status || 'ACTIVE') === 'ACTIVE').length;
  const resolvedCount = teamNotes.filter((n) => n.status === 'RESOLVED').length;
  const archivedCount = teamNotes.filter((n) => n.status === 'ARCHIVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-blue-400" />
            Team Notes & Scratchpad (Structured Disposal Lifecycle)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time shift handover, urgent notices, rough scratchpad with 1-click archiving and clutter disposal
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(isOwner || isManager) && (
            <button
              onClick={handleBulkDispose}
              className="px-3 py-2 rounded-xl bg-[#141416] hover:bg-rose-500/10 border border-[#2a2a2f] hover:border-rose-500/30 text-rose-400 font-semibold text-xs transition flex items-center gap-1.5"
              title="Purge all resolved and archived notes in 1 click"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Dispose Old</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quick Note</span>
          </button>
        </div>
      </div>

      {/* Lifecycle Navigation Tabs */}
      <div className="flex items-center border-b border-[#2a2a2f] gap-4 text-xs font-semibold text-zinc-400">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={cn(
            'py-2.5 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'ACTIVE'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent hover:text-zinc-200'
          )}
        >
          <Flame className="w-4 h-4" />
          <span>Active Scratchpad ({activeCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('RESOLVED')}
          className={cn(
            'py-2.5 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'RESOLVED'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent hover:text-zinc-200'
          )}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Resolved & Done ({resolvedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={cn(
            'py-2.5 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'ARCHIVED'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent hover:text-zinc-200'
          )}
        >
          <Archive className="w-4 h-4 text-zinc-400" />
          <span>Archived Disposed ({archivedCount})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search notes by keyword, author, tag, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="SHIFT_HANDOVER">Shift Handover</option>
            <option value="URGENT">Urgent Notice</option>
            <option value="HUB_NOTICE">Hub Notice</option>
            <option value="MECHANICAL">Mechanical & Spares</option>
            <option value="GENERAL">General</option>
            <option value="ROUGH">Rough / Scratch</option>
          </select>

          <select
            value={hubFilter}
            onChange={(e) => setHubFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Hubs</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pinned Notes Grid */}
      {activeTab === 'ACTIVE' && pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 px-1">
            <Pin className="w-3.5 h-3.5 fill-amber-400" />
            <span>Pinned Priority Notes ({pinnedNotes.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                hubs={hubs}
                onEdit={() => handleOpenEdit(note)}
                onTogglePin={() => togglePinNote(note.id)}
                onResolve={() => handleResolveNote(note.id)}
                onArchive={() => handleArchiveNote(note.id)}
                onRestore={() => handleRestoreNote(note.id)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Notes Grid */}
      <div className="space-y-2">
        {activeTab === 'ACTIVE' && pinnedNotes.length > 0 && regularNotes.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1 pt-2">
            <StickyNote className="w-3.5 h-3.5" />
            <span>Standard Scratchpad Notes ({regularNotes.length})</span>
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs border border-dashed border-[#2a2a2f] rounded-2xl bg-[#1e1e22]/30">
            {activeTab === 'ACTIVE'
              ? 'No active scratch notes right now. Your scratchpad is clean!'
              : activeTab === 'RESOLVED'
              ? 'No resolved notes logged in history.'
              : 'No archived notes.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeTab === 'ACTIVE' ? regularNotes : filteredNotes).map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                hubs={hubs}
                onEdit={() => handleOpenEdit(note)}
                onTogglePin={() => togglePinNote(note.id)}
                onResolve={() => handleResolveNote(note.id)}
                onArchive={() => handleArchiveNote(note.id)}
                onRestore={() => handleRestoreNote(note.id)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Note Modal */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-blue-400" />
                <span>{isEditing ? 'Edit Team Note' : 'Create Quick Scratchpad Note'}</span>
              </h3>
              <button
                onClick={() => setNoteModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Note Title / Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Della Hub - Late Night Battery Drop Check"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Category</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as NoteCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="SHIFT_HANDOVER">Shift Handover</option>
                    <option value="URGENT">Urgent Notice</option>
                    <option value="HUB_NOTICE">Hub Notice</option>
                    <option value="MECHANICAL">Mechanical</option>
                    <option value="GENERAL">General</option>
                    <option value="ROUGH">Rough / Scratch</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Priority</label>
                  <select
                    value={notePriority}
                    onChange={(e) => setNotePriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent / Critical</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Hub Tag (Optional)</label>
                  <select
                    value={noteHubId}
                    onChange={(e) => setNoteHubId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Fleet-Wide</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Electrical, Rain, Inspection"
                  value={noteTagsInput}
                  onChange={(e) => setNoteTagsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Note Content / Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write clear instructions, observations, or reminders for the shift team..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={noteIsPinned}
                  onChange={(e) => setNoteIsPinned(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0"
                />
                <label htmlFor="pinCheck" className="text-zinc-300 font-medium cursor-pointer">
                  Pin to top of board for entire team
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setNoteModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  {isEditing ? 'Update Note' : 'Post Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Individual Note Card
function NoteCard({
  note,
  hubs,
  onEdit,
  onTogglePin,
  onResolve,
  onArchive,
  onRestore,
  onDelete,
}: {
  note: TeamNote;
  hubs: any[];
  onEdit: () => void;
  onTogglePin: () => void;
  onResolve: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const hub = hubs.find((h) => h.id === note.hub_id);
  const isResolved = note.status === 'RESOLVED';
  const isArchived = note.status === 'ARCHIVED';

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border transition relative flex flex-col justify-between group shadow-sm',
        note.is_pinned
          ? 'bg-[#1e1e22] border-amber-500/40 shadow-amber-500/5'
          : 'bg-[#1e1e22] border-[#2a2a2f] hover:border-zinc-700'
      )}
    >
      <div className="space-y-2.5">
        {/* Top Meta row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase border font-mono',
                note.category === 'URGENT'
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : note.category === 'SHIFT_HANDOVER'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
              )}
            >
              {note.category.replace('_', ' ')}
            </span>

            {note.priority === 'URGENT' && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-bold uppercase">
                URGENT
              </span>
            )}

            {hub && (
              <span className="text-[10px] text-zinc-400 font-medium">
                📍 {hub.name.split(' (')[0]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isResolved && !isArchived && (
              <button
                onClick={onTogglePin}
                className={cn(
                  'p-1 rounded-lg transition',
                  note.is_pinned
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
                )}
                title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
              >
                {note.is_pinned ? <Pin className="w-3.5 h-3.5 fill-amber-400" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={onEdit}
              className="p-1 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition rounded-lg"
              title="Edit note"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="font-bold text-xs text-zinc-100 line-clamp-2 leading-snug">
          {note.title}
        </h4>

        {/* Content */}
        <p className="text-xs text-zinc-300 whitespace-pre-wrap line-clamp-4 leading-relaxed font-sans">
          {note.content}
        </p>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-1">
            {note.tags.map((t, idx) => (
              <span key={idx} className="text-[10px] text-zinc-400 bg-[#141416] px-1.5 py-0.5 rounded border border-[#2a2a2f]">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & 1-Click Disposal Actions */}
      <div className="pt-3 mt-3 border-t border-[#27272a] flex items-center justify-between text-[10px] text-zinc-400">
        <div>
          <div className="font-semibold text-zinc-200">{note.author_name}</div>
          <span className="text-zinc-500">{formatRelativeTime(note.created_at)}</span>
        </div>

        {/* Action buttons depending on status */}
        <div className="flex items-center gap-1.5">
          {!isResolved && !isArchived && (
            <>
              <button
                onClick={onResolve}
                className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1"
                title="Mark Done & Remove from Active Scratchpad"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Resolve</span>
              </button>

              <button
                onClick={onArchive}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg transition"
                title="Archive Note"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {(isResolved || isArchived) && (
            <>
              <button
                onClick={onRestore}
                className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[10px] font-bold transition flex items-center gap-1"
                title="Restore back to active scratchpad"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore</span>
              </button>

              <button
                onClick={onDelete}
                className="p-1 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                title="Permanently Delete Note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
