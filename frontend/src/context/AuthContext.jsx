import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Sync profile if token exists on initial app load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await authApi.getProfile();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch {
          // If profile fetch fails, axios interceptor handles refresh or removal
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleForceLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data) {
      const { user: userData, access_token, refresh_token } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    return res;
  };

  const verifyOtp = async (payload) => {
    const res = await authApi.verifyOtp(payload);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        verifyOtp,
        logout,
        setUser,
      }}
    >
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
