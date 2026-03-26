import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-tecer-primary dark:bg-gray-800">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-tecer-grayDark dark:text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-tecer-grayMed">{description}</p>
    </div>
  );
}

export default EmptyState;
