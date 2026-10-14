import { apiClient } from './client';

export const bookingsApi = {
  createBooking: async (payload, idempotencyKey = null) => {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post('/api/v1/bookings', payload, { headers });
    return res.data;
  },

  getMyBookings: async (params = {}) => {
    const res = await apiClient.get('/api/v1/bookings', { params });
    return res.data;
  },

  getBookingById: async (id) => {
    const res = await apiClient.get(`/api/v1/bookings/${id}`);
    return res.data;
  },

  cancelBooking: async (id, reason = 'Customer request') => {
    const res = await apiClient.post(`/api/v1/bookings/${id}/cancel`, { reason });
    return res.data;
  },

  getAllBookingsAdmin: async (params = {}) => {
    const res = await apiClient.get('/api/v1/admin/bookings', { params });
    return res.data;
  },

  getAdminDashboard: async () => {
    const res = await apiClient.get('/api/v1/admin/dashboard');
    return res.data;
  },
};
