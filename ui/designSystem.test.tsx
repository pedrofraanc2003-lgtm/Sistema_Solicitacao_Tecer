import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Button from './Button';
import Card from './Card';
import Panel from './Panel';
import ShellNavItem from './ShellNavItem';

describe('design system visual contracts', () => {
  it('renders button variants with explicit visual contracts', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button').className).toContain('bg-[linear-gradient(180deg,var(--color-primary),var(--color-primary-strong))]');
    expect(screen.getByRole('button').className).toContain('border-[color:var(--color-primary)]');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button').className).toContain('bg-[linear-gradient(180deg,var(--color-surface-strong),var(--color-surface-soft))]');
    expect(screen.getByRole('button').className).toContain('border-[color:var(--color-border-strong)]');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').className).toContain('bg-transparent');
    expect(screen.getByRole('button').className).toContain('hover:bg-[color:var(--color-primary-ghost)]');
  });

  it('keeps card and panel tones distinct without global overrides', () => {
    const { rerender } = render(<Card tone="hero">Hero</Card>);
    expect(screen.getByText('Hero').className).toContain('bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(238,229,216,0.94))]');

    rerender(<Panel tone="muted">Muted</Panel>);
    expect(screen.getByText('Muted').className).toContain('bg-[linear-gradient(180deg,rgba(247,242,234,0.92),rgba(240,233,223,0.88))]');
    expect(screen.getByText('Muted').className).toContain('shadow-[var(--shadow-soft)]');
  });

  it('renders sidebar items with unified main and subitem states', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ShellNavItem to="/dashboard" label="Dashboard" active />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('data-state')).toBe('active');
    expect(screen.getByRole('link', { name: 'Dashboard' }).className).toContain('bg-[var(--sidebar-active-bg)]');
    expect(screen.getByRole('link', { name: 'Dashboard' }).className).toContain('text-[color:var(--sidebar-active-text)]');

    rerender(
      <MemoryRouter>
        <ShellNavItem to="/requests/new" label="Novas Solicitacoes" subItem />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Novas Solicitacoes' }).getAttribute('data-level')).toBe('subitem');
    expect(screen.getByRole('link', { name: 'Novas Solicitacoes' }).className).toContain('hover:bg-[color:var(--sidebar-hover-bg)]');
  });
});
