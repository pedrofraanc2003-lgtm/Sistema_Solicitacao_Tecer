import React from 'react';
import { cn } from '../lib/cn';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-tecer-grayDark placeholder:text-gray-400 dark:bg-gray-800 dark:text-white',
          className
        )}
        {...props}
      />
    );
  }
);

export default Input;
