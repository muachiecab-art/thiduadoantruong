import React, { useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  X,
} from 'lucide-react';
import { LessonRating } from '../../types/classbook';
import { getRatingBadgeTone } from '../../utils/scoring';

export function RatingBadge({ rating }: { rating: LessonRating }) {
  const tone = getRatingBadgeTone(rating);
  const icon =
    rating === 'Tốt' ? (
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
    ) : rating === 'Khá' ? (
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
    ) : rating === 'Đạt' ? (
      <Clock className="w-3.5 h-3.5 shrink-0" />
    ) : (
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${tone.bg} ${tone.text} ${tone.border}`}
    >
      {icon}
      <span>{rating}</span>
    </span>
  );
}

export function StatusTag({
  tone,
  label,
}: {
  tone: 'green' | 'blue' | 'amber' | 'red' | 'slate';
  label: string;
}) {
  const map = {
    green:
      'bg-emerald-50 text-[#16A34A] border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
    blue: 'bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
    amber:
      'bg-amber-50 text-[#D97706] border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
    red: 'bg-red-50 text-[#DC2626] border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60',
    slate:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-medium whitespace-nowrap ${map[tone]}`}
    >
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-slate-50">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-xs ${className}`}
    >
      {children}
    </div>
  );
}

export function ModalDialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800">
          <div>
            <h2
              id="modal-title"
              className="text-base font-bold text-[#0F172A] dark:text-slate-50"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
        {icon || <ShieldAlert className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
        {title}
      </h3>
      <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-sm">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
