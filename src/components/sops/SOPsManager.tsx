'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { SOP, SOPRevision, SOPStatus, RoleCode } from '@/types';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  History,
  Shield,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Users,
  Lock,
  Printer, Archive, RotateCcw,
  ChevronRight,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function SOPsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'history' | 'access'>('content');

  // Create / Edit Modal State
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Operations');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAccessRoles, setFormAccessRoles] = useState<string[]>(['owner', 'manager', 'rsa', 'mechanic']);
  const [formChangeSummary, setFormChangeSummary] = useState('');

  const sops = useAppStore((s) => s.sops || []);
  const createSOP = useAppStore((s) => s.createSOP);
  const updateSOP = useAppStore((s) => s.updateSOP);
  const publishSOP = useAppStore((s) => s.publishSOP);
  const acknowledgeSOP = useAppStore((s) => s.acknowledgeSOP);
  const archiveSOP = useAppStore((s) => s.archiveSOP);
  const restoreSOP = useAppStore((s) => s.restoreSOP);
  const currentUser = useAppStore((s) => s.currentUser);
  const customRoles = useAppStore((s) => s.customRoles || []);
  const { isOwner, isManager, activeRoles } = useRBAC();

  const categories = Array.from(new Set(sops.map((s) => s?.category).filter(Boolean)));

  const filteredSOPs = sops.filter((s) => {
    // Non-admins only see SOPs permitted to their active role or authored by them
    const isFullAdmin = isOwner || isManager;
    if (!isFullAdmin) {
      const hasRoleAccess = (s.access_roles || []).some((r) => (activeRoles || []).includes(r as any));
      const isAuthor = currentUser?.id && s.author_id === currentUser.id;
      if (!hasRoleAccess && !isAuthor) return false;
    }

    if (selectedCategory === 'ARCHIVED') { if (!s.is_archived && s.status !== 'ARCHIVED') return false; } else { if (s.is_archived || s.status === 'ARCHIVED') return false; if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false; }
    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.summary || '').toLowerCase().includes(q) ||
      (s.content || '').toLowerCase().includes(q)
    );
  });

  const currentSOP = selectedSOP ? sops.find((s) => s.id === selectedSOP.id) || selectedSOP : filteredSOPs[0] || null;

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormCode(`SOP-${(formCategory || 'OPS').slice(0, 3).toUpperCase()}-${String(sops.length + 1).padStart(3, '0')}`);
    setFormTitle('');
    setFormCategory('Operations');
    setFormSummary('');
    setFormContent(`## 1. Purpose & Scope\nDescribe the operational objective.\n\n## 2. Step-by-Step Execution Procedure\n1. Step one...\n2. Step two...\n\n## 3. Safety Precaution & Escalation\n- Important safety measures\n- Contact Operations Manager if defect persists`);
    setFormAccessRoles(['owner', 'manager', 'rsa', 'mechanic']);
    setFormChangeSummary('Initial release');
    setEditorModalOpen(true);
  };

  
  const handleArchiveSOP = (sop: SOP) => {
    archiveSOP(sop.id);
    toast.success(`SOP ${sop.code} archived. Historical versions retained under zero-deletion policy.`);
  };

  const handleRestoreSOP = (sop: SOP) => {
    restoreSOP(sop.id);
    toast.success(`SOP ${sop.code} restored to published handbook.`);
  };

  const handleOpenEdit = (sop: SOP) => {
    setIsEditing(true);
    setFormCode(sop.code);
    setFormTitle(sop.title);
    setFormCategory(sop.category);
    setFormSummary(sop.summary);
    setFormContent(sop.content);
    setFormAccessRoles(sop.access_roles || ['owner', 'manager', 'rsa', 'mechanic']);
    setFormChangeSummary('');
    setEditorModalOpen(true);
  };

  const handleSaveSOP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Title and procedure content are required.');
      return;
    }

    if (isEditing && currentSOP) {
      updateSOP(
        currentSOP.id,
        {
          code: formCode.trim().toUpperCase(),
          title: formTitle.trim(),
          category: formCategory,
          summary: formSummary.trim(),
          content: formContent.trim(),
          access_roles: formAccessRoles,
        },
        formChangeSummary.trim() || 'Updated procedure steps'
      );
      toast.success(`SOP ${formCode} updated to new revision!`);
    } else {
      createSOP({
        code: formCode.trim().toUpperCase(),
        title: formTitle.trim(),
        category: formCategory,
        status: 'PUBLISHED',
        summary: formSummary.trim(),
        content: formContent.trim(),
        author_id: currentUser?.id || 'admin',
        author_name: currentUser?.full_name || 'Operations Staff',
        access_roles: formAccessRoles,
      });
      toast.success(`New SOP ${formCode} published!`);
    }

    setEditorModalOpen(false);
  };

  const handleCopyShareLink = (sop: SOP) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/sops?id=${sop.id}` : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success('Shareable SOP Link Copied', {
        description: `Direct link to ${sop.code} (${sop.title}) copied to clipboard.`,
      });
    }
  };

  const handleAcknowledge = (sopId: string) => {
    acknowledgeSOP(sopId);
    toast.success('Compliance Acknowledged', {
      description: `Logged acknowledgment for ${currentUser?.full_name || 'Staff Member'}`,
    });
  };

  const hasAcknowledged = Boolean(currentUser?.id && currentSOP?.acknowledged_by?.includes(currentUser.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Standard Operating Procedures (SOP) & Version Control
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Operational governance, version-controlled revisions, role-based access permissions, and staff compliance tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {(isOwner || isManager) && (
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New SOP</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left SOPs List (4 cols), Right Active Document Viewer (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & SOP Directory List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search & Category Filter */}
          <div className="p-3 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search SOPs by code, title, keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition flex-shrink-0',
                  selectedCategory === 'ALL'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
                )}
              >
                All ({sops.length})
              </button>
              <button
                onClick={() => setSelectedCategory('ARCHIVED')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition flex-shrink-0 flex items-center gap-1',
                  selectedCategory === 'ARCHIVED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b]'
                )}
              >
                <Archive className="w-3 h-3" />
                <span>Archived ({sops.filter((s) => s.is_archived || s.status === 'ARCHIVED').length})</span>
              </button>
              {categories.filter((c) => c !== 'ARCHIVED').map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition flex-shrink-0',
                    selectedCategory === cat
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* SOP Document Cards */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredSOPs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#2a2a2f] rounded-2xl bg-[#1e1e22]/40 text-zinc-500 text-xs">
                No SOPs found matching your search.
              </div>
            ) : (
              filteredSOPs.map((sop) => {
                const isSelected = currentSOP?.id === sop.id;
                return (
                  <div
                    key={sop.id}
                    onClick={() => setSelectedSOP(sop)}
                    className={cn(
                      'p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between gap-2 group',
                      isSelected
                        ? 'bg-[#1c1c1f] border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                        : 'bg-[#1e1e22]/80 border-[#2a2a2f] hover:border-zinc-600'
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-blue-400 px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/20">
                          {sop.code}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                          v{sop.version}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-zinc-100 group-hover:text-blue-300 transition line-clamp-1">
                        {sop.title}
                      </h4>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {sop.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-[#27272a]">
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        {sop.category}
                      </span>
                      <span>{formatRelativeTime(sop.updated_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: SOP Viewer, Version Control & Access Control (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {currentSOP ? (
            <div className="p-6 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-5 shadow-sm">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2a2a2f] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {currentSOP.code}
                    </span>
                    <span className="font-mono text-xs text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      v{currentSOP.version}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-0.5 rounded bg-zinc-800">
                      {currentSOP.category}
                    </span>
                  </div>
                  <h1 className="text-lg font-black tracking-tight text-zinc-100">
                    {currentSOP.title}
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Author: <strong className="text-zinc-200">{currentSOP.author_name}</strong> • Last Updated: {formatDate(currentSOP.updated_at)}
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleCopyShareLink(currentSOP)}
                    className="p-2 rounded-xl bg-[#141416] hover:bg-[#18181b] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
                    title="Copy Share Link"
                  >
                    <Share2 className="w-4 h-4 text-blue-400" />
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-[#141416] hover:bg-[#18181b] border border-[#2a2a2f] text-zinc-300 hover:text-white transition hidden sm:block"
                    title="Print Document"
                  >
                    <Printer className="w-4 h-4 text-zinc-400" />
                  </button>

                                    {(isOwner || isManager) && (
                    <>
                      {currentSOP.is_archived || currentSOP.status === 'ARCHIVED' ? (
                        <button
                          onClick={() => handleRestoreSOP(currentSOP)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore SOP</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveSOP(currentSOP)}
                          className="px-3 py-1.5 rounded-xl bg-[#141416] hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/30 border border-[#2a2a2f] text-xs font-semibold text-zinc-400 transition flex items-center gap-1"
                          title="Archive SOP (Soft-Delete)"
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-400" />
                          <span>Archive</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(currentSOP)}
                        className="px-3 py-1.5 rounded-xl bg-[#141416] hover:bg-[#18181b] border border-[#2a2a2f] text-xs font-semibold text-zinc-200 transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Edit Revision</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Sub-Tabs: Content vs Revisions History vs Access Control */}
              <div className="flex items-center gap-4 border-b border-[#2a2a2f] text-xs font-semibold text-zinc-400">
                <button
                  onClick={() => setActiveTab('content')}
                  className={cn(
                    'py-2 border-b-2 transition flex items-center gap-1.5',
                    activeTab === 'content'
                      ? 'border-blue-500 text-blue-400 font-bold'
                      : 'border-transparent hover:text-zinc-200'
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Procedure Manual</span>
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    'py-2 border-b-2 transition flex items-center gap-1.5',
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-400 font-bold'
                      : 'border-transparent hover:text-zinc-200'
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Version History ({currentSOP.revisions?.length || 1})</span>
                </button>

                <button
                  onClick={() => setActiveTab('access')}
                  className={cn(
                    'py-2 border-b-2 transition flex items-center gap-1.5',
                    activeTab === 'access'
                      ? 'border-blue-500 text-blue-400 font-bold'
                      : 'border-transparent hover:text-zinc-200'
                  )}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Access & Governance</span>
                </button>
              </div>

              {/* TAB 1: Procedure Content Viewer */}
              {activeTab === 'content' && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Summary Box */}
                  <div className="p-3.5 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-300">
                    <span className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider block mb-1">
                      Executive Summary & Purpose
                    </span>
                    <p className="leading-relaxed">{currentSOP.summary}</p>
                  </div>

                  {/* Main Procedure Content Body */}
                  <div className="p-5 rounded-2xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                    {currentSOP.content}
                  </div>

                  {/* Staff Compliance / Acknowledgment Footer */}
                  <div className="p-4 rounded-xl bg-[#18181b] border border-[#2a2a2f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Staff Training & Compliance Acknowledgment</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {currentSOP.acknowledged_by?.length || 0} operators have read and certified this SOP version.
                      </p>
                    </div>

                    <button
                      onClick={() => handleAcknowledge(currentSOP.id)}
                      disabled={hasAcknowledged}
                      className={cn(
                        'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5',
                        hasAcknowledged
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm'
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{hasAcknowledged ? 'Certified by You' : 'Mark as Read & Acknowledged'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Version Control & Revisions History */}
              {activeTab === 'history' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Revision Audit Trail & Diff Changelog
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Current: v{currentSOP.version}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {currentSOP.revisions && currentSOP.revisions.length > 0 ? (
                      currentSOP.revisions.map((rev, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-[#141416] border border-[#2a2a2f] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-xs">
                                Revision v{rev.version}
                              </span>
                              <span className="font-semibold text-zinc-200">
                                {rev.updated_by_name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {formatDate(rev.updated_at)}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-[#18181b] border border-[#27272a] text-zinc-300 text-[11px]">
                            <strong className="text-zinc-400">Change Log: </strong>
                            {rev.change_summary}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-zinc-500 text-xs">
                        No previous revision snapshots found.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Access Control & Permissions */}
              {activeTab === 'access' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Role-Based Access Control (RBAC)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure which staff roles have permission to view and execute this procedure.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customRoles.map((role) => {
                      const hasAccess = currentSOP.access_roles?.includes(role.code);
                      return (
                        <div
                          key={role.id}
                          className={cn(
                            'p-3.5 rounded-xl border flex items-center justify-between text-xs',
                            hasAccess
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-200 font-semibold'
                              : 'bg-[#141416] border-[#2a2a2f] text-zinc-500'
                          )}
                        >
                          <div>
                            <div className="font-bold text-zinc-200">{role.label}</div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Role code: {role.code}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-mono font-bold px-2 py-0.5 rounded',
                              hasAccess
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-zinc-800 text-zinc-500'
                            )}
                          >
                            {hasAccess ? 'ALLOWED' : 'RESTRICTED'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-[#2a2a2f] rounded-2xl bg-[#1e1e22]/40 text-zinc-500 text-xs">
              Select an SOP from the left directory to view full procedure manual.
            </div>
          )}
        </div>
      </div>

      {/* SOP Create / Edit Revision Modal */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="sop-editor-title">
          <div className="w-full max-w-2xl bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 id="sop-editor-title" className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>{isEditing ? `Edit SOP Revision: ${formCode}` : 'Author New SOP Document'}</span>
              </h3>
              <button
                onClick={() => setEditorModalOpen(false)}
                aria-label="Close dialog"
                className="text-zinc-400 hover:text-zinc-200 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSOP} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="sop-code-input" className="text-zinc-400 font-semibold">SOP Code</label>
                  <input
                    id="sop-code-input"
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="sop-title-input" className="text-zinc-400 font-semibold">Document Title</label>
                  <input
                    id="sop-title-input"
                    type="text"
                    required
                    placeholder="e.g. Roadside Battery Swap & High Voltage Safety Protocol"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="sop-category-select" className="text-zinc-400 font-semibold">Category</label>
                  <select
                    id="sop-category-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Safety">Safety & Diagnostics</option>
                    <option value="Security">Security & Night Shifts</option>
                    <option value="Finance">Finance & Claims</option>
                    <option value="Maintenance">Maintenance & Spares</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="sop-change-summary-input" className="text-zinc-400 font-semibold">
                    {isEditing ? 'Revision Change Summary *' : 'Initial Version Note'}
                  </label>
                  <input
                    id="sop-change-summary-input"
                    type="text"
                    required={isEditing}
                    placeholder="e.g. Added mandatory 15-digit IoT ping step"
                    value={formChangeSummary}
                    onChange={(e) => setFormChangeSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="sop-summary-input" className="text-zinc-400 font-semibold">Executive Summary</label>
                <textarea
                  id="sop-summary-input"
                  rows={2}
                  required
                  placeholder="Short 1-2 sentence description of when and why this SOP applies..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="sop-content-input" className="text-zinc-400 font-semibold">Step-by-Step Procedure Instructions (Markdown)</label>
                <textarea
                  id="sop-content-input"
                  rows={8}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Authorized Viewing Roles</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {customRoles.map((r) => {
                    const isChecked = formAccessRoles.includes(r.code);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => {
                          if (isChecked) {
                            setFormAccessRoles(formAccessRoles.filter((code) => code !== r.code));
                          } else {
                            setFormAccessRoles([...formAccessRoles, r.code]);
                          }
                        }}
                        className={cn(
                          'p-2 rounded-xl border text-xs font-semibold transition text-left flex items-center justify-between',
                          isChecked
                            ? 'bg-blue-500/15 border-blue-500 text-blue-300'
                            : 'bg-[#141416] border-[#2a2a2f] text-zinc-400'
                        )}
                      >
                        <span className="truncate">{r?.label ? (r.label.split(' (')?.[0] || r.label) : (r?.code || 'Role')}</span>
                        {isChecked && <Check className="w-3 h-3 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setEditorModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  {isEditing ? 'Commit New Revision' : 'Publish SOP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
