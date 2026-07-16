import api from './axiosConfig';

export const getMyNotifications = () => api.get('/notifications');

export const getUnreadNotificationCount = () => api.get('/notifications/unread-count');

export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.post('/notifications/read-all');
