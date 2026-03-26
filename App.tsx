import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppDataProvider, useAppData } from './app/AppDataContext';
import AppShell from './app/AppShell';
import LoadingScreen from './app/LoadingScreen';
import { ToastProvider } from './ui/ToastProvider';
import { UserRole } from './types';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Requests = lazy(() => import('./pages/Requests'));
const Equipments = lazy(() => import('./pages/Equipments'));
const WorkshopKanban = lazy(() => import('./pages/WorkshopKanban'));
const Users = lazy(() => import('./pages/Users'));
const Audits = lazy(() => import('./pages/Audits'));
const Reports = lazy(() => import('./pages/Reports'));
const OilAnalysis = lazy(() => import('./pages/OilAnalysis'));
const Login = lazy(() => import('./pages/Login'));

function ProtectedApp() {
  const {
    user,
    isAuthLoading,
    requests,
    equipments,
    users,
    auditLogs,
    workshopItems,
    notifications,
    theme,
    setTheme,
    markNotificationsRead,
    refreshData,
    isRefreshing,
    cloudStatus,
    logout,
    createRequestAction,
    updateRequestAction,
    saveEquipmentAction,
    saveManagedUserAction,
    appendAuditAction,
    createWorkshopCardAction,
    saveWorkshopItemAction,
    removeWorkshopItemAction,
    setAuthenticatedUser,
  } = useAppData();

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login onLogin={setAuthenticatedUser} users={users} />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" replace /> : <Login onLogin={setAuthenticatedUser} users={users} />}
        />
        <Route
          path="/reset-password"
          element={user ? <Navigate to="/" replace /> : <Login onLogin={setAuthenticatedUser} users={users} />}
        />

        {!user ? (
          <Route path="*" element={<Navigate to="/login" replace />} />
        ) : (
          <Route
            element={
              <AppShell
                user={user}
                theme={theme}
                setTheme={setTheme}
                notifications={notifications}
                markNotificationsRead={markNotificationsRead}
                refreshData={refreshData}
                isRefreshing={isRefreshing}
                cloudStatus={cloudStatus}
                logout={logout}
              />
            }
          >
            <Route path="/" element={<Dashboard requests={requests} />} />
            <Route path="/requests" element={<Navigate to="/requests/new" replace />} />
            <Route
              path="/requests/new"
              element={<Requests user={user} requests={requests} equipments={equipments} onCreateRequest={createRequestAction} onUpdateRequest={updateRequestAction} viewMode="new" />}
            />
            <Route
              path="/requests/mine"
              element={<Requests user={user} requests={requests} equipments={equipments} onCreateRequest={createRequestAction} onUpdateRequest={updateRequestAction} viewMode="mine" />}
            />
            <Route
              path="/requests/in-progress"
              element={<Requests user={user} requests={requests} equipments={equipments} onCreateRequest={createRequestAction} onUpdateRequest={updateRequestAction} viewMode="inProgress" />}
            />
            <Route
              path="/requests/all"
              element={
                user.role === UserRole.ADMIN ? (
                  <Requests user={user} requests={requests} equipments={equipments} onCreateRequest={createRequestAction} onUpdateRequest={updateRequestAction} viewMode="all" />
                ) : (
                  <Navigate to="/requests/new" replace />
                )
              }
            />
            <Route
              path="/equipments"
              element={<Equipments user={user} equipments={equipments} onSaveEquipment={saveEquipmentAction} onAudit={appendAuditAction} />}
            />
            <Route
              path="/workshop-kanban"
              element={
                <WorkshopKanban
                  user={user}
                  equipments={equipments}
                  items={workshopItems}
                  onCreateItem={createWorkshopCardAction}
                  onSaveItem={saveWorkshopItemAction}
                  onRemoveItem={removeWorkshopItemAction}
                />
              }
            />
            <Route path="/reports" element={<Reports requests={requests} equipments={equipments} />} />
            <Route
              path="/oil-analysis"
              element={
                user.role === UserRole.ADMIN || user.role === UserRole.PCM ? <OilAnalysis /> : <Navigate to="/" replace />
              }
            />
            <Route
              path="/users"
              element={user.role === UserRole.ADMIN ? <Users users={users} onSaveUser={saveManagedUserAction} onAudit={appendAuditAction} /> : <Navigate to="/" replace />}
            />
            <Route path="/audits" element={user.role === UserRole.ADMIN ? <Audits logs={auditLogs} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}

const App: React.FC = () => (
  <ToastProvider>
    <AppDataProvider>
      <HashRouter>
        <ProtectedApp />
      </HashRouter>
    </AppDataProvider>
  </ToastProvider>
);

export default App;
