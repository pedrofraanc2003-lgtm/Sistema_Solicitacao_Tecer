import React from 'react';
import { cn } from '../lib/cn';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'muted' | 'hero';
}

const toneClasses: Record<NonNullable<PanelProps['tone']>, string> = {
  default:
    'border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(255,253,250,0.98),rgba(245,239,230,0.9))] shadow-[var(--shadow-card)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(27,35,45,0.98),rgba(20,27,34,0.94))]',
  muted:
    'border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(247,242,234,0.92),rgba(240,233,223,0.88))] shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(23,29,37,0.92),rgba(18,24,31,0.88))]',
  hero:
    'border-[color:var(--color-border-contrast)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(238,229,216,0.94))] shadow-[var(--shadow-card)] dark:border-[color:var(--color-border-contrast)] dark:bg-[linear-gradient(180deg,rgba(27,35,45,0.98),rgba(22,29,36,0.92))]',
};

export function Panel({ className, tone = 'default', ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border p-5 transition-[background-color,border-color,box-shadow] duration-150 before:pointer-events-none before:absolute before:inset-[14px] before:rounded-[20px] before:border before:border-white/40 before:content-[""] dark:before:border-white/4 md:p-6',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export default Panel;
