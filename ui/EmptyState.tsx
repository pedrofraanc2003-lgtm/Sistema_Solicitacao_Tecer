import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-[28px] border border-dashed border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(244,249,255,0.9))] px-6 py-12 text-center shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(19,44,72,0.62),rgba(15,36,58,0.86))]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-primary-ghost)] text-[color:var(--color-primary)] dark:bg-[rgba(72,163,255,0.14)]">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-tecer-grayDark dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-tecer-grayMed">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
