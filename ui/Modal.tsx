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
      <div className={cn('w-full max-w-4xl rounded-[28px] bg-white shadow-2xl dark:bg-tecer-darkCard', className)}>
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-tecer-grayDark dark:text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-tecer-grayMed">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-tecer-grayMed hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
