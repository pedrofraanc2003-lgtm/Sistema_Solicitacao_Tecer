import React from 'react';
import { cn } from '../lib/cn';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-tecer-grayDark dark:bg-gray-800 dark:text-white',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

export default Select;
