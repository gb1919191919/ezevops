'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { PartInventory, HubPartStock, PartUsageLog, Vehicle } from '@/types';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTh } from '../common/ResizableTh';
import { KpiCardContainer } from '../common/KpiCardContainer';
import { VehicleDetailModal } from '../fleet/VehicleDetailModal';
import {
  Package,
  Plus,
  Sliders,
  AlertTriangle,
  Search,
  Filter,
  Warehouse,
  Building2,
  Edit2,
  Wrench,
  History,
  CheckCircle2,
  X,
  Send,
  User,
  Car,
  DollarSign,
  Tag,
  FileSpreadsheet,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export function InventoryMatrix() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'store1' | 'usage'>('store1');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedPartForAudit, setSelectedPartForAudit] = useState<PartInventory | null>(null);
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<Vehicle | null>(null);

  // Column Resizers
  const { widths: store1Widths, startResizing: startStore1Resizing } = useResizableColumns('store1-inventory', {
    name_sku: 230,
    category: 120,
    supplier: 150,
    cost: 110,
    stock: 150,
    status: 130,
    actions: 180,
  });

  const { widths: usageWidths, startResizing: startUsageResizing } = useResizableColumns('usage-inventory', {
    timestamp: 160,
    part: 210,
    qty: 100,
    recipient: 150,
    destination: 220,
    reason: 230,
    auth: 130,
  });

  // Add Part Modal
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [partName, setPartName] = useState('');
  const [partSku, setPartSku] = useState('');
  const [partCategory, setPartCategory] = useState('Brakes');
  const [partCost, setPartCost] = useState<number>(150);
  const [partThreshold, setPartThreshold] = useState<number>(5);
  const [partSupplier, setPartSupplier] = useState('Pakshal Auto Parts');
  const [partDesc, setPartDesc] = useState('');

  // Edit Part Modal
  const [editPartOpen, setEditPartOpen] = useState(false);
  const [selectedPartToEdit, setSelectedPartToEdit] = useState<PartInventory | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCost, setEditCost] = useState<number>(0);
  const [editThreshold, setEditThreshold] = useState<number>(5);
  const [editSupplier, setEditSupplier] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Issue / Dispatch Spares Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issuePartId, setIssuePartId] = useState('');
  const [issueQty, setIssueQty] = useState<number>(1);
  const [issueRecipient, setIssueRecipient] = useState('');
  const [issueVehicleId, setIssueVehicleId] = useState('');
  const [issueHubId, setIssueHubId] = useState('');
  const [issueReason, setIssueReason] = useState('');

  // Adjust Store 1 Physical Stock Modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPartId, setAdjustPartId] = useState('');
  const [adjustCount, setAdjustCount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('');

  const hubs = useAppStore((s) => s.hubs || []);
  const parts = useAppStore((s) => s.parts || []);
  const hubStock = useAppStore((s) => s.hubStock || []);
  const partUsageLogs = useAppStore((s) => s.partUsageLogs || []);
  const vehicles = useAppStore((s) => s.vehicles || []);
  const addPart = useAppStore((s) => s.addPart);
  const updatePart = useAppStore((s) => s.updatePart);
  const issuePartFromStore1 = useAppStore((s) => s.issuePartFromStore1);
  const adjustPhysicalStock = useAppStore((s) => s.adjustPhysicalStock);
  const { isOwner, isManager } = useRBAC();

  const isAuthorized = isOwner || isManager;
  const categories = Array.from(new Set(parts.map((p) => p.category)));

  const filteredParts = parts.filter((p) => {
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.supplier || '').toLowerCase().includes(q)
    );
  });

  const handleOpenEdit = (p: PartInventory) => {
    setSelectedPartToEdit(p);
    setEditName(p.name);
    setEditSku(p.sku);
    setEditCategory(p.category);
    setEditCost(p.unit_cost);
    setEditThreshold(p.min_threshold || 5);
    setEditSupplier(p.supplier || '');
    setEditDesc(p.description || '');
    setEditPartOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartToEdit) return;
    if (!editName.trim() || !editSku.trim()) {
      toast.error('Part name and SKU are required.');
      return;
    }

    updatePart(selectedPartToEdit.id, {
      name: editName.trim(),
      sku: editSku.trim().toUpperCase(),
      category: editCategory,
      unit_cost: Number(editCost),
      min_threshold: Number(editThreshold),
      supplier: editSupplier.trim() || undefined,
      description: editDesc.trim(),
    });

    toast.success(`Part ${editSku} updated in Store 1 catalog`);
    setEditPartOpen(false);
  };

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim() || !partSku.trim()) {
      toast.error('Part name and SKU are required.');
      return;
    }

    addPart({
      name: partName.trim(),
      sku: partSku.trim().toUpperCase(),
      category: partCategory,
      unit_cost: Number(partCost),
      min_threshold: Number(partThreshold),
      supplier: partSupplier.trim(),
      description: partDesc.trim() || 'Spare part item',
      is_active: true,
    });

    toast.success(`Added ${partName} to Store 1 inventory.`);
    setAddPartOpen(false);
    setPartName('');
    setPartSku('');
    setPartDesc('');
  };

  const handleOpenIssue = (partId?: string) => {
    if (partId) setIssuePartId(partId);
    else if (parts.length > 0) setIssuePartId(parts[0].id);
    setIssueQty(1);
    setIssueRecipient('Rajkumar Mandal');
    setIssueVehicleId('');
    setIssueHubId('');
    setIssueReason('');
    setIssueModalOpen(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuePartId || issueQty <= 0) {
      toast.error('Please select a part and valid quantity.');
      return;
    }

    const stock = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === issuePartId);
    if (stock && stock.physical_stock < issueQty) {
      toast.error(`Insufficient stock in Store 1. Available: ${stock.physical_stock}`);
      return;
    }

    issuePartFromStore1(
      issuePartId,
      issueQty,
      issueRecipient.trim() || 'Field Technician',
      issueReason.trim() || 'Scheduled maintenance',
      issueHubId || undefined,
      issueVehicleId || undefined
    );

    const part = parts.find((p) => p.id === issuePartId);
    toast.success(`Dispatched ${issueQty}x ${part?.name} from Store 1`);
    setIssueModalOpen(false);
  };

  const handleOpenAdjust = (partId: string) => {
    setAdjustPartId(partId);
    const stock = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === partId);
    setAdjustCount(stock ? stock.physical_stock : 10);
    setAdjustReason('Physical stock count audit');
    setAdjustOpen(true);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPartId) return;

    adjustPhysicalStock('hub-store-01', adjustPartId, adjustCount, adjustReason);
    toast.success(`Store 1 inventory count updated to ${adjustCount}`);
    setAdjustOpen(false);
  };

  const totalStore1PartsCount = parts.length;
  const totalStockUnits = hubStock
    .filter((s) => s.hub_id === 'hub-store-01')
    .reduce((sum, s) => sum + s.physical_stock, 0);

  const lowStockCount = hubStock.filter((s) => {
    if (s.hub_id !== 'hub-store-01') return false;
    const p = parts.find((item) => item.id === s.part_id);
    const threshold = p?.min_threshold || 5;
    return s.physical_stock <= threshold;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Store 1 — Central Spare Parts Warehouse
            </h2>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/20">
              SINGLE CENTRAL STORE
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            All physical inventory is stocked exclusively at Store 1 (Andheri West Central Hub) and dispatched to hubs & mechanics
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenIssue()}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Issue Spares from Store 1</span>
          </button>

          {isAuthorized && (
            <button
              onClick={() => setAddPartOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#141416] hover:bg-[#18181b] border border-[#2a2a2f] text-zinc-200 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Add Part SKU</span>
            </button>
          )}
        </div>
      </div>

      {/* 5.1 Summary KPI Cards with Customizable Layout */}
      <KpiCardContainer
        storageKey="inventory-kpis"
        title="Store 1 Operational Metrics"
        subtitle="Catalog size, 7/14-day consumption value, and threshold alerts"
      >
        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Store 1 Catalog SKUs
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-zinc-100 mt-1">
            {totalStore1PartsCount} Spares
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {totalStockUnits} Total units on shelves
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            7-Day Consumption Value
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-emerald-400 mt-1">
            ₹4,200
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Last 7 days maintenance consumption
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f]">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-blue-400">
            14-Day Consumption Value
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-blue-400 mt-1">
            ₹9,650
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            Rolling 14-day spares usage
          </span>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20">
          <div className="kpi-label text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Low Stock Alerts
          </div>
          <div className="kpi-val text-xl font-mono font-bold text-amber-400 mt-1">
            {lowStockCount} Parts
          </div>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
            {lowStockCount === 0 ? 'All levels healthy' : 'Requires supplier order'}
          </span>
        </div>
      </KpiCardContainer>

      {/* Sub Tabs: Store 1 Inventory vs Dispatched Usage Logs */}
      <div className="flex items-center border-b border-[#2a2a2f] gap-4 text-xs font-semibold text-zinc-400">
        <button
          onClick={() => setActiveTab('store1')}
          className={cn(
            'py-2.5 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'store1' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent hover:text-zinc-200'
          )}
        >
          <Package className="w-4 h-4" />
          <span>Store 1 Warehouse Catalog ({parts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('usage')}
          className={cn(
            'py-2.5 border-b-2 transition flex items-center gap-1.5',
            activeTab === 'usage' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent hover:text-zinc-200'
          )}
        >
          <History className="w-4 h-4" />
          <span>Dispatched Spares Log ({partUsageLogs.length})</span>
        </button>
      </div>

      {activeTab === 'store1' && (
        <div className="space-y-4">
          {/* Filter and Search */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search spare parts by name, SKU, category, or supplier..."
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
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
            </div>
          </div>

          {/* VIEW 1: PARTS TABLE */}
          {viewMode === 'table' && (
            <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                    <tr>
                      <ResizableTh
                        colKey="name_sku"
                        width={store1Widths.name_sku}
                        onResizeStart={startStore1Resizing}
                        className="p-3.5 pl-4"
                      >
                        Spare Part & SKU
                      </ResizableTh>

                      <ResizableTh
                        colKey="category"
                        width={store1Widths.category}
                        onResizeStart={startStore1Resizing}
                        className="p-3.5"
                      >
                        Category
                      </ResizableTh>

                      <ResizableTh
                        colKey="supplier"
                        width={store1Widths.supplier}
                        onResizeStart={startStore1Resizing}
                        className="p-3.5"
                      >
                        Supplier
                      </ResizableTh>

                      <ResizableTh
                        colKey="cost"
                        width={store1Widths.cost}
                        onResizeStart={startStore1Resizing}
                        className="p-3.5"
                      >
                        Unit Cost
                      </ResizableTh>

                      <ResizableTh
                        colKey="stock"
                        width={store1Widths.stock}
                        onResizeStart={startStore1Resizing}
                        className="p-3.5"
                      >
                        Store 1 Physical Stock
                      </ResizableTh>

                      <ResizableTh
                        colKey="status"
                        width={store1Widths.status}
                        onResizeStart={startStore1Resizing}
                        className="p-3.5"
                      >
                        Threshold Status
                      </ResizableTh>

                      <th style={{ width: `${store1Widths.actions || 180}px` }} className="p-3.5 text-right pr-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a] text-zinc-300">
                    {filteredParts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">
                          No spare parts found matching the search.
                        </td>
                      </tr>
                    ) : (
                      filteredParts.map((part) => {
                        const stockEntry = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === part.id);
                        const physicalCount = stockEntry ? stockEntry.physical_stock : 0;
                        const threshold = part.min_threshold || 5;
                        const isLow = physicalCount <= threshold;

                        return (
                          <tr key={part.id} className="hover:bg-zinc-800/40 transition">
                            <td className="p-3.5 pl-4">
                              <div className="font-bold text-zinc-100">{part.name}</div>
                              <div className="font-mono text-[10px] text-blue-400 mt-0.5">
                                {part.sku}
                              </div>
                              {part.description && (
                                <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                  {part.description}
                                </div>
                              )}
                            </td>

                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                                {part.category}
                              </span>
                            </td>

                            <td className="p-3.5 text-zinc-400">
                              {part.supplier || 'Pakshal Auto Parts'}
                            </td>

                            <td className="p-3.5 font-mono font-bold text-zinc-200">
                              {formatCurrency(part.unit_cost)}
                            </td>

                            <td className="p-3.5 font-mono font-bold text-sm">
                              <span
                                className={cn(
                                  physicalCount === 0
                                    ? 'text-rose-400'
                                    : isLow
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                )}
                              >
                                {physicalCount} Pcs
                              </span>
                            </td>

                            <td className="p-3.5">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase border inline-flex items-center gap-1',
                                  isLow
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                )}
                              >
                                {isLow && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                                <span>{isLow ? `Low (Min ${threshold})` : 'Adequate'}</span>
                              </span>
                            </td>

                            <td className="p-3.5 text-right pr-4 space-x-1.5">
                              <button
                                onClick={() => setSelectedPartForAudit(part)}
                                className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition inline-flex items-center gap-1"
                                title="View Part Usage & Consumption Audit History"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>History</span>
                              </button>

                              <button
                                onClick={() => handleOpenIssue(part.id)}
                                className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition"
                                title="Issue / Dispatch"
                              >
                                Issue
                              </button>

                              {isAuthorized && (
                                <>
                                  <button
                                    onClick={() => handleOpenAdjust(part.id)}
                                    className="px-2 py-1 rounded-lg bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-300 text-xs transition"
                                    title="Adjust Stock Count"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenEdit(part)}
                                    className="px-2 py-1 rounded-lg bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-300 text-xs transition"
                                    title="Edit Part Details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: GRID CARDS VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredParts.map((part) => {
                const stockEntry = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === part.id);
                const physicalCount = stockEntry ? stockEntry.physical_stock : 0;
                const threshold = part.min_threshold || 5;
                const isLow = physicalCount <= threshold;

                return (
                  <div
                    key={part.id}
                    className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] hover:border-zinc-700 transition shadow-sm space-y-4 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-blue-400 font-bold block">{part.sku}</span>
                          <h4 className="font-bold text-sm text-zinc-100 group-hover:text-blue-300 transition">
                            {part.name}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium shrink-0">
                          {part.category}
                        </span>
                      </div>

                      {part.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2">{part.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                        <span className="text-zinc-500">Unit Cost:</span>
                        <span className="font-mono font-bold text-zinc-200">{formatCurrency(part.unit_cost)}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Store 1 Stock:</span>
                        <span
                          className={cn(
                            'font-mono font-bold',
                            physicalCount === 0
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          )}
                        >
                          {physicalCount} Pcs (Min {threshold})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                      <button
                        onClick={() => setSelectedPartForAudit(part)}
                        className="flex-1 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition text-center"
                      >
                        History
                      </button>
                      <button
                        onClick={() => handleOpenIssue(part.id)}
                        className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition text-center shadow-sm"
                      >
                        Issue
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: REPORT VIEW */}
          {viewMode === 'report' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stock Health by Category */}
                <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span>Inventory Valuation by Category</span>
                  </h3>
                  <div className="space-y-2.5">
                    {categories.map((cat) => {
                      const catParts = filteredParts.filter((p) => p.category === cat);
                      const valuation = catParts.reduce((sum, p) => {
                        const sEntry = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === p.id);
                        return sum + (sEntry ? sEntry.physical_stock * p.unit_cost : 0);
                      }, 0);
                      return (
                        <div key={cat} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-zinc-200 block">{cat}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{catParts.length} distinct SKUs</span>
                          </div>
                          <span className="font-mono font-bold text-purple-300">{formatCurrency(valuation)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stock Level Warning Mix */}
                <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Stock Adequacy Breakdown</span>
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const zeroStock = filteredParts.filter((p) => {
                        const s = hubStock.find((st) => st.hub_id === 'hub-store-01' && st.part_id === p.id);
                        return !s || s.physical_stock === 0;
                      });
                      const lowStock = filteredParts.filter((p) => {
                        const s = hubStock.find((st) => st.hub_id === 'hub-store-01' && st.part_id === p.id);
                        return s && s.physical_stock > 0 && s.physical_stock <= (p.min_threshold || 5);
                      });
                      const adequateStock = filteredParts.filter((p) => {
                        const s = hubStock.find((st) => st.hub_id === 'hub-store-01' && st.part_id === p.id);
                        return s && s.physical_stock > (p.min_threshold || 5);
                      });

                      return [
                        { label: 'Adequate Stock (> threshold)', count: adequateStock.length, color: 'text-emerald-400', bg: 'bg-emerald-500' },
                        { label: 'Low Stock Alert (<= threshold)', count: lowStock.length, color: 'text-amber-400', bg: 'bg-amber-500' },
                        { label: 'Critical Out of Stock (0 pcs)', count: zeroStock.length, color: 'text-rose-400', bg: 'bg-rose-500' },
                      ].map((item) => (
                        <div key={item.label} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className={cn('font-bold', item.color)}>{item.label}</span>
                            <span className="font-mono text-zinc-200 font-bold">{item.count}</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.bg)}
                              style={{ width: `${filteredParts.length > 0 ? (item.count / filteredParts.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Top Consumed Parts */}
                <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Recent Spares Dispatched</span>
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {partUsageLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-[#141416] border border-[#27272a] text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-200">{log.part?.name || 'Spare Part'}</span>
                          <span className="font-mono text-blue-400 font-bold">x{log.quantity}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500">Issued to: {log.recipient_name || log.used_by_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: PIPELINE / KANBAN VIEW */}
          {viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  key: 'critical',
                  title: 'Critical Out of Stock (0 Pcs)',
                  filterFn: (p: PartInventory) => {
                    const s = hubStock.find((st) => st.hub_id === 'hub-store-01' && st.part_id === p.id);
                    return !s || s.physical_stock === 0;
                  },
                  color: 'text-rose-400',
                  badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                },
                {
                  key: 'low',
                  title: 'Low Stock Alert (<= Threshold)',
                  filterFn: (p: PartInventory) => {
                    const s = hubStock.find((st) => st.hub_id === 'hub-store-01' && st.part_id === p.id);
                    return s && s.physical_stock > 0 && s.physical_stock <= (p.min_threshold || 5);
                  },
                  color: 'text-amber-400',
                  badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                },
                {
                  key: 'adequate',
                  title: 'Adequate Physical Stock',
                  filterFn: (p: PartInventory) => {
                    const s = hubStock.find((st) => st.hub_id === 'hub-store-01' && st.part_id === p.id);
                    return s && s.physical_stock > (p.min_threshold || 5);
                  },
                  color: 'text-emerald-400',
                  badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                },
              ].map((column) => {
                const list = filteredParts.filter(column.filterFn);
                return (
                  <div key={column.key} className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                      <span className={cn('text-xs font-bold', column.color)}>{column.title}</span>
                      <span className={cn('px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border', column.badgeBg)}>
                        {list.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                      {list.length === 0 ? (
                        <div className="p-6 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl">
                          No spare parts in this threshold.
                        </div>
                      ) : (
                        list.map((part) => {
                          const stockEntry = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === part.id);
                          const physicalCount = stockEntry ? stockEntry.physical_stock : 0;

                          return (
                            <div
                              key={part.id}
                              className="p-3.5 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-600 transition space-y-2 text-xs"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-mono text-[10px] text-blue-400 font-bold block">{part.sku}</span>
                                  <h5 className="font-bold text-zinc-100">{part.name}</h5>
                                </div>
                                <span className="font-mono font-bold text-zinc-300">{formatCurrency(part.unit_cost)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-zinc-800 text-zinc-400">
                                <span>{part.category}</span>
                                <span className="font-mono font-bold text-zinc-200">{physicalCount} Pcs in stock</span>
                              </div>
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  onClick={() => handleOpenIssue(part.id)}
                                  className="flex-1 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition"
                                >
                                  Issue
                                </button>
                                {isAuthorized && (
                                  <button
                                    onClick={() => handleOpenAdjust(part.id)}
                                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition"
                                  >
                                    Adjust
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Dispatched Spares Log */}
      {activeTab === 'usage' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <ResizableTh
                    colKey="timestamp"
                    width={usageWidths.timestamp}
                    onResizeStart={startUsageResizing}
                    className="p-3.5 pl-4"
                  >
                    Timestamp
                  </ResizableTh>

                  <ResizableTh
                    colKey="part"
                    width={usageWidths.part}
                    onResizeStart={startUsageResizing}
                    className="p-3.5"
                  >
                    Spare Part
                  </ResizableTh>

                  <ResizableTh
                    colKey="qty"
                    width={usageWidths.qty}
                    onResizeStart={startUsageResizing}
                    className="p-3.5"
                  >
                    Quantity
                  </ResizableTh>

                  <ResizableTh
                    colKey="recipient"
                    width={usageWidths.recipient}
                    onResizeStart={startUsageResizing}
                    className="p-3.5"
                  >
                    Recipient / Mechanic
                  </ResizableTh>

                  <ResizableTh
                    colKey="destination"
                    width={usageWidths.destination}
                    onResizeStart={startUsageResizing}
                    className="p-3.5"
                  >
                    Destination Hub / Vehicle
                  </ResizableTh>

                  <ResizableTh
                    colKey="reason"
                    width={usageWidths.reason}
                    onResizeStart={startUsageResizing}
                    className="p-3.5"
                  >
                    Dispatch Reason
                  </ResizableTh>

                  <th style={{ width: `${usageWidths.auth || 130}px` }} className="p-3.5 text-right pr-4">
                    Authorized By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] text-zinc-300">
                {partUsageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No spares have been dispatched from Store 1 yet.
                    </td>
                  </tr>
                ) : (
                  partUsageLogs.map((log) => {
                    const part = parts.find((p) => p.id === log.part_id);
                    const hub = hubs.find((h) => h.id === log.hub_id);
                    const matchedVeh = vehicles.find(
                      (v) =>
                        v.id === log.vehicle_id ||
                        v.vehicle_id === log.vehicle_id ||
                        v.key_number === log.vehicle_id ||
                        v.custom_vehicle_id?.toLowerCase() === log.vehicle_id?.toLowerCase()
                    );

                    return (
                      <tr key={log.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3.5 pl-4 font-mono text-zinc-400">
                          <div>{formatDate(log.created_at)}</div>
                          <span className="text-[10px] text-zinc-500">{formatRelativeTime(log.created_at)}</span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-zinc-100">{part?.name || log.part_id}</div>
                          <span className="text-[10px] font-mono text-blue-400">{part?.sku}</span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-rose-400">
                          -{log.quantity} Pcs
                        </td>

                        <td className="p-3.5 text-zinc-200">
                          {log.recipient_name || log.used_by_name}
                        </td>

                        <td className="p-3.5">
                          <div className="text-zinc-300 font-medium">{hub?.name ? (hub.name.split(' (')?.[0] || hub.name) : 'Store 1'}</div>
                          {matchedVeh ? (
                            <button
                              onClick={() => setSelectedVehicleForModal(matchedVeh)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/20 mt-1 transition"
                              title="Inspect Vehicle Lifecycle"
                            >
                              <Car className="w-3 h-3 text-blue-400" />
                              <span>Key #{matchedVeh.key_number} ({matchedVeh.custom_vehicle_id || (matchedVeh.id || '').toUpperCase()})</span>
                            </button>
                          ) : log.vehicle_id ? (
                            <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">EV: {log.vehicle_id}</span>
                          ) : null}
                        </td>

                        <td className="p-3.5 max-w-xs text-zinc-300">
                          {log.reason}
                        </td>

                        <td className="p-3.5 text-right pr-4 text-zinc-400 font-mono">
                          {log.used_by_name}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {editPartOpen && selectedPartToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Edit Part: {selectedPartToEdit.sku}</span>
              </h3>
              <button
                onClick={() => setEditPartOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Part Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Category</label>
                  <input
                    type="text"
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Unit Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Min Threshold</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Supplier Name</label>
                <input
                  type="text"
                  value={editSupplier}
                  onChange={(e) => setEditSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setEditPartOpen(false)}
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

      {/* Add Part Modal */}
      {addPartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Add Spare Part to Store 1</span>
              </h3>
              <button
                onClick={() => setAddPartOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPartSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Part Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Cylinder"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EZEV-MST-CYL-01"
                    value={partSku}
                    onChange={(e) => setPartSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Category</label>
                  <select
                    value={partCategory}
                    onChange={(e) => setPartCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Brakes">Brakes</option>
                    <option value="Controls">Controls</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Chassis">Chassis</option>
                    <option value="Fasteners">Fasteners</option>
                    <option value="Tyres">Tyres</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Unit Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={partCost}
                    onChange={(e) => setPartCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Min Threshold</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={partThreshold}
                    onChange={(e) => setPartThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Supplier Name</label>
                <input
                  type="text"
                  placeholder="Pakshal Auto Parts / SMH E Ventures"
                  value={partSupplier}
                  onChange={(e) => setPartSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Technical specs or compatibility..."
                  value={partDesc}
                  onChange={(e) => setPartDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setAddPartOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Save Part SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Spares Modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Issue Spares from Store 1</span>
              </h3>
              <button
                onClick={() => setIssueModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Select Spare Part</label>
                <select
                  value={issuePartId}
                  onChange={(e) => setIssuePartId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {parts.map((p) => {
                    const st = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Available in Store 1: {st?.physical_stock ?? 0} Pcs
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Quantity to Dispatch</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={issueQty}
                    onChange={(e) => setIssueQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Recipient Technician / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajkumar Mandal"
                    value={issueRecipient}
                    onChange={(e) => setIssueRecipient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Destination Hub (Optional)</label>
                  <select
                    value={issueHubId}
                    onChange={(e) => setIssueHubId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Field Mobile RSA Dispatch</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Target EV Key No (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9640 or 5646"
                    value={issueVehicleId}
                    onChange={(e) => setIssueVehicleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Dispatch Reason / Ticket Note</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Replacing damaged throttle assembly on Key 1915"
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Adjust Store 1 Physical Stock</span>
              </h3>
              <button
                onClick={() => setAdjustOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">New Count on Shelf (Store 1)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustCount}
                  onChange={(e) => setAdjustCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-mono text-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Adjustment Reason</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setAdjustOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Update Count
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5.1 Comprehensive Part Usage Audit History Modal */}
      {selectedPartForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-100">{selectedPartForAudit.name}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20">
                      SKU: {selectedPartForAudit.sku}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Category: {selectedPartForAudit.category} • Unit Cost: {formatCurrency(selectedPartForAudit.unit_cost)} • Supplier: {selectedPartForAudit.supplier || 'Pakshal Auto Parts'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPartForAudit(null)}
                className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Consumption Stats */}
            <div className="p-4 grid grid-cols-3 gap-3 bg-[#18181b] border-b border-[#27272a]">
              {(() => {
                const logs = partUsageLogs.filter((l) => l.part_id === selectedPartForAudit.id);
                const totalUnitsUsed = logs.reduce((sum, l) => sum + l.quantity, 0);
                const totalSpend = totalUnitsUsed * selectedPartForAudit.unit_cost;
                const stockEntry = hubStock.find((s) => s.hub_id === 'hub-store-01' && s.part_id === selectedPartForAudit.id);
                const currentStock = stockEntry ? stockEntry.physical_stock : 0;

                return (
                  <>
                    <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Current Shelf Stock</span>
                      <div className="font-mono font-bold text-lg text-emerald-400 mt-0.5">{currentStock} Units</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Historical Consumption</span>
                      <div className="font-mono font-bold text-lg text-blue-400 mt-0.5">{totalUnitsUsed} Units Used</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Cumulative Part Spend</span>
                      <div className="font-mono font-bold text-lg text-purple-300 mt-0.5">{formatCurrency(totalSpend)}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Vehicle-by-Vehicle Usage Ledger */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <h4 className="font-bold text-xs text-zinc-300 uppercase tracking-wider">
                Vehicle-by-Vehicle & Hub Usage Logs
              </h4>

              {(() => {
                const logs = partUsageLogs.filter((l) => l.part_id === selectedPartForAudit.id);
                if (logs.length === 0) {
                  return (
                    <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
                      No dispatched consumption logged for this part yet.
                    </div>
                  );
                }

                return (
                  <div className="border border-[#2a2a2f] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#141416] text-zinc-400 border-b border-[#27272a] text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="p-2.5 pl-3">Date & Time</th>
                          <th className="p-2.5">Vehicle / Destination</th>
                          <th className="p-2.5">Quantity</th>
                          <th className="p-2.5">Recipient</th>
                          <th className="p-2.5">Reason / Job Card</th>
                          <th className="p-2.5 text-right pr-3">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272a] text-zinc-300">
                        {logs.map((log) => {
                          const veh = vehicles.find((v) => v.id === log.vehicle_id);
                          const hub = hubs.find((h) => h.id === log.hub_id);
                          return (
                            <tr key={log.id} className="hover:bg-zinc-800/30">
                              <td className="p-2.5 pl-3 font-mono text-[11px] text-zinc-400">
                                {formatDate(log.created_at)}
                              </td>
                              <td className="p-2.5">
                                {veh ? (
                                  <button
                                    onClick={() => setSelectedVehicleForModal(veh)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/20 transition"
                                    title="View Vehicle Lifecycle"
                                  >
                                    <Car className="w-3 h-3 text-blue-400" />
                                    <span>Key #{veh.key_number} ({veh.custom_vehicle_id || (veh.id || '').toUpperCase()})</span>
                                  </button>
                                ) : (
                                  <span className="text-zinc-400">{hub?.name ? (hub.name.split(' (')?.[0] || hub.name) : 'General Store'}</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-zinc-200">
                                {log.quantity} Pcs
                              </td>
                              <td className="p-2.5 text-zinc-300">
                                {log.recipient_name || log.used_by_name}
                              </td>
                              <td className="p-2.5 text-zinc-400 text-[11px]">
                                {log.reason}
                              </td>
                              <td className="p-2.5 text-right pr-3 font-mono font-bold text-purple-300">
                                {formatCurrency(log.quantity * selectedPartForAudit.unit_cost)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#141416] border-t border-[#27272a] flex items-center justify-end">
              <button
                onClick={() => setSelectedPartForAudit(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal for Cross-Module Interlinking */}
      {selectedVehicleForModal && (
        <VehicleDetailModal
          vehicle={selectedVehicleForModal}
          isOpen={!!selectedVehicleForModal}
          onClose={() => setSelectedVehicleForModal(null)}
        />
      )}
    </div>
  );
}
