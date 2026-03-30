import React from 'react';
import { cn } from '../lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'muted' | 'hero';
}

export function Card({ className, tone = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[28px] border transition-[background-color,border-color,box-shadow,transform] duration-150',
        tone === 'default'
          ? 'border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(255,253,250,0.98),rgba(245,239,230,0.92))] shadow-[var(--shadow-card)] hover:-translate-y-0.5 dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(27,35,45,0.98),rgba(20,27,34,0.94))]'
          : tone === 'hero'
            ? 'border-[color:var(--color-border-contrast)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(238,229,216,0.94))] shadow-[var(--shadow-card)] dark:border-[color:var(--color-border-contrast)] dark:bg-[linear-gradient(180deg,rgba(27,35,45,0.98),rgba(22,29,36,0.92))]'
            : 'border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(247,242,234,0.92),rgba(240,233,223,0.88))] shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(23,29,37,0.92),rgba(18,24,31,0.88))]',
        className
      )}
      {...props}
    />
  );
}

export default Card;
