import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: 'admin' | 'analyst' | 'viewer') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getStoredToken();
        if (token) {
          const profile = await api.getMe();
          setUser(profile);
        } else {
          // Auto-login as Alex Vance (SecOps Lead / Admin) for instant prototype usability
          await switchRole('admin');
        }
      } catch (err) {
        console.warn('Initial session expired, logging in as default admin:', err);
        try {
          await switchRole('admin');
        } catch {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setStoredToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const switchRole = async (role: 'admin' | 'analyst' | 'viewer') => {
    const credentials = {
      admin: { email: 'admin@cloudsentinel.io', password: 'Admin@123456' },
      analyst: { email: 'analyst@cloudsentinel.io', password: 'Analyst@123456' },
      viewer: { email: 'viewer@cloudsentinel.io', password: 'Viewer@123456' }
    }[role];

    const res = await api.login(credentials);
    setStoredToken(res.access_token);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole }}>
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
