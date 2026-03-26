import React from 'react';
import { cn } from '../lib/cn';

export function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'tecer-toolbar flex flex-wrap items-center gap-4 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard',
        className
      )}
      {...props}
    />
  );
}

export default Toolbar;
