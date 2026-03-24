
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Wrench, 
  Workflow,
  Users as UsersIcon, 
  LogOut, 
  Moon, 
  Sun, 
  Menu, 
  X, 
  Bell,
  RefreshCw,
  Plus,
  ShieldAlert,
  Cloud,
  CloudOff,
  Check,
  FileBarChart,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import { User, UserRole, MaintenanceRequest, RequestStatus, Equipment, AuditLog, WorkshopKanbanItem } from './types';
import { MOCK_USERS, MOCK_REQUESTS, MOCK_EQUIPMENTS } from './services/mockData';
import {
  syncTable,
  fetchTable,
  getDatabaseHealthStatus,
  fetchWorkshopKanbanItems,
  syncWorkshopKanbanItems,
  getCurrentAuthenticatedUser,
  onSupabaseAuthStateChange,
  signOutFromSupabase,
} from './services/supabase';
import { REFRESH_INTERVAL } from './constants';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Equipments from './pages/Equipments';
import WorkshopKanban from './pages/WorkshopKanban';
import Users from './pages/Users';
import Audits from './pages/Audits';
import Reports from './pages/Reports';
import tecerLogo from './assets/logo_tecer.png';

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  requestId: string;
  read: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('tecer_theme') as 'light' | 'dark') || 'light';
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isCloudOnline, setIsCloudOnline] = useState(true);
  const [cloudStatusMessage, setCloudStatusMessage] = useState('Sincronização com banco disponível.');
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('tecer_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback para mock local se o cache estiver inválido.
      }
    }

    return MOCK_USERS;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [workshopKanbanItems, setWorkshopKanbanItems] = useState<WorkshopKanbanItem[]>(() => {
    const saved = localStorage.getItem('tecer_workshop_kanban');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const mergeWorkshopKanbanItems = useCallback(
    (localItems: WorkshopKanbanItem[], remoteItems: WorkshopKanbanItem[]) => {
      const merged = new Map<string, WorkshopKanbanItem>();

      remoteItems.forEach(item => {
        merged.set(item.id, item);
      });

      localItems.forEach(item => {
        const remoteItem = merged.get(item.id);
        if (!remoteItem) {
          merged.set(item.id, item);
          return;
        }

        const localUpdatedAt = new Date(item.updatedAt).getTime();
        const remoteUpdatedAt = new Date(remoteItem.updatedAt).getTime();
        merged.set(item.id, localUpdatedAt >= remoteUpdatedAt ? item : remoteItem);
      });

      return Array.from(merged.values());
    },
    []
  );

  // Initial Data Fetch from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      setIsCloudSyncing(true);
      try {
        const health = await getDatabaseHealthStatus();
        setCloudStatusMessage([health.message, ...health.details].join(' | '));

        const [remoteRequests, remoteEquipments, remoteUsers, remoteLogs, remoteWorkshopKanbanItems] = await Promise.all([
          fetchTable('requests'),
          fetchTable('equipments'),
          fetchTable('users'),
          fetchTable('audit_logs'),
          fetchWorkshopKanbanItems()
        ]);

        if (remoteRequests) setRequests(remoteRequests.length > 0 ? remoteRequests : MOCK_REQUESTS);
        else setRequests(MOCK_REQUESTS);

        if (remoteEquipments) setEquipments(remoteEquipments.length > 0 ? remoteEquipments : MOCK_EQUIPMENTS);
        else setEquipments(MOCK_EQUIPMENTS);

        if (remoteUsers) setUsers(remoteUsers.length > 0 ? remoteUsers : MOCK_USERS);
        else setUsers(MOCK_USERS);

        if (remoteLogs) setAuditLogs(remoteLogs);
        if (remoteWorkshopKanbanItems) {
          setWorkshopKanbanItems(prev => mergeWorkshopKanbanItems(prev, remoteWorkshopKanbanItems));
        }
        
        setIsCloudOnline(health.ok && !!remoteRequests);
        setHasInitialLoaded(true);
      } catch (err) {
        console.warn("Utilizando dados de cache local devido a falha na nuvem.");
        setIsCloudOnline(false);
        setCloudStatusMessage('Falha ao validar a conexão com o banco. Aplicação operando em modo local.');
      } finally {
        setIsCloudSyncing(false);
        setLastRefresh(new Date());
      }
    };

    loadSupabaseData();
  }, [mergeWorkshopKanbanItems]);

  // Sync helpers
  const performSync = useCallback(async (table: string, data: any[]) => {
    setIsCloudSyncing(true);
    const success = await syncTable(table, data);
    setIsCloudOnline(success);
    setCloudStatusMessage(
      success
        ? `Tabela "${table}" sincronizada com sucesso.`
        : `Falha ao sincronizar "${table}". Verifique configuração e acesso do Supabase.`
    );
    setIsCloudSyncing(false);
  }, []);

  // Sync debouncers
  useEffect(() => {
    if (!hasInitialLoaded) return;
    localStorage.setItem('tecer_requests', JSON.stringify(requests));
    const handler = setTimeout(() => performSync('requests', requests), 2000); 
    return () => clearTimeout(handler);
  }, [requests, hasInitialLoaded, performSync]);

  useEffect(() => {
    if (!hasInitialLoaded) return;
    localStorage.setItem('tecer_equipments', JSON.stringify(equipments));
    performSync('equipments', equipments);
  }, [equipments, hasInitialLoaded, performSync]);

  useEffect(() => {
    if (!hasInitialLoaded) return;
    localStorage.setItem('tecer_users', JSON.stringify(users));
    performSync('users', users);
  }, [users, hasInitialLoaded, performSync]);

  useEffect(() => {
    if (!hasInitialLoaded) return;
    localStorage.setItem('tecer_audit_logs', JSON.stringify(auditLogs));
    performSync('audit_logs', auditLogs);
  }, [auditLogs, hasInitialLoaded, performSync]);

  useEffect(() => {
    if (!hasInitialLoaded) return;
    localStorage.setItem('tecer_workshop_kanban', JSON.stringify(workshopKanbanItems));
    const handler = setTimeout(async () => {
      setIsCloudSyncing(true);
      const success = await syncWorkshopKanbanItems(workshopKanbanItems);
      setIsCloudOnline(success);
      setCloudStatusMessage(
        success
          ? 'Tabela "workshop_kanban_items" sincronizada com sucesso.'
          : 'Falha ao sincronizar "workshop_kanban_items". Verifique configuração e acesso do Supabase.'
      );
      setIsCloudSyncing(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [workshopKanbanItems, hasInitialLoaded]);

  useEffect(() => {
    let isMounted = true;

    const loadSessionUser = async () => {
      try {
        const profile = await getCurrentAuthenticatedUser();
        if (isMounted) setUser(profile);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    };

    void loadSessionUser();

    const {
      data: { subscription },
    } = onSupabaseAuthStateChange(async (session) => {
      if (!isMounted) return;

      if (!session) {
        setUser(null);
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      try {
        const profile = await getCurrentAuthenticatedUser(session);
        if (isMounted) setUser(profile);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tecer_theme', theme);
  }, [theme]);

  const addAuditLog = useCallback((logData: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => {
    if (!user) return;
    const newLog: AuditLog = {
      ...logData,
      id: `LOG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [user]);

  const addNotification = useCallback((message: string, requestId: string) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      requestId,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isEditing) return;
    setIsRefreshing(true);
    try {
      const health = await getDatabaseHealthStatus();
      setCloudStatusMessage([health.message, ...health.details].join(' | '));

      const [remoteRequests, remoteEquipments, remoteUsers, remoteLogs, remoteWorkshopKanbanItems] = await Promise.all([
        fetchTable('requests'),
        fetchTable('equipments'),
        fetchTable('users'),
        fetchTable('audit_logs'),
        fetchWorkshopKanbanItems()
      ]);

      if (remoteRequests) {
        setRequests(remoteRequests);
        setIsCloudOnline(health.ok);
      } else {
        setIsCloudOnline(false);
      }
      
      if (remoteEquipments) setEquipments(remoteEquipments);
      if (remoteUsers) setUsers(remoteUsers.length > 0 ? remoteUsers : MOCK_USERS);
      if (remoteLogs) setAuditLogs(remoteLogs);
      if (remoteWorkshopKanbanItems) {
        setWorkshopKanbanItems(prev => mergeWorkshopKanbanItems(prev, remoteWorkshopKanbanItems));
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      setIsCloudOnline(false);
      setCloudStatusMessage('Não foi possível atualizar os dados remotos. Aplicação operando em modo local.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isEditing, mergeWorkshopKanbanItems]);

  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const handleLogout = () => {
    void signOutFromSupabase().finally(() => setUser(null));
  };

  const NavItem = ({ to, icon: Icon, label, roles }: { to: string, icon: any, label: string, roles?: UserRole[] }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    if (roles && user && !roles.includes(user.role)) return null;

    return (
      <Link 
        to={to} 
        onClick={() => setIsSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          isActive 
            ? 'bg-tecer-primary text-white shadow-md' 
            : 'text-tecer-grayDark hover:bg-gray-100 dark:hover:bg-tecer-darkCard'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  const RequestsNavGroup = () => {
    const location = useLocation();
    const isRequestsSection = location.pathname.startsWith('/requests');
    const [isOpen, setIsOpen] = useState(isRequestsSection);
    const canSeeAllRequests = user?.role === UserRole.ADMIN;

    useEffect(() => {
      if (isRequestsSection) setIsOpen(true);
    }, [isRequestsSection]);

    const getSubItemClass = (to: string) => {
      const isActive = location.pathname === to;
      return `ml-8 flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
        isActive
          ? 'bg-tecer-primary text-white shadow-md'
          : 'text-tecer-grayDark hover:bg-gray-100 dark:hover:bg-tecer-darkCard'
      }`;
    };

    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
            isRequestsSection
              ? 'bg-tecer-primary text-white shadow-md'
              : 'text-tecer-grayDark hover:bg-gray-100 dark:hover:bg-tecer-darkCard'
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
            <Link to="/requests/new" onClick={() => setIsSidebarOpen(false)} className={getSubItemClass('/requests/new')}>
              Novas Solicitações
            </Link>
            <Link to="/requests/mine" onClick={() => setIsSidebarOpen(false)} className={getSubItemClass('/requests/mine')}>
              Minhas Solicitações
            </Link>
            <Link to="/requests/in-progress" onClick={() => setIsSidebarOpen(false)} className={getSubItemClass('/requests/in-progress')}>
              Em Andamento
            </Link>
            {canSeeAllRequests && (
              <Link to="/requests/all" onClick={() => setIsSidebarOpen(false)} className={getSubItemClass('/requests/all')}>
                Todas as Solicitações
              </Link>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tecer-bgLight dark:bg-tecer-darkBg text-tecer-grayDark dark:text-white">
        Validando sessao...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} users={users} setUsers={setUsers} />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const requestsPageProps = {
    user,
    requests,
    setRequests,
    equipments,
    setIsEditing,
    addAuditLog,
    addNotification
  };

  return (
    <HashRouter>
      <div className={`tecer-shell min-h-screen bg-tecer-bgLight dark:bg-tecer-darkBg text-tecer-grayDark dark:text-gray-100 flex overflow-hidden relative`}>
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-tecer-darkCard shadow-xl transform transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                  <img src={tecerLogo} alt="Logo da TECER" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase font-bold tracking-[0.28em] text-tecer-grayMed">Plataforma PCM</span>
                  <span className="font-display text-2xl font-extrabold text-tecer-primary dark:text-tecer-secondary tracking-tight">TECER</span>
                  <span className="text-[11px] font-medium text-tecer-grayMed">Terminais Portuários</span>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-tecer-grayMed">
                <X size={24} />
              </button>
            </div>
            <div className="px-6 pb-4">
              <div className="rounded-3xl border border-slate-200 bg-white/72 px-4 py-4 backdrop-blur-sm shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.22em] text-tecer-grayMed">Ambiente corporativo</p>
                <p className="mt-2 text-sm text-tecer-grayDark">Operação centralizada de solicitações, ativos e indicadores.</p>
              </div>
            </div>
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
              <RequestsNavGroup />
              <NavItem to="/equipments" icon={Wrench} label="Equipamentos" />
              <NavItem to="/workshop-kanban" icon={Workflow} label="Kanban da Oficina" />
              <NavItem to="/reports" icon={FileBarChart} label="Relatórios BI" roles={[UserRole.ADMIN, UserRole.PCM]} />
              <NavItem to="/users" icon={UsersIcon} label="Usuários" roles={[UserRole.ADMIN]} />
              <NavItem to="/audits" icon={ShieldAlert} label="Auditoria" roles={[UserRole.ADMIN]} />
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              <div className="rounded-3xl border border-slate-200 bg-white/84 p-3 shadow-sm">
                <div className="flex items-center gap-3 px-1 py-1">
                  <div className="w-11 h-11 rounded-2xl bg-tecer-primary/10 flex items-center justify-center text-tecer-primary font-bold shadow-lg">
                  {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-tecer-grayDark">{user.name}</p>
                    <p className="text-xs text-tecer-grayMed truncate uppercase tracking-[0.18em]">{user.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 mt-3 px-3 py-2.5 text-sm text-tecer-primary hover:bg-tecer-primary/5 rounded-2xl transition-colors border border-slate-200">
                  <LogOut size={18} />
                  <span>Sair do sistema</span>
                </button>
                </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="h-20 bg-white dark:bg-tecer-darkCard shadow-sm flex items-center justify-between px-4 lg:px-8 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-tecer-grayMed">
                <Menu size={24} />
              </button>
              <div className="hidden md:block">
                <p className="text-[11px] uppercase tracking-[0.24em] text-tecer-grayMed font-bold">Centro de controle</p>
                <h1 className="text-xl font-display font-extrabold">
                  {user.role === UserRole.LIDERANCA ? 'Portal da Liderança' : user.role === UserRole.COMPRAS ? 'Módulo de Suprimentos' : 'Gestão PCM'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div title={cloudStatusMessage} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] transition-colors tecer-status-pill
                ${isCloudSyncing ? 'bg-orange-100 text-orange-600' : 
                  isCloudOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {isCloudSyncing ? <RefreshCw size={12} className="animate-spin" /> : 
                 isCloudOnline ? <Cloud size={12} /> : <CloudOff size={12} />}
                <span>{isCloudSyncing ? 'Sincronizando' : isCloudOnline ? 'Em Nuvem' : 'Modo Local'}</span>
              </div>
              <div className="hidden xl:flex items-center gap-2 text-[10px] text-tecer-grayMed uppercase font-medium tracking-[0.18em]">
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                <span>Atualizado {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <button onClick={handleRefresh} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors border border-transparent" title="Sincronizar dados agora">
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors border border-transparent">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <div className="relative">
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative border border-transparent">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-tecer-darkCard">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-tecer-darkCard rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-[100] overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-tecer-grayMed font-bold">Central</p>
                        <h4 className="font-display font-extrabold text-sm">Notificações</h4>
                      </div>
                      <button onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} className="text-[10px] text-tecer-primary font-bold uppercase hover:underline">Limpar tudo</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-tecer-grayMed">Nenhuma nova notificação</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${n.read ? 'opacity-60' : ''}`}>
                            <div className="flex gap-3">
                              <div className="w-2 h-2 rounded-full bg-tecer-primary mt-1 shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium leading-tight">{n.message}</p>
                                <span className="text-[10px] text-tecer-grayMed mt-1 block">{new Date(n.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-5 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard requests={requests} />} />
              <Route path="/requests" element={<Navigate to="/requests/new" replace />} />
              <Route path="/requests/new" element={<Requests {...requestsPageProps} viewMode="new" />} />
              <Route path="/requests/mine" element={<Requests {...requestsPageProps} viewMode="mine" />} />
              <Route path="/requests/in-progress" element={<Requests {...requestsPageProps} viewMode="inProgress" />} />
              <Route path="/requests/all" element={user.role === UserRole.ADMIN ? <Requests {...requestsPageProps} viewMode="all" /> : <Navigate to="/requests/new" replace />} />
              <Route path="/equipments" element={<Equipments user={user} equipments={equipments} setEquipments={setEquipments} setIsEditing={setIsEditing} addAuditLog={addAuditLog} />} />
              <Route
                path="/workshop-kanban"
                element={
                  <WorkshopKanban
                    user={user}
                    equipments={equipments}
                    items={workshopKanbanItems}
                    setItems={setWorkshopKanbanItems}
                    setIsEditing={setIsEditing}
                    addAuditLog={addAuditLog}
                  />
                }
              />
              <Route path="/reports" element={<Reports requests={requests} equipments={equipments} />} />
              <Route path="/users" element={user.role === UserRole.ADMIN ? <Users users={users} setUsers={setUsers} setIsEditing={setIsEditing} addAuditLog={addAuditLog} /> : <Navigate to="/" />} />
              <Route path="/audits" element={user.role === UserRole.ADMIN ? <Audits logs={auditLogs} /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>

      </div>
    </HashRouter>
  );
};

export default App;



