import React from 'react';
import { cn } from '../lib/cn';

export function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'tecer-toolbar flex flex-wrap items-center gap-4 rounded-[24px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,250,255,0.96))] p-4 shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(16,34,56,0.95),rgba(13,34,57,0.92))]',
        className
      )}
      {...props}
    />
  );
}

export default Toolbar;
