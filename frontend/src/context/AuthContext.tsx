import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResponse } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: AuthResponse | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isClientAdmin: boolean;
  isStudent: boolean;
  isLoading: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        // Verify with server in background
        api.getMe()
          .then((fresh) => {
            const updated = { ...fresh, token };
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
          })
          .catch(() => {
            // Token might be expired or server unreachable
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (authData: AuthResponse) => {
    setUser(authData);
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData));
    sessionStorage.removeItem('notification_prompt_dismissed');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const fresh = await api.getMe();
      const token = localStorage.getItem('token') || '';
      const updated = { ...fresh, token };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to refresh user info', e);
    }
  };

  const isSuperAdmin = user?.role === 'ROLE_SUPER_ADMIN';
  const isClientAdmin = user?.role === 'ROLE_ADMIN';
  const isAdmin = isClientAdmin || isSuperAdmin;
  const isStudent = user?.role === 'ROLE_STUDENT';

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, isClientAdmin, isStudent, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
