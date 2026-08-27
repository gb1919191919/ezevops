'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Objective, Milestone, TaskItem, TaskPriority, TaskStatus } from '@/types';
import { TaskPriorityBadge, TaskStatusBadge } from '../common/StatusBadge';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { ViewSwitcher, ViewMode } from '../common/ViewSwitcher';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { formatDate, cn } from '@/lib/utils';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTh } from '../common/ResizableTh';
import { KpiCardContainer } from '../common/KpiCardContainer';
import {
  CheckCircle2,
  Plus,
  Users,
  Building2,
  Car,
  ChevronRight,
  Search,
  Filter,
  Check,
  Clock,
  Layers,
  MessageSquare,
  FileSpreadsheet,
  FileText,
  Target,
  Flag,
  ListTodo,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';

type TaskSortField = 'title' | 'priority' | 'status' | 'due_date' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function TasksEngine() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<TaskSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Resizable columns
  const { widths, startResizing } = useResizableColumns('tasks-engine-table', {
    title: 240,
    parent: 180,
    priority: 110,
    assigned: 160,
    vehicles: 130,
    due: 120,
    status: 120,
    action: 90,
  });

  // 1. Objective creation modal state
  const [objectiveModalOpen, setObjectiveModalOpen] = useState(false);
  const [objTitle, setObjTitle] = useState('');
  const [objDesc, setObjDesc] = useState('');
  const [objHubId, setObjHubId] = useState('');
  const [objStartDate, setObjStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [objTargetDate, setObjTargetDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // 2. Milestone creation modal state (7.1)
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [msObjectiveId, setMsObjectiveId] = useState('');
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msTargetDate, setMsTargetDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // 3. Task creation modal state (7.1 & 7.2)
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskObjectiveId, setTaskObjectiveId] = useState('');
  const [taskMilestoneId, setTaskMilestoneId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [vehicleScope, setVehicleScope] = useState<'ALL' | 'SPECIFIC' | 'NONE'>('NONE');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );

  const objectives = useAppStore((s) => s.objectives || []);
  const milestones = useAppStore((s) => s.milestones || []);
  const tasks = useAppStore((s) => s.tasks || []);
  const hubs = useAppStore((s) => s.hubs || []);
  const selectedHubIds = useAppStore((s) => s.selectedHubIds || ['ALL']);
  const vehicles = useAppStore((s) => s.vehicles || []);
  const staffProfiles = useAppStore((s) => s.staffProfiles || []);
  const createObjective = useAppStore((s) => s.createObjective);
  const addMilestone = useAppStore((s) => s.addMilestone);
  const createTask = useAppStore((s) => s.createTask);
  const updateTaskStatus = useAppStore((s) => s.updateTaskStatus);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const isGlobalHub = selectedHubIds.includes('ALL') || selectedHubIds.length === 0;

  const handleSort = (field: TaskSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filtered & Sorted dataset
  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => {
      const parentObj = objectives.find((o) => o.id === t.objective_id);
      if (!isGlobalHub && parentObj?.hub_id && !selectedHubIds.includes(parentObj.hub_id)) return false;

      const isFullAdmin = isOwner || isManager;
      if (!isFullAdmin) {
        const isAssigned = (t.assigned_to || []).includes(currentUser?.id);
        const isCreator = t.created_by === currentUser?.id;
        const isUserHub = currentUser?.assigned_hub_id && parentObj?.hub_id === currentUser.assigned_hub_id;
        if (!isAssigned && !isCreator && !isUserHub) return false;
      }

      if (selectedStatusFilter !== 'ALL' && t.status !== selectedStatusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'ALL' && !(t.assigned_to || []).includes(assigneeFilter)) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const parentMs = milestones.find((m) => m.id === t.milestone_id);

      return (
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (parentObj?.title || '').toLowerCase().includes(q) ||
        (parentMs?.title || '').toLowerCase().includes(q)
      );
    });

    const priorityWeights: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'title') {
        comp = (a.title || '').localeCompare(b.title || '');
      } else if (sortField === 'priority') {
        comp = (priorityWeights[a.priority] || 0) - (priorityWeights[b.priority] || 0);
      } else if (sortField === 'status') {
        comp = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'due_date') {
        comp = new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
      } else if (sortField === 'created_at') {
        comp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [
    tasks,
    isGlobalHub,
    selectedHubIds,
    isOwner,
    isManager,
    currentUser,
    objectives,
    milestones,
    selectedStatusFilter,
    priorityFilter,
    assigneeFilter,
    searchTerm,
    sortField,
    sortOrder,
  ]);

  // Objective creation
  const handleCreateObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objTitle.trim()) {
      toast.error('Please enter an objective title.');
      return;
    }
    const targetHub = objHubId || hubs[0]?.id;

    createObjective({
      title: objTitle.trim(),
      description: objDesc.trim(),
      start_date: objStartDate,
      target_date: objTargetDate,
      hub_id: targetHub,
      created_by: currentUser?.id || 'admin',
    });

    toast.success('Parent Strategic Objective created!');
    setObjectiveModalOpen(false);
    setObjTitle('');
    setObjDesc('');
  };

  // Milestone creation (7.1)
  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim() || !msObjectiveId) {
      toast.error('Milestone title and parent objective are mandatory.');
      return;
    }

    addMilestone({
      objective_id: msObjectiveId,
      title: msTitle.trim(),
      description: msDesc.trim() || undefined,
      target_date: msTargetDate,
      is_completed: false,
    });

    toast.success(`Milestone "${msTitle}" added to Objective!`);
    setMilestoneModalOpen(false);
    setMsTitle('');
    setMsDesc('');
  };

  // Task creation (7.1 & 7.2)
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskObjectiveId) {
      toast.error('Task title and parent objective are required.');
      return;
    }
    const assignees = taskAssignees.length > 0 ? taskAssignees : [currentUser?.id || 'admin'];

    createTask({
      objective_id: taskObjectiveId,
      milestone_id: taskMilestoneId || undefined,
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      priority: taskPriority,
      status: 'TODO',
      assigned_to: assignees,
      vehicle_scope: vehicleScope,
      vehicle_ids: vehicleScope === 'SPECIFIC' ? selectedVehicleIds : undefined,
      due_date: taskDueDate || undefined,
      created_by: currentUser?.id || 'admin',
    });

    toast.success(`Task "${taskTitle}" assigned successfully!`);
    setTaskModalOpen(false);
    setTaskTitle('');
    setTaskDesc('');
    setTaskAssignees([]);
    setSelectedVehicleIds([]);
    setVehicleScope('NONE');
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredTasks.map((t) => {
      const parentObj = objectives.find((o) => o.id === t.objective_id);
      const parentMs = milestones.find((m) => m.id === t.milestone_id);
      return {
        'Task Title': t.title,
        'Parent Objective': parentObj?.title || '-',
        'Milestone': parentMs?.title || '-',
        'Priority': t.priority,
        'Status': t.status,
        'Vehicle Scope': t.vehicle_scope || 'NONE',
        'Specific EVs': (t.vehicle_ids || []).join(', ') || '-',
        'Due Date': t.due_date ? formatDate(t.due_date) : '-',
        'Created Date': formatDate(t.created_at),
      };
    });

    exportToCSV('ezev_mumbai_tasks_hierarchy', data);
  };

  const handleExportPDF = () => {
    const headers = ['Task Title', 'Parent Objective', 'Milestone', 'Priority', 'Status', 'Scope', 'Due Date'];
    const rows = filteredTasks.map((t) => {
      const parentObj = objectives.find((o) => o.id === t.objective_id);
      const parentMs = milestones.find((m) => m.id === t.milestone_id);
      return [
        t.title,
        parentObj?.title.slice(0, 25) || '-',
        parentMs?.title.slice(0, 20) || '-',
        t.priority,
        t.status,
        t.vehicle_scope || 'NONE',
        t.due_date ? formatDate(t.due_date) : '-',
      ];
    });

    exportToPDF('Strategic Objectives & Tasks Matrix', `${filteredTasks.length} Assigned Tasks`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Hierarchy Controls */}
      <div className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Strategic Hierarchy: Objectives, Milestones & Tasks
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Three-tier execution framework linking corporate OKRs to regional milestones and field work orders
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(isOwner || isManager) && (
            <>
              <button
                onClick={() => setObjectiveModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span>+ Objective</span>
              </button>

              <button
                onClick={() => {
                  if (objectives.length === 0) {
                    toast.error('Please create an Objective first before creating a Milestone.');
                    return;
                  }
                  setMsObjectiveId(objectives[0].id);
                  setMilestoneModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-[#141416] hover:bg-zinc-800 border border-[#2a2a2f] text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Milestone</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              if (objectives.length === 0) {
                toast.error('Please create an Objective first.');
                return;
              }
              setTaskObjectiveId(objectives[0].id);
              setTaskModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Field Task</span>
          </button>
        </div>
      </div>

      {/* Strategic Hierarchy Summary Grid with Customizable Layout */}
      <KpiCardContainer
        storageKey="tasks-kpis"
        title="Objectives & Execution Pipeline"
        subtitle="Tier 1 Strategic Objectives, Tier 2 Milestones, and Tier 3 Field Tasks"
      >
        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-blue-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Tier 1: Parent Objectives</span>
            <Target className="kpi-icon w-4 h-4 text-blue-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-blue-400">{objectives.length}</div>
          <p className="text-[11px] text-zinc-500">Corporate & regional high-level goals</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Tier 2: Tracked Milestones</span>
            <Flag className="kpi-icon w-4 h-4 text-amber-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-amber-400">{milestones.length}</div>
          <p className="text-[11px] text-zinc-500">Phase gates & readiness checkpoints</p>
        </div>

        <div className="kpi-card p-4 rounded-2xl bg-[#1e1e22] border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span className="kpi-label">Tier 3: Field Work Orders</span>
            <ListTodo className="kpi-icon w-4 h-4 text-emerald-400" />
          </div>
          <div className="kpi-val font-mono font-black text-2xl text-emerald-400">{tasks.length}</div>
          <p className="text-[11px] text-zinc-500">
            {tasks.filter((t) => t.status === 'COMPLETED').length} Done • {tasks.filter((t) => t.status === 'IN_PROGRESS').length} Active
          </p>
        </div>
      </KpiCardContainer>

      {/* Control Bar: Search, Multi-Attribute Filters, Universal View Switcher & Export */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1e1e22] p-3.5 rounded-2xl border border-[#2a2a2f] backdrop-blur-md">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tasks, milestones, parent objectives, or scopes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Statuses</option>
              <option value="TODO" className="bg-[#1c1c1f]">To Do</option>
              <option value="IN_PROGRESS" className="bg-[#1c1c1f]">In Progress</option>
              <option value="REVIEW" className="bg-[#1c1c1f]">Review</option>
              <option value="COMPLETED" className="bg-[#1c1c1f]">Completed</option>
              <option value="ABANDONED" className="bg-[#1c1c1f]">Abandoned</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Priorities</option>
              <option value="CRITICAL" className="bg-[#1c1c1f]">Critical</option>
              <option value="HIGH" className="bg-[#1c1c1f]">High</option>
              <option value="MEDIUM" className="bg-[#1c1c1f]">Medium</option>
              <option value="LOW" className="bg-[#1c1c1f]">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#2a2a2f] rounded-xl px-2.5 py-1 text-xs">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-transparent text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#1c1c1f]">All Staff</option>
              {staffProfiles.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#1c1c1f]">
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Universal View Switcher */}
          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

          {/* Export Actions */}
          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export Tasks to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={handleExportPDF}
            className="p-2 rounded-xl bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 hover:text-white transition"
            title="Export Tasks to PDF"
          >
            <FileText className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* VIEW 1: DENSE OPERATIONAL TABLE VIEW WITH RESIZABLE HEADERS & MULTI-SORTING */}
      {viewMode === 'table' && (
        <div className="border border-[#2a2a2f] rounded-2xl overflow-hidden bg-[#1e1e22]/50 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181b] text-zinc-400 font-semibold border-b border-[#27272a] uppercase tracking-wider text-[10px]">
                <tr>
                  <ResizableTh
                    colKey="title"
                    width={widths.title}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('title')}
                    className="p-3.5 pl-4 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Task Title & Scope</span>
                    {sortField === 'title' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    )}
                  </ResizableTh>

                  <ResizableTh
                    colKey="parent"
                    width={widths.parent}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Parent Objective & Milestone
                  </ResizableTh>

                  <ResizableTh
                    colKey="priority"
                    width={widths.priority}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('priority')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Priority</span>
                    {sortField === 'priority' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    )}
                  </ResizableTh>

                  <ResizableTh
                    colKey="assigned"
                    width={widths.assigned}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Assigned Field Staff
                  </ResizableTh>

                  <ResizableTh
                    colKey="vehicles"
                    width={widths.vehicles}
                    onResizeStart={startResizing}
                    className="p-3.5"
                  >
                    Vehicle Target
                  </ResizableTh>

                  <ResizableTh
                    colKey="due"
                    width={widths.due}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('due_date')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Due Date</span>
                    {sortField === 'due_date' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    )}
                  </ResizableTh>

                  <ResizableTh
                    colKey="status"
                    width={widths.status}
                    onResizeStart={startResizing}
                    onClick={() => handleSort('status')}
                    className="p-3.5 cursor-pointer hover:bg-zinc-800/60 transition"
                  >
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    )}
                  </ResizableTh>

                  <th style={{ width: `${widths.action || 90}px` }} className="p-3.5 text-right pr-4">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] text-zinc-300">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      No tasks found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const parentObj = objectives.find((o) => o.id === t.objective_id);
                    const parentMs = milestones.find((m) => m.id === t.milestone_id);

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="hover:bg-zinc-800/40 cursor-pointer transition"
                      >
                        <td className="p-3.5 pl-4">
                          <div className="font-bold text-zinc-100 text-xs">{t.title}</div>
                          {t.description && (
                            <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{t.description}</div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="font-medium text-blue-300 truncate max-w-[180px]">
                            {parentObj?.title || 'Direct Objective'}
                          </div>
                          {parentMs && (
                            <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                              ↳ {parentMs.title}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <TaskPriorityBadge priority={t.priority} />
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(t.assigned_to || []).map((staffId) => {
                              const staff = staffProfiles.find((s) => s.id === staffId);
                              return (
                                <span
                                  key={staffId}
                                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]"
                                >
                                  {staff?.full_name.split(' ')[0] || staffId}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* 7.2 Vehicle Scope Column */}
                        <td className="p-3.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-mono font-bold border',
                              t.vehicle_scope === 'ALL'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : t.vehicle_ids && t.vehicle_ids.length > 0
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            )}
                          >
                            {t.vehicle_scope === 'ALL'
                              ? 'ALL EVs'
                              : t.vehicle_ids && t.vehicle_ids.length > 0
                              ? `${t.vehicle_ids.length} Specific EVs`
                              : 'General Hub'}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-zinc-400">
                          {t.due_date ? formatDate(t.due_date) : '-'}
                        </td>

                        <td className="p-3.5">
                          <TaskStatusBadge status={t.status} />
                        </td>

                        <td className="p-3.5 text-right pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(t);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#141416] hover:bg-[#202025] border border-[#2a2a2f] text-zinc-300 font-semibold text-xs transition"
                          >
                            Manage
                          </button>
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

      {/* VIEW 2: REPORT VIEW (HIERARCHY PROGRESS ACCORDION) */}
      {viewMode === 'report' && (
        <div className="space-y-4">
          {objectives.map((obj) => {
            const objMilestones = milestones.filter((m) => m.objective_id === obj.id);
            const objTasks = tasks.filter((t) => t.objective_id === obj.id);
            const completedCount = objTasks.filter((t) => t.status === 'COMPLETED').length;
            const progress = objTasks.length > 0 ? Math.round((completedCount / objTasks.length) * 100) : 0;

            return (
              <div key={obj.id} className="p-5 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#27272a] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-zinc-100">{obj.title}</h3>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-[10px] font-bold">
                        {progress}% Completed
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{obj.description}</p>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    Target: {formatDate(obj.target_date)}
                  </div>
                </div>

                {/* Milestones inside this objective */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {objMilestones.map((ms) => {
                    const msTasks = objTasks.filter((t) => t.milestone_id === ms.id);
                    return (
                      <div key={ms.id} className="p-3 rounded-xl bg-[#141416] border border-[#27272a] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200 text-xs flex items-center gap-1">
                            <Flag className="w-3 h-3 text-amber-400" />
                            <span>{ms.title}</span>
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">{msTasks.length} Tasks</span>
                        </div>
                        <div className="space-y-1">
                          {msTasks.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className="p-1.5 rounded bg-zinc-900/60 hover:bg-zinc-800 text-[11px] text-zinc-300 flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate pr-2">{t.title}</span>
                              <TaskStatusBadge status={t.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: KANBAN STATUS PIPELINE */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as TaskStatus[]).map((st) => {
            const list = filteredTasks.filter((t) => t.status === st);
            return (
              <div key={st} className="p-4 rounded-2xl bg-[#1e1e22] border border-[#2a2a2f] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200">{st}</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {list.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {list.length === 0 ? (
                    <div className="p-6 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl">
                      No tasks in {st}.
                    </div>
                  ) : (
                    list.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3 rounded-xl bg-[#141416] border border-[#27272a] hover:border-zinc-600 cursor-pointer transition text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <TaskPriorityBadge priority={t.priority} />
                          <span className="text-[10px] font-mono text-zinc-500">
                            {t.due_date ? formatDate(t.due_date) : ''}
                          </span>
                        </div>
                        <div className="font-bold text-zinc-200">{t.title}</div>
                        {t.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2">{t.description}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {/* 1. Modal: Create Objective */}
      {objectiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span>Create Strategic Objective</span>
              </h3>
              <button
                onClick={() => setObjectiveModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateObjective} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Objective Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Expand Active CS Fleet Availability to 95%"
                  value={objTitle}
                  onChange={(e) => setObjTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description & Impact</label>
                <textarea
                  rows={3}
                  placeholder="Strategic details and target operational KPIs..."
                  value={objDesc}
                  onChange={(e) => setObjDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={objStartDate}
                    onChange={(e) => setObjStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Target Date</label>
                  <input
                    type="date"
                    value={objTargetDate}
                    onChange={(e) => setObjTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setObjectiveModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                >
                  Create Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Create Milestone (7.1) */}
      {milestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                <span>Create Strategic Milestone</span>
              </h3>
              <button
                onClick={() => setMilestoneModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Parent Objective *</label>
                <select
                  required
                  value={msObjectiveId}
                  onChange={(e) => setMsObjectiveId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none cursor-pointer"
                >
                  {objectives.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Phase 1 Firmware & Brake Calibrations"
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Target Completion Date</label>
                <input
                  type="date"
                  value={msTargetDate}
                  onChange={(e) => setMsTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setMilestoneModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition shadow-sm"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Create Task (7.1 & 7.2) */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1c1c1f] border border-[#2a2a2f] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-emerald-400" />
                <span>Create Field Work Order Task</span>
              </h3>
              <button
                onClick={() => setTaskModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Parent Objective *</label>
                <select
                  required
                  value={taskObjectiveId}
                  onChange={(e) => {
                    setTaskObjectiveId(e.target.value);
                    setTaskMilestoneId('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none cursor-pointer"
                >
                  {objectives.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Milestone Selection (Optional) */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Linked Milestone (Optional)</label>
                <select
                  value={taskMilestoneId}
                  onChange={(e) => setTaskMilestoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Milestone (Direct to Objective) --</option>
                  {milestones
                    .filter((m) => m.objective_id === taskObjectiveId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect front brake disc calipers on Ola Batch 2"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Task Scope & Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Provide step-by-step instructions for mechanics or field staff..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 7.2 Vehicle Association Selector */}
              <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#27272a]">
                <label className="text-zinc-300 font-bold block text-[11px] uppercase tracking-wider">
                  Vehicle Target Scope (7.2)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'NONE', label: 'No Vehicle (General)' },
                    { id: 'ALL', label: 'All Fleet (Fleet-Wide)' },
                    { id: 'SPECIFIC', label: 'Specific Vehicles' },
                  ].map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => setVehicleScope(scope.id as any)}
                      className={cn(
                        'p-2 rounded-lg text-center font-bold text-[11px] transition border',
                        vehicleScope === scope.id
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      )}
                    >
                      {scope.label}
                    </button>
                  ))}
                </div>

                {/* Specific Vehicles Multi-Select Picker */}
                {vehicleScope === 'SPECIFIC' && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      Select specific vehicles ({selectedVehicleIds.length} selected):
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {vehicles.map((v) => {
                        const isChecked = selectedVehicleIds.includes(v.id);
                        return (
                          <div
                            key={v.id}
                            onClick={() => {
                              setSelectedVehicleIds((prev) =>
                                isChecked ? prev.filter((id) => id !== v.id) : [...prev, v.id]
                              );
                            }}
                            className={cn(
                              'flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-[11px] transition',
                              isChecked
                                ? 'bg-emerald-500/15 text-emerald-200 font-bold'
                                : 'text-zinc-400 hover:bg-zinc-800'
                            )}
                          >
                            <span>Key #{v.key_number} ({v.custom_vehicle_id || v.vehicle_id})</span>
                            {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#2a2a2f] text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition shadow-sm"
                >
                  Assign Field Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
