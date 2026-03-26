import React, { useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronRight, ClipboardList, Cloud, CloudOff, FileBarChart, FlaskConical, LayoutDashboard, LogOut, Menu, Moon, RefreshCw, ShieldAlert, Sun, Users as UsersIcon, Workflow, Wrench, X } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import tecerLogo from '../assets/logo_tecer.png';
import { Notification, User, UserRole } from '../types';

type AppShellProps = {
  user: User;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  notifications: Notification[];
  markNotificationsRead: () => void;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
  cloudStatus: {
    online: boolean;
    syncing: boolean;
    message: string;
  };
  logout: () => Promise<void>;
};

function NavItem({
  to,
  label,
  icon: Icon,
  currentPath,
  onNavigate,
  roles,
  user,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  currentPath: string;
  onNavigate: () => void;
  roles?: UserRole[];
  user: User;
}) {
  if (roles && !roles.includes(user.role)) return null;
  const isActive = currentPath === to;
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`tecer-nav-item flex items-center gap-3 rounded-xl px-4 py-3 ${
        isActive ? 'tecer-nav-item--active bg-tecer-primary text-white shadow-md' : 'tecer-nav-item--idle text-white/90'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
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
  const canSeeAllRequests = user.role === UserRole.ADMIN;

  const subItemClass = (to: string) =>
    `tecer-nav-subitem ml-8 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
      currentPath === to ? 'tecer-nav-subitem--active bg-tecer-primary text-white shadow-md' : 'tecer-nav-subitem--idle text-white/80'
    }`;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`tecer-nav-item flex w-full items-center justify-between rounded-xl px-4 py-3 ${
          currentPath.startsWith('/requests') ? 'tecer-nav-item--active bg-tecer-primary text-white shadow-md' : 'tecer-nav-item--idle text-white/90'
        }`}
      >
        <span className="flex items-center gap-3">
          <ClipboardList size={20} />
          <span className="font-medium">Solicitações</span>
        </span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <div className="space-y-1">
          <Link to="/requests/new" onClick={onNavigate} className={subItemClass('/requests/new')}>Novas Solicitações</Link>
          <Link to="/requests/mine" onClick={onNavigate} className={subItemClass('/requests/mine')}>Minhas Solicitações</Link>
          <Link to="/requests/in-progress" onClick={onNavigate} className={subItemClass('/requests/in-progress')}>Em Andamento</Link>
          {canSeeAllRequests ? (
            <Link to="/requests/all" onClick={onNavigate} className={subItemClass('/requests/all')}>Todas as Solicitações</Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  user,
  theme,
  setTheme,
  notifications,
  markNotificationsRead,
  refreshData,
  isRefreshing,
  cloudStatus,
  logout,
}: AppShellProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = useMemo(() => notifications.filter(item => !item.read).length, [notifications]);

  return (
    <div className="tecer-shell relative flex min-h-screen overflow-hidden bg-tecer-bgLight text-tecer-grayDark dark:bg-tecer-darkBg dark:text-gray-100">
      <aside className={`tecer-sidebar fixed inset-y-0 left-0 z-50 w-72 transform shadow-xl transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between p-6">
            <div className="tecer-sidebar-brand flex flex-1 items-center gap-4 rounded-[28px] px-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                <img src={tecerLogo} alt="Logo da TECER" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-tecer-grayMed">Plataforma PCM</span>
                <span className="font-display text-2xl font-extrabold tracking-tight text-tecer-primary dark:text-tecer-secondary">TECER</span>
                <span className="text-[11px] font-medium text-tecer-grayMed">Terminais Portuários</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-tecer-grayMed lg:hidden">
              <X size={24} />
            </button>
          </div>

          <div className="px-6 pb-4">
            <div className="tecer-sidebar-panel tecer-sidebar-banner rounded-3xl px-4 py-4 shadow-sm backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.22em] text-tecer-grayMed">Ambiente corporativo</p>
              <p className="mt-2 text-sm text-tecer-grayDark">Operação centralizada de solicitações, ativos e indicadores.</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-4">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} user={user} />
            <RequestsNavGroup currentPath={location.pathname} user={user} onNavigate={() => setIsSidebarOpen(false)} />
            <NavItem to="/equipments" icon={Wrench} label="Equipamentos" currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} user={user} />
            <NavItem to="/workshop-kanban" icon={Workflow} label="Kanban da Oficina" currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} user={user} />
            <NavItem
              to="/oil-analysis"
              icon={FlaskConical}
              label="Analise de Oleo"
              currentPath={location.pathname}
              onNavigate={() => setIsSidebarOpen(false)}
              roles={[UserRole.ADMIN, UserRole.PCM]}
              user={user}
            />
            <NavItem to="/reports" icon={FileBarChart} label="Relatórios BI" currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} roles={[UserRole.ADMIN, UserRole.PCM]} user={user} />
            <NavItem to="/users" icon={UsersIcon} label="Usuários" currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} roles={[UserRole.ADMIN]} user={user} />
            <NavItem to="/audits" icon={ShieldAlert} label="Auditoria" currentPath={location.pathname} onNavigate={() => setIsSidebarOpen(false)} roles={[UserRole.ADMIN]} user={user} />
          </nav>

          <div className="border-t border-slate-200 p-4 dark:border-white/10">
            <div className="tecer-sidebar-panel tecer-sidebar-footer rounded-3xl p-3 shadow-sm">
              <div className="flex items-center gap-3 px-1 py-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tecer-primary/10 font-bold text-tecer-primary shadow-lg">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-tecer-grayDark">{user.name}</p>
                  <p className="truncate text-xs uppercase tracking-[0.18em] text-tecer-grayMed">{user.role}</p>
                </div>
              </div>
              <button onClick={() => void logout()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-tecer-primary transition-colors hover:bg-tecer-primary/5">
                <LogOut size={18} />
                <span>Sair do sistema</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="tecer-main-content relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="tecer-topbar flex h-20 items-center justify-between bg-white px-4 shadow-sm dark:bg-tecer-darkCard lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="text-tecer-grayMed lg:hidden">
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Centro de controle</p>
              <h1 className="text-xl font-display font-extrabold">
                {user.role === UserRole.LIDERANCA ? 'Portal da Liderança' : user.role === UserRole.COMPRAS ? 'Módulo de Suprimentos' : 'Gestão PCM'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              title={cloudStatus.message}
              className={`tecer-status-pill flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] ${
                cloudStatus.syncing ? 'bg-orange-100 text-orange-600' : cloudStatus.online ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {cloudStatus.syncing ? <RefreshCw size={12} className="animate-spin" /> : cloudStatus.online ? <Cloud size={12} /> : <CloudOff size={12} />}
              <span>{cloudStatus.syncing ? 'Sincronizando' : cloudStatus.online ? 'Em Nuvem' : 'Modo Local'}</span>
            </div>
            <button onClick={() => void refreshData()} className="tecer-topbar-icon rounded-full p-2.5" title="Sincronizar dados agora">
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="tecer-topbar-icon rounded-full p-2.5">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="relative">
              <button onClick={() => setIsNotifOpen(prev => !prev)} className="tecer-topbar-icon relative rounded-full p-2.5">
                <Bell size={20} />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[10px] text-white dark:border-tecer-darkCard">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              {isNotifOpen ? (
                <div className="tecer-notif-panel absolute right-0 z-[100] mt-3 w-80 overflow-hidden rounded-2xl border border-gray-100 shadow-xl dark:border-gray-700">
                  <div className="flex items-center justify-between border-b bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Central</p>
                      <h4 className="font-display text-sm font-extrabold">Notificações</h4>
                    </div>
                    <button onClick={markNotificationsRead} className="text-[10px] font-bold uppercase text-tecer-primary hover:underline">Marcar lidas</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length ? notifications.map(notification => (
                      <div key={notification.id} className={`border-b p-4 dark:border-gray-700 ${notification.read ? 'opacity-60' : ''}`}>
                        <p className="text-xs font-medium leading-tight">{notification.message}</p>
                        <span className="mt-1 block text-[10px] text-tecer-grayMed">{new Date(notification.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-xs text-tecer-grayMed">Nenhuma nova notificação</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
