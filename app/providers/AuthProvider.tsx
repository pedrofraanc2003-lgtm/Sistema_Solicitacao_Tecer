import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../../types';
import { getAuthMode, getAuthModeLabel, type AuthMode } from '../../services/authMode';
import { getSessionUser, signIn, signOut, subscribeToAuthChanges } from '../../services/data/authApi';

type AuthContextValue = {
  user: User | null;
  isAuthLoading: boolean;
  authMode: AuthMode;
  authModeLabel: string;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setAuthenticatedUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const authMode = getAuthMode();

  const resolveSessionUser = useCallback(async () => {
    try {
      return await getSessionUser();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadingGuard = window.setTimeout(() => {
      if (!active) return;
      setUser(null);
      setIsAuthLoading(false);
    }, 7000);

    void resolveSessionUser().then(profile => {
      if (!active) return;
      setUser(profile);
      setIsAuthLoading(false);
      window.clearTimeout(loadingGuard);
    });

    const subscription = subscribeToAuthChanges(async nextUser => {
      if (!active) return;

      if (nextUser) {
        setUser(nextUser);
        setIsAuthLoading(false);
        window.clearTimeout(loadingGuard);
        return;
      }

      const confirmedUser = await resolveSessionUser();
      if (!active) return;

      setUser(confirmedUser);
      setIsAuthLoading(false);
      window.clearTimeout(loadingGuard);
    });

    return () => {
      active = false;
      window.clearTimeout(loadingGuard);
      subscription.unsubscribe();
    };
  }, [resolveSessionUser]);

  const login = useCallback(async (identifier: string, password: string) => {
    const authenticatedUser = await signIn(identifier, password);
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthLoading,
      authMode,
      authModeLabel: getAuthModeLabel(authMode),
      login,
      logout,
      setAuthenticatedUser: setUser,
    }),
    [authMode, isAuthLoading, login, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
