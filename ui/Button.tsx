import React from 'react';
import { cn } from '../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-tecer-primary text-white hover:bg-[#004996] shadow-lg shadow-tecer-primary/20',
  secondary: 'bg-white text-tecer-primary border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700',
  ghost: 'text-tecer-primary hover:bg-tecer-primary/5 dark:text-tecer-secondary dark:hover:bg-gray-800',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
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
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});

export default Button;
