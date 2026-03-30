import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProviders } from './app/AppProviders';
import AppShell from './app/AppShell';
import { useAuth, useUi } from './app/hooks';
import LoadingScreen from './app/LoadingScreen';
import { canAccessRoute } from './domains/auth/permissions';

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
  const { user, isAuthLoading } = useAuth();
  const { theme, setTheme, notifications, markNotificationsRead } = useUi();

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <Login />} />

        {!user ? (
          <Route path="*" element={<Navigate to="/login" replace />} />
        ) : (
          <Route element={<AppShell user={user} theme={theme} setTheme={setTheme} notifications={notifications} markNotificationsRead={markNotificationsRead} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/requests" element={<Navigate to="/requests/new" replace />} />
            <Route path="/requests/new" element={<Requests viewMode="new" />} />
            <Route path="/requests/mine" element={<Requests viewMode="mine" />} />
            <Route path="/requests/in-progress" element={<Requests viewMode="inProgress" />} />
            <Route path="/requests/all" element={<Requests viewMode="all" />} />
            <Route path="/equipments" element={<Equipments />} />
            <Route path="/workshop-kanban" element={<WorkshopKanban />} />
            <Route path="/reports" element={canAccessRoute(user, 'reports') ? <Reports /> : <Navigate to="/" replace />} />
            <Route path="/oil-analysis" element={canAccessRoute(user, 'oilAnalysis') ? <OilAnalysis /> : <Navigate to="/" replace />} />
            <Route path="/users" element={canAccessRoute(user, 'users') ? <Users /> : <Navigate to="/" replace />} />
            <Route path="/audits" element={canAccessRoute(user, 'audits') ? <Audits /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}

const App: React.FC = () => (
  <AppProviders>
    <HashRouter>
      <ProtectedApp />
    </HashRouter>
  </AppProviders>
);

export default App;
