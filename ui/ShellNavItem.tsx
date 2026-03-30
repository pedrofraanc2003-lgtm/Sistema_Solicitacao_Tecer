import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/cn';

type ShellNavItemProps = {
  to?: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  active?: boolean;
  subItem?: boolean;
  onNavigate?: () => void;
  onClick?: () => void;
  trailing?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  ariaExpanded?: boolean;
};

function getShellNavItemClasses(active: boolean, subItem: boolean) {
  const base = subItem
    ? 'group flex min-h-[42px] items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5 text-sm font-medium transition-all duration-150'
    : 'group relative flex min-h-[50px] items-center justify-between gap-3 rounded-[16px] border px-3.5 py-2.5 text-sm font-medium transition-all duration-150';

  const state = subItem
    ? active
      ? 'border border-white/8 bg-[rgba(255,255,255,0.14)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
      : 'border-transparent bg-transparent text-white/86 hover:bg-[color:var(--sidebar-hover-bg)] hover:text-white'
    : active
      ? 'border border-white/10 bg-[var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] shadow-[0_18px_32px_rgba(0,0,0,0.24)]'
      : 'border-transparent bg-transparent text-white/74 hover:bg-[color:var(--sidebar-hover-bg)] hover:text-white';

  return cn(base, state);
}

export function ShellNavItem({
  to,
  label,
  icon: Icon,
  active = false,
  subItem = false,
  onNavigate,
  onClick,
  trailing,
  className,
  type = 'button',
  ariaExpanded,
}: ShellNavItemProps) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-[12px] transition-all duration-150',
              subItem ? 'h-7 w-7' : 'h-8 w-8',
              active
                ? subItem
                  ? 'bg-white/12 text-white'
                  : 'bg-[color:var(--sidebar-active-icon)] text-[color:var(--sidebar-active-text)]'
                : 'bg-white/6 text-current group-hover:bg-white/14'
            )}
          >
            <Icon size={subItem ? 15 : 17} />
          </span>
        ) : (
          <span className={cn('block rounded-full', subItem ? 'h-1.5 w-1.5 bg-current/70' : 'h-2 w-2 bg-current/80')} />
        )}
        <span className="truncate">{label}</span>
      </span>
      {trailing ? <span className={cn('shrink-0', active ? 'opacity-100 text-[color:var(--sidebar-active-text)]' : 'opacity-72 group-hover:opacity-100')}>{trailing}</span> : null}
    </>
  );

  const sharedProps = {
    className: cn(getShellNavItemClasses(active, subItem), className),
    'data-state': active ? 'active' : 'idle',
    'data-level': subItem ? 'subitem' : 'item',
  };

  if (to) {
    return (
      <Link to={to} onClick={onNavigate} {...sharedProps}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} aria-expanded={ariaExpanded} {...sharedProps}>
      {content}
    </button>
  );
}

export default ShellNavItem;
