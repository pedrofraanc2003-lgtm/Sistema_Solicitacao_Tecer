import React from 'react';
import { cn } from '../lib/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'info' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export default Badge;
