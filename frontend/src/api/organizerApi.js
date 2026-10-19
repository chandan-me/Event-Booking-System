import { apiClient } from './client';

export const organizerApi = {
  getAnalytics: async (eventIds = []) => {
    const query = eventIds && eventIds.length > 0 ? `?event_ids=${eventIds.join(',')}` : '';
    const res = await apiClient.get(`/api/v1/organizer/analytics${query}`);
    return res.data;
  },

  getHostedEvents: async () => {
    const res = await apiClient.get('/api/v1/organizer/events');
    return res.data;
  },

  createEvent: async (payload) => {
    const res = await apiClient.post('/api/v1/events', payload);
    return res.data;
  },

  updateEvent: async (eventId, payload) => {
    const res = await apiClient.patch(`/api/v1/events/${eventId}`, payload);
    return res.data;
  },

  cancelEvent: async (eventId) => {
    const res = await apiClient.delete(`/api/v1/events/${eventId}`);
    return res.data;
  },

  addSeats: async (eventId, payload) => {
    const res = await apiClient.post(`/api/v1/organizer/events/${eventId}/add-seats`, payload);
    return res.data;
  },

  getAttendees: async (eventId) => {
    const res = await apiClient.get(`/api/v1/organizer/events/${eventId}/attendees`);
    return res.data;
  },

  checkIn: async (payload) => {
    const res = await apiClient.post('/api/v1/organizer/check-in', payload);
    return res.data;
  },
};
