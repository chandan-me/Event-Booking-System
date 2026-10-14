import { apiClient } from './client';

export const eventsApi = {
  getEvents: async (params = {}) => {
    const res = await apiClient.get('/api/v1/events', { params });
    return res.data;
  },

  getEventById: async (id) => {
    const res = await apiClient.get(`/api/v1/events/${id}`);
    return res.data;
  },

  getCategories: async () => {
    const res = await apiClient.get('/api/v1/categories');
    return res.data;
  },

  createCategory: async (payload) => {
    const res = await apiClient.post('/api/v1/categories', payload);
    return res.data;
  },

  createEvent: async (payload) => {
    const res = await apiClient.post('/api/v1/events', payload);
    return res.data;
  },

  updateEvent: async (id, payload) => {
    const res = await apiClient.patch(`/api/v1/events/${id}`, payload);
    return res.data;
  },

  deleteEvent: async (id) => {
    const res = await apiClient.delete(`/api/v1/events/${id}`);
    return res.data;
  },
};
