'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { TaskItem, TaskPriority, TaskStatus, Profile } from '@/types';
import { TaskPriorityBadge, TaskStatusBadge } from '../common/StatusBadge';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  Send,
  History,
  MessageSquare,
  AlertTriangle,
  Car,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

interface TaskDetailDrawerProps {
  task: TaskItem | null;
  onClose: () => void;
}

export function TaskDetailDrawer({ task, onClose }: TaskDetailDrawerProps) {
  const [remarkInput, setRemarkInput] = useState('');
  const currentUser = useAppStore((s) => s.currentUser);
  const vehicles = useAppStore((s) => s.vehicles);
  const staffProfiles = useAppStore((s) => s.staffProfiles);
  const updateTaskStatus = useAppStore((s) => s.updateTaskStatus);
  const updateTaskAssignees = useAppStore((s) => s.updateTaskAssignees);
  const addTaskRemark = useAppStore((s) => s.addTaskRemark);

  if (!task) return null;

  const vehicle = vehicles.find((v) => v.id === task.vehicle_id);

  const handleSendRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkInput.trim()) return;

    addTaskRemark(task.id, remarkInput.trim());
    toast.success('Remark posted to task timeline.');
    setRemarkInput('');
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTaskStatus(task.id, newStatus);
    toast.success(`Task status updated to ${newStatus}`);
  };

  const toggleAssignee = (profileId: string) => {
    const current = task.assigned_to || [];
    let updated: string[];
    if (current.includes(profileId)) {
      if (current.length === 1) {
        toast.error('Task must have at least one assignee.');
        return;
      }
      updated = current.filter((id) => id !== profileId);
    } else {
      updated = [...current, profileId];
    }
    updateTaskAssignees(task.id, updated);
    toast.success('Task assignees updated.');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-950">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">Task #{task.id.slice(0, 8)}</span>
              <TaskPriorityBadge priority={task.priority} />
            </div>
            <h2
              className={cn(
                'text-base font-bold text-zinc-100',
                task.status === 'ABANDONED' && 'line-through text-zinc-500'
              )}
            >
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-zinc-300">
          {/* Status Selection (Includes ABANDONED) */}
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between flex-wrap gap-2">
            <span className="text-zinc-400 font-semibold">Workflow Status:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ABANDONED'] as TaskStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition',
                    task.status === st
                      ? st === 'ABANDONED'
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        : 'bg-emerald-500 text-black shadow-md'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  )}
                >
                  {st === 'ABANDONED' ? 'ABANDON' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              Task Instructions & Scope
            </span>
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-200 leading-relaxed">
              {task.description || 'No additional instructions provided for this field task.'}
            </div>
          </div>

          {/* Multi-Assignees Selection */}
          <div className="space-y-2">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Assigned Field Staff (Multi-Assignee)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {staffProfiles.map((staff) => {
                const isAssigned = (task.assigned_to || []).includes(staff.id);
                return (
                  <button
                    key={staff.id}
                    onClick={() => toggleAssignee(staff.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition',
                      isAssigned
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <span>{staff.full_name.split(' (')[0]}</span>
                    {isAssigned && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates & Linked Vehicle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 font-semibold flex items-center gap-1 text-[10px] uppercase">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Target Due Date
              </span>
              <p className="font-mono font-bold text-zinc-200">
                {task.due_date ? formatDate(task.due_date) : 'No due date set'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 font-semibold flex items-center gap-1 text-[10px] uppercase">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                Linked Vehicle
              </span>
              <p className="font-mono font-bold text-zinc-200 truncate">
                {vehicle ? `${vehicle.vehicle_id} (Key: ${vehicle.key_number})` : 'General Hub Task'}
              </p>
            </div>
          </div>

          {/* Remarks Thread */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Remarks & Notes Timeline
              </span>
              <span className="text-zinc-500 text-[10px] font-mono">
                {task.remarks?.length || 0} Entries
              </span>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {!task.remarks || task.remarks.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
                  No remarks posted yet. Write a comment below.
                </div>
              ) : (
                task.remarks.map((rem) => (
                  <div key={rem.id} className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">
                        {rem.author_name}{' '}
                        {rem.author_role && <span className="text-zinc-500 font-normal text-[10px]">({rem.author_role})</span>}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatRelativeTime(rem.created_at)}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px]">{rem.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Remark Form */}
            <form onSubmit={handleSendRemark} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Post a remark or observation..."
                value={remarkInput}
                onChange={(e) => setRemarkInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
              <button
                type="submit"
                disabled={!remarkInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 disabled:opacity-40 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>
          </div>

          {/* Changelog / Audit Trail */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-zinc-400" />
              Task Modification Changelog
            </span>

            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {!task.changelog || task.changelog.length === 0 ? (
                <p className="text-zinc-500 text-[11px]">No modifications logged yet.</p>
              ) : (
                task.changelog.map((ch) => (
                  <div key={ch.id} className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-800 text-[11px] flex items-center justify-between">
                    <div>
                      <strong className="text-zinc-300">{ch.performer_name}</strong>{' '}
                      <span className="text-zinc-500">changed {ch.field_changed} from</span>{' '}
                      <code className="text-zinc-400">{ch.old_value}</code> ➔{' '}
                      <code className="text-emerald-400">{ch.new_value}</code>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {formatRelativeTime(ch.changed_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
