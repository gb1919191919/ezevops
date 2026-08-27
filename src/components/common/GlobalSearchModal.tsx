'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store/appStore';
import {
  Search,
  Car,
  Package,
  Wrench,
  CheckCircle2,
  BookOpen,
  DollarSign,
  Building2,
  Users,
  StickyNote,
  FileText,
  ArrowRight,
  CornerDownLeft,
  X,
  Sparkles,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  categoryLabel: string;
  icon: any;
  href: string;
  badge?: string;
  badgeColor?: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const vehicles = useAppStore((s) => s.vehicles);
  const parts = useAppStore((s) => s.parts);
  const jobCards = useAppStore((s) => s.jobCards);
  const objectives = useAppStore((s) => s.objectives);
  const tasks = useAppStore((s) => s.tasks);
  const sops = useAppStore((s) => s.sops);
  const refunds = useAppStore((s) => s.refunds);
  const hubs = useAppStore((s) => s.hubs);
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const teamNotes = useAppStore((s) => s.teamNotes);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return quick suggested links
      return [
        {
          id: 's-fleet',
          title: 'Fleet Master Operations',
          subtitle: `${vehicles.length} Total active EVs in Mumbai fleet`,
          category: 'quick',
          categoryLabel: 'Quick Navigation',
          icon: Car,
          href: '/fleet',
          badge: `${vehicles.filter((v) => v.current_status === 'Available').length} Ready`,
          badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        },
        {
          id: 's-parts',
          title: 'Spare Parts & Store 1 Inventory',
          subtitle: `${parts.length} Spare parts cataloged`,
          category: 'quick',
          categoryLabel: 'Quick Navigation',
          icon: Package,
          href: '/inventory',
          badge: 'Store 1',
          badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        },
        {
          id: 's-jobs',
          title: 'Maintenance Job Cards',
          subtitle: `${jobCards.length} Maintenance tickets logged`,
          category: 'quick',
          categoryLabel: 'Quick Navigation',
          icon: Wrench,
          href: '/job-cards',
        },
        {
          id: 's-tasks',
          title: 'Strategic Objectives & Tasks',
          subtitle: `${objectives.length} Objectives • ${tasks.length} Operational tasks`,
          category: 'quick',
          categoryLabel: 'Quick Navigation',
          icon: CheckCircle2,
          href: '/tasks',
        },
        {
          id: 's-refunds',
          title: 'Customer Dispute Refunds',
          subtitle: `${refunds.length} Total dispute cases logged`,
          category: 'quick',
          categoryLabel: 'Quick Navigation',
          icon: DollarSign,
          href: '/refunds',
        },
      ];
    }

    const items: SearchResultItem[] = [];

    // 1. Vehicles
    vehicles.forEach((v) => {
      const match =
        v.id.toLowerCase().includes(q) ||
        v.vehicle_id.toLowerCase().includes(q) ||
        (v.custom_vehicle_id && v.custom_vehicle_id.toLowerCase().includes(q)) ||
        v.key_number.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q);

      if (match) {
        items.push({
          id: `veh-${v.id}`,
          title: `Key #${v.key_number} • ${v.model} (${v.custom_vehicle_id || v.id.toUpperCase()})`,
          subtitle: `IoT ID: ${v.vehicle_id} • Status: ${v.current_status} • Hub: ${v.hub?.name || v.current_hub_id}`,
          category: 'vehicles',
          categoryLabel: 'Fleet Vehicles',
          icon: Car,
          href: '/fleet',
          badge: v.current_status,
          badgeColor:
            v.current_status === 'Available'
              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
              : 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        });
      }
    });

    // 2. Spare Parts
    parts.forEach((p) => {
      const match =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.supplier && p.supplier.toLowerCase().includes(q));

      if (match) {
        items.push({
          id: `part-${p.id}`,
          title: `${p.name} (SKU: ${p.sku})`,
          subtitle: `Category: ${p.category} • Cost: ${formatCurrency(p.unit_cost)} • Supplier: ${p.supplier || 'Pakshal Auto'}`,
          category: 'inventory',
          categoryLabel: 'Spare Parts',
          icon: Package,
          href: '/inventory',
          badge: formatCurrency(p.unit_cost),
          badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        });
      }
    });

    // 3. Job Cards
    jobCards.forEach((j) => {
      const match =
        j.ticket_number.toString().includes(q) ||
        j.issue_description.toLowerCase().includes(q) ||
        (j.solution_applied && j.solution_applied.toLowerCase().includes(q));

      if (match) {
        items.push({
          id: `job-${j.id}`,
          title: `Job Card #${j.ticket_number} — ${j.issue_description}`,
          subtitle: `Vehicle: ${j.vehicle_id} • Status: ${j.status} • Hub: ${j.hub_id}`,
          category: 'jobcards',
          categoryLabel: 'Job Cards & Maintenance',
          icon: Wrench,
          href: '/job-cards',
          badge: j.status,
          badgeColor:
            j.status === 'APPROVED'
              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
              : 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        });
      }
    });

    // 4. Tasks & Objectives
    objectives.forEach((obj) => {
      if (obj.title.toLowerCase().includes(q) || obj.description.toLowerCase().includes(q)) {
        items.push({
          id: `obj-${obj.id}`,
          title: `Objective: ${obj.title}`,
          subtitle: `${obj.description} • Target: ${obj.target_date}`,
          category: 'tasks',
          categoryLabel: 'Objectives & Milestones',
          icon: CheckCircle2,
          href: '/tasks',
          badge: obj.is_completed ? 'Completed' : 'Active Objective',
          badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        });
      }
    });

    tasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))) {
        items.push({
          id: `task-${t.id}`,
          title: `Task: ${t.title}`,
          subtitle: `Priority: ${t.priority} • Status: ${t.status} • Due: ${t.due_date || 'No Date'}`,
          category: 'tasks',
          categoryLabel: 'Operational Tasks',
          icon: CheckCircle2,
          href: '/tasks',
          badge: t.priority,
          badgeColor:
            t.priority === 'CRITICAL'
              ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
              : 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        });
      }
    });

    // 5. SOPs
    sops.forEach((s) => {
      if (s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)) {
        items.push({
          id: `sop-${s.id}`,
          title: `[${s.code}] ${s.title}`,
          subtitle: `${s.summary} • Category: ${s.category}`,
          category: 'sops',
          categoryLabel: 'SOPs & Manuals',
          icon: BookOpen,
          href: '/sops',
          badge: `v${s.version}`,
          badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
        });
      }
    });

    // 6. Refunds & Disputes
    refunds.forEach((r) => {
      if (r.ride_id.toLowerCase().includes(q) || r.user_phone.includes(q) || r.reason.toLowerCase().includes(q)) {
        items.push({
          id: `ref-${r.id}`,
          title: `Dispute: Ride #${r.ride_id} — ${formatCurrency(r.amount)}`,
          subtitle: `Phone: ${r.user_phone} • Reason: ${r.reason} • Status: ${r.status}`,
          category: 'refunds',
          categoryLabel: 'Customer Disputes',
          icon: DollarSign,
          href: '/refunds',
          badge: r.status,
          badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        });
      }
    });

    // 7. Hubs
    hubs.forEach((h) => {
      if (h.name.toLowerCase().includes(q) || h.code.toLowerCase().includes(q) || h.address.toLowerCase().includes(q)) {
        items.push({
          id: `hub-${h.id}`,
          title: `${h.name} (${h.code})`,
          subtitle: `${h.address} • POC: ${h.poc_name} (${h.poc_phone})`,
          category: 'hubs',
          categoryLabel: 'Hubs Directory',
          icon: Building2,
          href: '/hubs',
          badge: h.type === 'STOCK_HUB' ? 'Central Warehouse' : 'Bike Hub',
          badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        });
      }
    });

    // 8. Staff Profiles
    staffProfiles.forEach((p) => {
      if (p.full_name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q)) || p.phone.includes(q)) {
        items.push({
          id: `staff-${p.id}`,
          title: `${p.full_name} (${p.roles?.map((r) => r.label).join(', ') || 'Staff'})`,
          subtitle: `Email: ${p.email || '-'} • Phone: ${p.phone}`,
          category: 'staff',
          categoryLabel: 'Staff Profiles',
          icon: Users,
          href: '/settings',
          badge: 'Staff',
          badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        });
      }
    });

    // 9. Team Notes
    teamNotes.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        items.push({
          id: `note-${n.id}`,
          title: n.title,
          subtitle: `${n.content.slice(0, 80)}... • Author: ${n.author_name}`,
          category: 'notes',
          categoryLabel: 'Team Notes',
          icon: StickyNote,
          href: '/notes',
          badge: n.category,
          badgeColor: 'text-zinc-300 border-zinc-700 bg-zinc-800',
        });
      }
    });

    return items;
  }, [query, vehicles, parts, jobCards, objectives, tasks, sops, refunds, hubs, staffProfiles, teamNotes]);

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    router.push(item.href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[#18181b] border border-[#2e2e33] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#27272a] gap-3 bg-[#141416]">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search tasks, vehicles, parts, job cards, SOPs, staff, hubs (Cmd + K)..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-zinc-800/30">
          {results.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Search className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-300">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-zinc-500">
                Try searching with a vehicle key number, spare part name, ticket ID, or staff name.
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl cursor-pointer transition text-left group',
                    isSelected
                      ? 'bg-blue-600/15 border border-blue-500/30 text-blue-200'
                      : 'hover:bg-zinc-800/40 text-zinc-300 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition',
                        isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 truncate group-hover:text-white">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border shrink-0',
                              item.badgeColor || 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                      {item.categoryLabel}
                    </span>
                    <ArrowRight
                      className={cn(
                        'w-4 h-4 transition-transform',
                        isSelected ? 'text-blue-400 translate-x-0.5' : 'text-zinc-600 group-hover:text-zinc-400'
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#141416] border-t border-[#27272a] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-mono text-zinc-400">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-mono text-zinc-400">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-mono text-zinc-400">↵</kbd>
              <span>Select</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Universal Instant Index</span>
          </div>
        </div>
      </div>
    </div>
  );
}
