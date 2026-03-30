import React from 'react';
import { cn } from '../lib/cn';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'min-h-[44px] w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] px-4 py-3 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-muted-soft)] shadow-[var(--shadow-inset)] outline-none hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-tint)] focus:border-[color:var(--color-secondary)] focus:bg-[color:var(--color-surface-strong)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--color-border)] dark:bg-[rgba(19,44,72,0.72)] dark:text-[color:var(--color-text)] dark:hover:bg-[rgba(24,53,85,0.88)] dark:focus:bg-[rgba(24,53,85,0.96)]',
          className
        )}
        {...props}
      />
    );
  }
);

export default Input;
