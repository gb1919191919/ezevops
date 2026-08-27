'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { useRBAC } from '@/hooks/useRBAC';
import { Objective, TaskItem, TaskPriority, TaskStatus } from '@/types';
import { TaskPriorityBadge, TaskStatusBadge } from '../common/StatusBadge';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { formatDateOnly, cn } from '@/lib/utils';
import {
  CheckCircle2,
  Plus,
  Calendar,
  User,
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
  LayoutGrid,
  List,
} from 'lucide-react';
import { toast } from 'sonner';

export function TasksEngine() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Objective creation modal state
  const [objectiveModalOpen, setObjectiveModalOpen] = useState(false);
  const [objTitle, setObjTitle] = useState('');
  const [objDesc, setObjDesc] = useState('');
  const [objHubId, setObjHubId] = useState('');
  const [objStartDate, setObjStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [objTargetDate, setObjTargetDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // Task creation modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskObjectiveId, setTaskObjectiveId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskVehicleId, setTaskVehicleId] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );

  const objectives = useAppStore((s) => s.objectives);
  const tasks = useAppStore((s) => s.tasks);
  const hubs = useAppStore((s) => s.hubs);
  const vehicles = useAppStore((s) => s.vehicles);
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const activeHubId = useAppStore((s) => s.activeHubId);
  const createObjective = useAppStore((s) => s.createObjective);
  const createTask = useAppStore((s) => s.createTask);
  const updateTaskStatus = useAppStore((s) => s.updateTaskStatus);
  const currentUser = useAppStore((s) => s.currentUser);
  const { isOwner, isManager } = useRBAC();

  const filteredObjectives = objectives.filter((obj) => {
    if (activeHubId !== 'ALL' && obj.hub_id !== activeHubId) return false;
    return true;
  });

  const filteredTasks = tasks.filter((t) => {
    const isFullAdmin = isOwner || isManager;
    if (!isFullAdmin) {
      const isAssigned = (t.assigned_to || []).includes(currentUser.id);
      const isCreator = t.created_by === currentUser.id;
      const parentObj = objectives.find((o) => o.id === t.objective_id);
      const isUserHub = currentUser.assigned_hub_id && parentObj?.hub_id === currentUser.assigned_hub_id;
      if (!isAssigned && !isCreator && !isUserHub) return false;
    }

    if (selectedStatusFilter !== 'ALL' && t.status !== selectedStatusFilter) return false;
    return true;
  });

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
      created_by: currentUser.id,
    });

    toast.success('Objective created successfully!');
    setObjectiveModalOpen(false);
    setObjTitle('');
    setObjDesc('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskObjectiveId) {
      toast.error('Task title and parent objective are required.');
      return;
    }
    const assignees = taskAssignees.length > 0 ? taskAssignees : [currentUser.id];

    createTask({
      objective_id: taskObjectiveId,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      assigned_to: assignees,
      priority: taskPriority,
      status: 'TODO',
      vehicle_id: taskVehicleId || null,
      start_date: new Date().toISOString(),
      due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
      completed_at: null,
      created_by: currentUser.id,
    });

    toast.success('Task created and assigned!');
    setTaskModalOpen(false);
    setTaskTitle('');
    setTaskDesc('');
    setTaskAssignees([]);
  };

  const cycleStatus = (e: React.MouseEvent, taskId: string, currentStatus: TaskStatus) => {
    e.stopPropagation();
    const cycleMap: Record<TaskStatus, TaskStatus> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'REVIEW',
      REVIEW: 'COMPLETED',
      COMPLETED: 'ABANDONED',
      ABANDONED: 'TODO',
    };
    const next = cycleMap[currentStatus];
    updateTaskStatus(taskId, next);
    toast.success(`Task advanced to ${next}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Objectives & Operational Tasks
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Multi-assignee execution, remarks discussion thread, and task lifecycle tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1',
                viewMode === 'list'
                  ? 'bg-zinc-800 text-zinc-100 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1',
                viewMode === 'kanban'
                  ? 'bg-zinc-800 text-zinc-100 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {(isOwner || isManager) && (
            <>
              <button
                onClick={() => {
                  setObjHubId(hubs[0]?.id || '');
                  setObjectiveModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Objective</span>
              </button>

              <button
                onClick={() => {
                  setTaskObjectiveId(objectives[0]?.id || '');
                  setTaskModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ABANDONED'] as TaskStatus[]).map((status) => {
            const columnTasks = filteredTasks.filter((t) => t.status === status);
            return (
              <div
                key={status}
                className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    {status.replace('_', ' ')}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[250px]">
                  {columnTasks.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-zinc-600 border border-dashed border-zinc-800/80 rounded-xl">
                      No tasks
                    </div>
                  ) : (
                    columnTasks.map((t) => {
                      const linkedVehicle = vehicles.find((v) => v.id === t.vehicle_id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer space-y-2 transition shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <TaskPriorityBadge priority={t.priority} />
                            {t.due_date && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {formatDateOnly(t.due_date)}
                              </span>
                            )}
                          </div>

                          <h4
                            className={cn(
                              'text-xs font-semibold text-zinc-200',
                              t.status === 'ABANDONED' && 'line-through text-zinc-500'
                            )}
                          >
                            {t.title}
                          </h4>

                          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-900">
                            <span className="flex items-center gap-1 font-mono">
                              <Users className="w-3 h-3 text-zinc-500" />
                              {t.assigned_to.length}
                            </span>
                            {linkedVehicle && (
                              <span className="font-mono text-zinc-400">
                                Key: {linkedVehicle.key_number}
                              </span>
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
      ) : (
        /* Objectives & Tasks Hierarchical List View */
        <div className="space-y-6">
          {filteredObjectives.length === 0 ? (
            <div className="p-12 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40 text-zinc-500 text-xs">
              No active operational objectives found for this hub.
            </div>
          ) : (
            filteredObjectives.map((obj) => {
              const hub = hubs.find((h) => h.id === obj.hub_id);
              const objTasks = tasks.filter((t) => {
                if (t.objective_id !== obj.id) return false;
                if (selectedStatusFilter !== 'ALL' && t.status !== selectedStatusFilter) return false;
                return true;
              });

              const completedTasks = objTasks.filter((t) => t.status === 'COMPLETED').length;
              const progress =
                objTasks.length > 0 ? Math.round((completedTasks / objTasks.length) * 100) : 0;

              return (
                <div
                  key={obj.id}
                  className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 shadow-sm"
                >
                  {/* Objective Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                          {hub?.name.split(' (')[0] || 'Central Hub'}
                        </span>
                        <h3 className="font-bold text-base text-zinc-100">{obj.title}</h3>
                      </div>
                      {obj.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1">{obj.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                          Target Due
                        </span>
                        <span className="text-zinc-300 font-bold">{formatDateOnly(obj.target_date)}</span>
                      </div>

                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">Progress</span>
                          <span className="text-emerald-400 font-bold">{progress}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nested Task Cards */}
                  <div className="space-y-2">
                    {objTasks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                        No tasks assigned to this objective yet.
                      </div>
                    ) : (
                      objTasks.map((t) => {
                        const linkedVehicle = vehicles.find((v) => v.id === t.vehicle_id);

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition flex items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Tap to cycle status */}
                              <button
                                onClick={(e) => cycleStatus(e, t.id, t.status)}
                                className={cn(
                                  'w-6 h-6 rounded-lg flex items-center justify-center transition flex-shrink-0',
                                  t.status === 'COMPLETED'
                                    ? 'bg-emerald-500 text-black'
                                    : t.status === 'ABANDONED'
                                    ? 'bg-zinc-800 text-zinc-500'
                                    : 'bg-zinc-900 border border-zinc-700 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
                                )}
                                title="Click to cycle status"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'font-bold text-xs text-zinc-200 group-hover:text-emerald-300 transition truncate',
                                      t.status === 'COMPLETED' && 'line-through text-zinc-500',
                                      t.status === 'ABANDONED' && 'line-through text-zinc-600'
                                    )}
                                  >
                                    {t.title}
                                  </span>
                                  <TaskPriorityBadge priority={t.priority} />
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                                  {linkedVehicle && (
                                    <span className="flex items-center gap-1 font-mono text-zinc-400">
                                      <Car className="w-3 h-3 text-emerald-400" />
                                      {linkedVehicle.vehicle_id} ({linkedVehicle.key_number})
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 font-mono text-zinc-400">
                                    <Users className="w-3 h-3 text-zinc-400" />
                                    {t.assigned_to.length} Assignees
                                  </span>
                                  {t.remarks && t.remarks.length > 0 && (
                                    <span className="flex items-center gap-1 text-zinc-400">
                                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                                      {t.remarks.length} Remarks
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <TaskStatusBadge status={t.status} />
                              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Task Detail Drawer */}
      <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />

      {/* Create Objective Modal */}
      {objectiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Create Hub Objective</h3>

            <form onSubmit={handleCreateObjective} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Objective Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koramangala Hub Safety & Brake Audit"
                  value={objTitle}
                  onChange={(e) => setObjTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Target Hub Location</label>
                <select
                  value={objHubId}
                  onChange={(e) => setObjHubId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={objStartDate}
                    onChange={(e) => setObjStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Target Due Date</label>
                  <input
                    type="date"
                    value={objTargetDate}
                    onChange={(e) => setObjTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Description / Scope</label>
                <textarea
                  rows={3}
                  placeholder="Detail the operational requirements..."
                  value={objDesc}
                  onChange={(e) => setObjDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setObjectiveModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Create Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Create Field Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Parent Objective</label>
                <select
                  value={taskObjectiveId}
                  onChange={(e) => setTaskObjectiveId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  {objectives.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect brake caliper torques on Key B001"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Linked EV (Optional)</label>
                  <select
                    value={taskVehicleId}
                    onChange={(e) => setTaskVehicleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  >
                    <option value="">No vehicle linked</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_id} ({v.key_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Assign Field Staff (Multi-Select)</label>
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-zinc-900 border border-zinc-700 max-h-32 overflow-y-auto">
                  {staffProfiles.map((staff) => {
                    const isSelected = taskAssignees.includes(staff.id);
                    return (
                      <button
                        type="button"
                        key={staff.id}
                        onClick={() => {
                          if (isSelected) {
                            setTaskAssignees(taskAssignees.filter((id) => id !== staff.id));
                          } else {
                            setTaskAssignees([...taskAssignees, staff.id]);
                          }
                        }}
                        className={cn(
                          'p-1.5 rounded-lg border text-left text-[11px] transition flex items-center justify-between',
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        )}
                      >
                        <span className="truncate">{staff.full_name.split(' (')[0]}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
