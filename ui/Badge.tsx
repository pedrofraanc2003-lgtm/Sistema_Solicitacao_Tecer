import React from 'react';
import { cn } from '../lib/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'info' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'border-[color:var(--color-border)] bg-[rgba(255,255,255,0.54)] text-[color:var(--color-text-soft)] dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.05)] dark:text-[color:var(--color-text-soft)]',
  info: 'border-[rgba(36,93,143,0.16)] bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] dark:border-[rgba(156,196,232,0.2)] dark:bg-[rgba(156,196,232,0.12)] dark:text-[color:var(--color-info)]',
  success: 'border-[rgba(45,107,87,0.16)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] dark:border-[rgba(139,192,162,0.2)] dark:bg-[rgba(139,192,162,0.12)] dark:text-[color:var(--color-success)]',
  warning: 'border-[rgba(154,106,46,0.16)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] dark:border-[rgba(217,176,109,0.2)] dark:bg-[rgba(217,176,109,0.12)] dark:text-[color:var(--color-warning)]',
  danger: 'border-[rgba(161,74,71,0.16)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)] dark:border-[rgba(223,142,139,0.2)] dark:bg-[rgba(223,142,139,0.12)] dark:text-[color:var(--color-danger)]',
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export default Badge;
