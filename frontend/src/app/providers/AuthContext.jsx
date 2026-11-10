import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import authService from '@/services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setLoading(false); return; }
    authService.me()
      .then(r => setUser(r.data.data))
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password);
    const { token, user: u } = res.data.data;
    localStorage.setItem('auth_token', token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  // Role helpers
  const isAdmin    = user?.role?.name === 'admin';
  const isManager  = user?.role?.name === 'manager' || isAdmin;
  const isOperator = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, isOperator }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
