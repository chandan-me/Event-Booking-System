import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { setAccessToken, getAccessToken, clearAuthTokens } from '../api/client';

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

  // Sync profile if token exists or silently refresh via HttpOnly cookie on initial app load
  useEffect(() => {
    const initAuth = async () => {
      let token = getAccessToken();

      // If no token in memory, attempt silent refresh via HttpOnly session cookie
      if (!token) {
        try {
          const refreshRes = await authApi.refresh();
          if (refreshRes.success && refreshRes.data?.access_token) {
            token = refreshRes.data.access_token;
            setAccessToken(token);
          }
        } catch {
          // No active HttpOnly cookie session
        }
      }

      if (token) {
        try {
          const res = await authApi.getProfile();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch {
          clearAuthTokens();
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        localStorage.removeItem('user');
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    const handleForceLogout = () => {
      clearAuthTokens();
      localStorage.removeItem('user');
      setUser(null);
    };

    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (email, password, totpCode) => {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const res = await authApi.login({ email: cleanEmail, password, totp_code: totpCode });
    if (res.success && res.data) {
      const { access_token } = res.data;
      const userData = res.data.user || {
        id: res.data.user_id || res.data.id,
        email: res.data.email,
        role: res.data.role,
        full_name: res.data.full_name,
        organization_name: res.data.organization_name,
      };

      // Store access token in-memory only (never exposed in persistent localStorage)
      if (access_token) {
        setAccessToken(access_token);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData, ...res.data };
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (emailOrPayload, password, fullName, role, organizationName) => {
    let payload;
    if (typeof emailOrPayload === 'object') {
      payload = emailOrPayload;
    } else {
      payload = {
        email: emailOrPayload,
        password,
        full_name: fullName,
        role: role || 'CUSTOMER',
        organization_name: organizationName || undefined,
      };
    }
    const res = await authApi.register(payload);
    return res;
  };

  const verifyOtp = async (emailOrPayload, otp) => {
    const payload =
      typeof emailOrPayload === 'object'
        ? emailOrPayload
        : { email: emailOrPayload, otp };
    const res = await authApi.verifyOtp(payload);
    return res;
  };

  const resendOtp = async (emailOrPayload) => {
    const payload =
      typeof emailOrPayload === 'object'
        ? emailOrPayload
        : { email: emailOrPayload };
    const res = await authApi.resendOtp(payload);
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
    clearAuthTokens();
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ORGANISER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        isOrganizer,
        login,
        register,
        verifyOtp,
        resendOtp,
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
