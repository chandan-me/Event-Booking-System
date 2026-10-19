import { apiClient } from './client';

export const authApi = {
  register: async (payload) => {
    const res = await apiClient.post('/api/v1/auth/register', payload);
    return res.data;
  },

  verifyOtp: async (payload) => {
    const res = await apiClient.post('/api/v1/auth/verify-otp', payload);
    return res.data;
  },

  resendOtp: async (payload) => {
    const res = await apiClient.post('/api/v1/auth/resend-otp', payload);
    return res.data;
  },

  login: async (payload) => {
    const res = await apiClient.post('/api/v1/auth/login', payload);
    return res.data;
  },

  getProfile: async () => {
    const res = await apiClient.get('/api/v1/auth/me');
    return res.data;
  },

  forgotPassword: async (payload) => {
    const res = await apiClient.post('/api/v1/auth/forgot-password', payload);
    return res.data;
  },

  resetPassword: async (payload) => {
    const res = await apiClient.post('/api/v1/auth/reset-password', payload);
    return res.data;
  },

  logout: async () => {
    try {
      const res = await apiClient.post('/api/v1/auth/logout');
      return res.data;
    } catch {
      return { success: true };
    }
  },

  refresh: async () => {
    const res = await apiClient.post('/api/v1/auth/refresh');
    return res.data;
  },

  setupMfa: async () => {
    const res = await apiClient.post('/api/v1/auth/mfa/setup');
    return res.data;
  },

  verifyMfa: async (code) => {
    const res = await apiClient.post('/api/v1/auth/mfa/verify', { code });
    return res.data;
  },

  disableMfa: async (code, password) => {
    const res = await apiClient.post('/api/v1/auth/mfa/disable', { code, password });
    return res.data;
  },
};
