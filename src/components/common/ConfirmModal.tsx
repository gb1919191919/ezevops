'use client';

import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onClose,
  children,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: ShieldAlert,
      iconBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/30',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/30',
    },
    primary: {
      icon: Info,
      iconBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/30',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30',
    },
  }[variant];

  const Icon = variantStyles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#1c1c1f] border border-[#2e2e33] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className={cn('w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0', variantStyles.iconBg)}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="text-base font-bold text-zinc-100">{title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Optional Custom Content */}
        {children && <div className="pt-1">{children}</div>}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#27272a]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn('px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50', variantStyles.btn)}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
