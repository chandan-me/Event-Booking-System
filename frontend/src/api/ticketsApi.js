import { apiClient } from './client';

export const ticketsApi = {
  getMyTickets: async (params = {}) => {
    const res = await apiClient.get('/api/v1/tickets/my-tickets', { params });
    return res.data;
  },

  getTicketById: async (ticketId) => {
    const res = await apiClient.get(`/api/v1/tickets/${ticketId}`);
    return res.data;
  },

  getTicketByRef: async (ticketRef) => {
    const res = await apiClient.get(`/api/v1/tickets/ref/${ticketRef}`);
    return res.data;
  },

  resendTicketEmail: async (ticketId) => {
    const res = await apiClient.post(`/api/v1/tickets/${ticketId}/resend-email`);
    return res.data;
  },

  resendBookingEmail: async (bookingId) => {
    const res = await apiClient.post(`/api/v1/bookings/${bookingId}/resend-email`);
    return res.data;
  },

  verifyCheckIn: async (payload) => {
    const res = await apiClient.post('/api/v1/check-in/verify', payload);
    return res.data;
  },

  scanCheckIn: async (payload) => {
    const res = await apiClient.post('/api/v1/check-in/scan', payload);
    return res.data;
  },

  getCheckInStats: async (eventId) => {
    const res = await apiClient.get(`/api/v1/events/${eventId}/check-in-stats`);
    return res.data;
  },
};
