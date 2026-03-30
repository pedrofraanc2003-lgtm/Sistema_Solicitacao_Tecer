import React from 'react';
import { cn } from '../lib/cn';

interface StatusPillProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'info' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<StatusPillProps['tone']>, string> = {
  info: 'border-[rgba(36,93,143,0.14)] bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] dark:border-[rgba(156,196,232,0.2)] dark:bg-[rgba(156,196,232,0.12)] dark:text-[color:var(--color-info)]',
  success: 'border-[rgba(45,107,87,0.14)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] dark:border-[rgba(139,192,162,0.2)] dark:bg-[rgba(139,192,162,0.12)] dark:text-[color:var(--color-success)]',
  warning: 'border-[rgba(154,106,46,0.14)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] dark:border-[rgba(217,176,109,0.2)] dark:bg-[rgba(217,176,109,0.12)] dark:text-[color:var(--color-warning)]',
  danger: 'border-[rgba(161,74,71,0.14)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)] dark:border-[rgba(223,142,139,0.2)] dark:bg-[rgba(223,142,139,0.12)] dark:text-[color:var(--color-danger)]',
};

export function StatusPill({ className, tone = 'info', ...props }: StatusPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] shadow-[var(--shadow-inset)]',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export default StatusPill;
