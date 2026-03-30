import React from 'react';
import { cn } from '../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'border-[color:var(--color-primary)] bg-[linear-gradient(180deg,var(--color-primary),var(--color-primary-strong))] text-white shadow-[var(--shadow-primary)] hover:border-[color:var(--color-primary-strong)] hover:brightness-[1.03]',
  secondary:
    'border-[color:var(--color-border-strong)] bg-[linear-gradient(180deg,var(--color-surface-strong),var(--color-surface-soft))] text-[color:var(--color-text)] shadow-[var(--shadow-soft)] hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(27,35,45,0.98),rgba(20,27,34,0.96))] dark:text-[color:var(--color-text)]',
  ghost:
    'border-transparent bg-transparent text-[color:var(--color-primary)] shadow-none hover:bg-[color:var(--color-primary-ghost)] dark:text-[color:var(--color-primary)] dark:hover:bg-[rgba(217,192,160,0.1)]',
  danger:
    'border-[color:var(--color-danger)] bg-[linear-gradient(180deg,var(--color-danger),#873936)] text-white shadow-[0_16px_32px_rgba(161,74,71,0.2)] hover:brightness-[1.03]',
  subtle:
    'border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] text-[color:var(--color-text-soft)] shadow-[var(--shadow-soft)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)] dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)] dark:text-[color:var(--color-text-soft)]',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all duration-150 focus-visible:outline-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});

export default Button;
