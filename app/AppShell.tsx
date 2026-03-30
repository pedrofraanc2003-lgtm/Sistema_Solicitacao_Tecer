import React, { useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  FileBarChart,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sun,
  Users as UsersIcon,
  Workflow,
  Wrench,
  X,
} from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import tecerLogo from '../assets/logo_tecer.png';
import { canAccessRoute } from '../domains/auth/permissions';
import Button from '../ui/Button';
import ShellNavItem from '../ui/ShellNavItem';
import StatusPill from '../ui/StatusPill';
import { Notification, User } from '../types';
import { useAppSync, useAuth } from './hooks';

type AppShellProps = {
  user: User;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  notifications: Notification[];
  markNotificationsRead: () => void;
};

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.26em] text-white/38">{title}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function RequestsNavGroup({
  currentPath,
  user,
  onNavigate,
}: {
  currentPath: string;
  user: User;
  onNavigate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(currentPath.startsWith('/requests'));
  const canSeeAllRequests = user.role === 'Admin';

  return (
    <div className="space-y-1">
      <ShellNavItem
        label="Solicitacoes"
        icon={ClipboardList}
        active={currentPath.startsWith('/requests')}
        onClick={() => setIsOpen(prev => !prev)}
        ariaExpanded={isOpen}
        trailing={isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      />

      {isOpen ? (
        <div className="space-y-1 pl-4">
          <ShellNavItem to="/requests/new" label="Novas solicitacoes" subItem active={currentPath === '/requests/new'} onNavigate={onNavigate} />
          <ShellNavItem to="/requests/mine" label="Minhas solicitacoes" subItem active={currentPath === '/requests/mine'} onNavigate={onNavigate} />
          <ShellNavItem to="/requests/in-progress" label="Em andamento" subItem active={currentPath === '/requests/in-progress'} onNavigate={onNavigate} />
          {canSeeAllRequests ? <ShellNavItem to="/requests/all" label="Todas as solicitacoes" subItem active={currentPath === '/requests/all'} onNavigate={onNavigate} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ user, theme, setTheme, notifications, markNotificationsRead }: AppShellProps) {
  const { logout, authModeLabel } = useAuth();
  const { refreshAll, isRefreshing, cloudStatus } = useAppSync();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = useMemo(() => notifications.filter(item => !item.read).length, [notifications]);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="tecer-shell relative flex min-h-screen overflow-hidden bg-tecer-bgLight text-tecer-grayDark dark:bg-tecer-darkBg dark:text-gray-100">
      {isSidebarOpen ? <button type="button" aria-label="Fechar navegacao" className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[3px] lg:hidden" onClick={closeSidebar} /> : null}

      <aside className={`tecer-sidebar fixed inset-y-0 left-0 z-50 w-[min(18rem,calc(100vw-1.5rem))] transform transition-transform lg:relative lg:w-[18rem] lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col px-4 py-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/95 p-2 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
                <img src={tecerLogo} alt="Logo da TECER" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-white/42">Sistema PCM</span>
                <span className="mt-1 block truncate text-lg font-semibold text-white">TECER</span>
                <span className="mt-1 block text-xs text-white/56">Navegacao principal</span>
              </div>
            </div>
            <button type="button" onClick={closeSidebar} className="rounded-full p-2 text-white/72 transition-colors hover:bg-white/8 hover:text-white lg:hidden">
              <X size={22} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-5">
            <div className="space-y-6">
              <SidebarSection title="Visao geral">
                <ShellNavItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} onNavigate={closeSidebar} />
              </SidebarSection>

              <SidebarSection title="Operacao">
                <RequestsNavGroup currentPath={location.pathname} user={user} onNavigate={closeSidebar} />
                <ShellNavItem to="/equipments" icon={Wrench} label="Equipamentos" active={location.pathname === '/equipments'} onNavigate={closeSidebar} />
                <ShellNavItem to="/workshop-kanban" icon={Workflow} label="Kanban da oficina" active={location.pathname === '/workshop-kanban'} onNavigate={closeSidebar} />
                {canAccessRoute(user, 'oilAnalysis') ? <ShellNavItem to="/oil-analysis" icon={FlaskConical} label="Analise de oleo" active={location.pathname === '/oil-analysis'} onNavigate={closeSidebar} /> : null}
              </SidebarSection>

              {canAccessRoute(user, 'reports') || canAccessRoute(user, 'users') || canAccessRoute(user, 'audits') ? (
                <SidebarSection title="Gestao">
                  {canAccessRoute(user, 'reports') ? <ShellNavItem to="/reports" icon={FileBarChart} label="Relatorios BI" active={location.pathname === '/reports'} onNavigate={closeSidebar} /> : null}
                  {canAccessRoute(user, 'users') ? <ShellNavItem to="/users" icon={UsersIcon} label="Usuarios" active={location.pathname === '/users'} onNavigate={closeSidebar} /> : null}
                  {canAccessRoute(user, 'audits') ? <ShellNavItem to="/audits" icon={ShieldAlert} label="Auditoria" active={location.pathname === '/audits'} onNavigate={closeSidebar} /> : null}
                </SidebarSection>
              ) : null}
            </div>
          </nav>

          <div className="border-t border-white/8 pt-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/8 font-semibold text-white">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/42">{user.role} · {authModeLabel}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => void logout()}
              className="mt-4 w-full justify-center border-white/10 bg-white/6 text-white hover:border-white/20 hover:bg-white/10 hover:text-white dark:border-white/10 dark:bg-white/6 dark:text-white"
            >
              <LogOut size={18} />
              <span>Sair do sistema</span>
            </Button>
          </div>
        </div>
      </aside>

      <div className="tecer-main-content relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="tecer-topbar flex min-h-[88px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setIsSidebarOpen(true)} className="rounded-full p-2 text-tecer-grayMed hover:bg-[color:var(--color-surface-soft)] lg:hidden">
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-tecer-grayMed">Comando central</p>
              <h1 className="mt-1 text-[30px] font-display font-semibold leading-none">
                {user.role === 'Liderança' ? 'Visao executiva' : user.role === 'Compras' ? 'Mesa de suprimentos' : 'Sala de operacao'}
              </h1>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <StatusPill title={cloudStatus.message} tone={cloudStatus.syncing ? 'warning' : cloudStatus.online ? 'success' : 'danger'} className="hidden sm:inline-flex">
              {cloudStatus.syncing ? <RefreshCw size={12} className="animate-spin" /> : cloudStatus.online ? <Cloud size={12} /> : <CloudOff size={12} />}
              <span>{cloudStatus.syncing ? 'Sincronizando' : cloudStatus.online ? 'Em nuvem' : 'Modo local'}</span>
            </StatusPill>

            <button type="button" onClick={() => void refreshAll()} className="tecer-topbar-icon rounded-full p-2.5" title="Sincronizar dados agora">
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="tecer-topbar-icon rounded-full p-2.5">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="relative">
              <button type="button" onClick={() => setIsNotifOpen(prev => !prev)} className="tecer-topbar-icon relative rounded-full p-2.5">
                <Bell size={20} />
                {unreadCount > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] text-white dark:border-tecer-darkCard">{unreadCount}</span> : null}
              </button>

              {isNotifOpen ? (
                <div className="tecer-notif-panel absolute right-0 z-[100] mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[24px]">
                  <div className="flex items-center justify-between border-b border-[color:var(--color-border)] bg-[rgba(255,255,255,0.32)] p-4 dark:border-[color:var(--color-border)] dark:bg-white/0">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-tecer-grayMed">Central</p>
                      <h4 className="mt-1 font-display text-lg font-semibold">Notificacoes</h4>
                    </div>
                    <button type="button" onClick={markNotificationsRead} className="text-[10px] font-bold uppercase tracking-[0.18em] text-tecer-primary hover:underline">
                      Marcar lidas
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length ? notifications.map(notification => (
                      <div key={notification.id} className={`border-b border-[color:var(--color-border)] px-4 py-4 dark:border-[color:var(--color-border)] ${notification.read ? 'opacity-60' : ''}`}>
                        <p className="text-sm font-medium leading-6 text-tecer-grayDark dark:text-white">{notification.message}</p>
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-tecer-grayMed">{new Date(notification.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )) : <div className="p-8 text-center text-xs text-tecer-grayMed">Nenhuma nova notificacao</div>}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
