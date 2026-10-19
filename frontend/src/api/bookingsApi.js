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

  createRazorpayOrder: async (payload) => {
    const res = await apiClient.post('/api/v1/bookings/razorpay/order', payload);
    return res.data;
  },

  verifyRazorpayPayment: async (payload) => {
    const res = await apiClient.post('/api/v1/bookings/razorpay/verify', payload);
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

  joinWaitingList: async (payload) => {
    const res = await apiClient.post('/api/v1/waiting-list', payload);
    return res.data;
  },

  getMyWaitingList: async () => {
    const res = await apiClient.get('/api/v1/waiting-list/me');
    return res.data;
  },

  getEventWaitingList: async (eventId) => {
    const res = await apiClient.get(`/api/v1/organizer/events/${eventId}/waiting-list`);
    return res.data;
  },

  getOrganizerWaitingList: async (params = {}) => {
    let p = {};
    if (typeof params === 'object' && params !== null && !Array.isArray(params)) {
      p = params;
    } else if (params) {
      p = { event_ids: String(params) };
    }
    const res = await apiClient.get('/api/v1/organizer/waiting-list', { params: p });
    return res.data;
  },

  getAdminWaitingList: async (params = {}) => {
    const res = await apiClient.get('/api/v1/admin/waiting-list', { params });
    return res.data;
  },

  updateWaitingListStatus: async (entryId, status) => {
    const res = await apiClient.patch(`/api/v1/waiting-list/${entryId}/status`, { status });
    return res.data;
  },
};

