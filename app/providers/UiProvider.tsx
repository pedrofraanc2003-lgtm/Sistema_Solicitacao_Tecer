import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Notification } from '../../types';
import { safeUuid } from '../../services/data/utils';

type UiContextValue = {
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  notifications: Notification[];
  pushNotification: (message: string, requestId: string) => void;
  markNotificationsRead: () => void;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('tecer_theme') as 'light' | 'dark') || 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tecer_theme', theme);
  }, [theme]);

  const pushNotification = useCallback((message: string, requestId: string) => {
    setNotifications(prev => [
      {
        id: safeUuid(),
        message,
        requestId,
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
  }, []);

  const value = useMemo<UiContextValue>(
    () => ({
      theme,
      setTheme,
      notifications,
      pushNotification,
      markNotificationsRead,
    }),
    [markNotificationsRead, notifications, pushNotification, theme]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi must be used within UiProvider');
  }

  return context;
}
