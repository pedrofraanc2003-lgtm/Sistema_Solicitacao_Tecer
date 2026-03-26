import React from 'react';
import { cn } from '../lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'muted';
}

export function Card({ className, tone = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border shadow-sm',
        tone === 'default'
          ? 'bg-white border-gray-100 dark:bg-tecer-darkCard dark:border-gray-700'
          : 'bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700',
        className
      )}
      {...props}
    />
  );
}

export default Card;
