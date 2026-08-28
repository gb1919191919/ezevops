import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  VehicleStatus,
  ApprovalStatus,
  RefundStatus,
  ChargerStatus,
  HubType,
  TaskStatus,
  TaskPriority,
} from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const hasDecimals = amount % 1 !== 0;
  if (!hasDecimals) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  const str = amount.toString();
  const decimals = str.split('.')[1] || '';
  const fractionDigits = Math.min(3, Math.max(2, decimals.length));
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 3,
  }).format(amount);
}

export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }
  if (!cleaned.startsWith('+') && cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

export function getWhatsAppLink(phone?: string | null, contactName?: string, hubName?: string): string {
  if (!phone) return '#';
  let digitsOnly = phone.replace(/[^\d]/g, '');
  if (digitsOnly.length === 10) {
    digitsOnly = '91' + digitsOnly;
  }
  const greeting = encodeURIComponent(
    `Hello ${contactName || 'there'}, regarding EzEv Operations at ${hubName || 'the Hub'}:`
  );
  return `https://wa.me/${digitsOnly}?text=${greeting}`;
}

export function getTelLink(phone?: string | null): string {
  if (!phone) return '#';
  let digits = phone.replace(/[^\d+]/g, '');
  if (!digits.startsWith('+') && digits.length === 10) {
    digits = '+91' + digits;
  }
  return `tel:${digits}`;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDateTime(dateString?: string | null): string {
  return formatDate(dateString);
}

export function formatDateOnly(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Eliminate relative fuzzy times: Return standardized absolute date-time stamp everywhere
export function formatRelativeTime(dateString?: string | null): string {
  return formatDate(dateString);
}

export function getVehicleStatusBadge(status: VehicleStatus, pendingStatus?: VehicleStatus | null) {
  let label = status;
  let bg = 'bg-zinc-800/80';
  let text = 'text-zinc-300';
  let border = 'border-zinc-700';
  let dotColor = 'bg-zinc-400';

  switch (status) {
    case 'Available':
      bg = 'bg-emerald-500/10';
      text = 'text-emerald-300';
      border = 'border-emerald-500/30';
      dotColor = 'bg-emerald-400';
      break;
    case 'Needs Maintenance':
      label = 'Needs Maint' as VehicleStatus;
      bg = 'bg-amber-500/10';
      text = 'text-amber-300';
      border = 'border-amber-500/30';
      dotColor = 'bg-amber-400';
      break;
    case 'Under Repair':
      bg = 'bg-rose-500/10';
      text = 'text-rose-300';
      border = 'border-rose-500/30';
      dotColor = 'bg-rose-400';
      break;
    case 'Not Available':
      bg = 'bg-zinc-900';
      text = 'text-zinc-500';
      border = 'border-zinc-800';
      dotColor = 'bg-zinc-600';
      break;
  }

  return {
    label,
    bg,
    text,
    border,
    dotColor,
    hasPending: Boolean(pendingStatus),
    pendingLabel: pendingStatus || '',
  };
}

export function getTaskPriorityBadge(priority: TaskPriority) {
  switch (priority) {
    case 'CRITICAL':
      return { label: 'Critical', bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' };
    case 'HIGH':
      return { label: 'High', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' };
    case 'MEDIUM':
      return { label: 'Medium', bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' };
    case 'LOW':
      return { label: 'Low', bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' };
    default:
      return { label: priority, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  }
}

export function getTaskStatusBadge(status: TaskStatus) {
  switch (status) {
    case 'TODO':
      return { label: 'To Do', bg: 'bg-zinc-800/80', text: 'text-zinc-300', border: 'border-zinc-700' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' };
    case 'REVIEW':
      return { label: 'Review', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' };
    case 'COMPLETED':
      return { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    case 'ABANDONED':
      return { label: 'Abandoned', bg: 'bg-zinc-900', text: 'text-zinc-500', border: 'border-zinc-800' };
    default:
      return { label: status, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  }
}

export function getChargerStatusBadge(status: ChargerStatus) {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    case 'CONNECTOR_NOT_WORKING':
      return { label: 'Connector Defect', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' };
    case 'CONNECTOR_DAMAGED':
      return { label: 'Connector Damaged', bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' };
    case 'CHARGER_DAMAGED':
      return { label: 'Charger Damaged', bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' };
    case 'POWER_LINE_ISSUE':
      return { label: 'Power Line Issue', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' };
    case 'OFFLINE_TRIPPED':
      return { label: 'Offline / Tripped', bg: 'bg-zinc-900', text: 'text-zinc-500', border: 'border-zinc-800' };
    default:
      return { label: status, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  }
}

export function getHubTypeBadge(type: HubType) {
  switch (type) {
    case 'STOCK_HUB':
      return { label: 'Central Stock Hub', bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' };
    case 'BIKE_HUB':
      return { label: 'Bike Hub', bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' };
    default:
      return { label: type, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  }
}

export function getApprovalBadge(status: ApprovalStatus) {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    case 'PENDING':
      return { label: 'Pending Review', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' };
    case 'REJECTED':
      return { label: 'Rejected', bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' };
    default:
      return { label: status, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  }
}

export function getRefundBadge(status: RefundStatus) {
  switch (status) {
    case 'SETTLED':
      return { label: 'Settled', bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    case 'VERIFIED':
      return { label: 'Verified', bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' };
    case 'SUBMITTED':
      return { label: 'Claim Submitted', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' };
    case 'REJECTED':
      return { label: 'Rejected', bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' };
    default:
      return { label: status, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  }
}
