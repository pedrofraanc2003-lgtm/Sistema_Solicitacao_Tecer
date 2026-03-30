import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ title, subtitle, onClose, children, className }: ModalProps) {
  return (
    <div className="tecer-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className={cn('max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.98))] shadow-[var(--shadow-float)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(16,34,56,0.98),rgba(13,34,57,0.96))]', className)}>
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-5 py-5 md:px-6 dark:border-[color:var(--color-border)]">
          <div>
            <h3 className="text-xl font-bold text-tecer-grayDark dark:text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm leading-6 text-tecer-grayMed">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-tecer-grayMed hover:bg-[color:var(--color-surface-soft)] dark:hover:bg-[rgba(255,255,255,0.06)]">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-7.5rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
