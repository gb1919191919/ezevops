'use client';

import React from 'react';
import {
  VehicleStatus,
  TaskPriority,
  TaskStatus,
  ApprovalStatus,
  RefundStatus,
  ChargerStatus,
  HubType,
} from '@/types';
import {
  getVehicleStatusBadge,
  getTaskPriorityBadge,
  getTaskStatusBadge,
  getApprovalBadge,
  getRefundBadge,
  getChargerStatusBadge,
  getHubTypeBadge,
  cn,
} from '@/lib/utils';
import { Shield, Clock, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

interface StatusBadgeProps {
  status: VehicleStatus;
  pendingStatus?: VehicleStatus | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VehicleStatusBadge({
  status,
  pendingStatus,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const badge = getVehicleStatusBadge(status, pendingStatus);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg font-bold uppercase tracking-wider border font-mono transition shadow-sm',
          badge.bg,
          badge.text,
          badge.border,
          sizeClasses[size]
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{badge.label}</span>
      </span>

      {/* Two-Phase Staging Pending Pill */}
      {badge.hasPending && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-lg font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse',
            sizeClasses[size]
          )}
          title={`Pending approval to transition to ${badge.pendingLabel}`}
        >
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Stage: {badge.pendingLabel}</span>
        </span>
      )}
    </div>
  );
}

export function ChargerStatusBadge({ status }: { status: ChargerStatus }) {
  const badge = getChargerStatusBadge(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border font-mono',
        badge.bg,
        badge.text,
        badge.border
      )}
    >
      <Zap className="w-3 h-3" />
      <span>{badge.label}</span>
    </span>
  );
}

export function HubTypeBadge({ type }: { type: HubType }) {
  const badge = getHubTypeBadge(type);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border font-mono',
        badge.bg,
        badge.text,
        badge.border
      )}
    >
      <span>{badge.label}</span>
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const badge = getTaskPriorityBadge(priority);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border font-mono',
        badge.bg,
        badge.text,
        badge.border
      )}
    >
      <span>{badge.label}</span>
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const badge = getTaskStatusBadge(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border font-mono',
        badge.bg,
        badge.text,
        badge.border
      )}
    >
      <span>{badge.label}</span>
    </span>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const badge = getApprovalBadge(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border font-mono',
        badge.bg,
        badge.text,
        badge.border
      )}
    >
      <span>{badge.label}</span>
    </span>
  );
}

export function RefundBadge({ status }: { status: RefundStatus }) {
  const badge = getRefundBadge(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border font-mono',
        badge.bg,
        badge.text,
        badge.border
      )}
    >
      <span>{badge.label}</span>
    </span>
  );
}
