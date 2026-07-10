import api from './axiosConfig';

export const createTicket = (subject, message) => api.post('/tickets', { subject, message });

export const getMyTickets = () => api.get('/tickets/me');

export const getAllTickets = () => api.get('/tickets');

export const getTicket = (ticketId) => api.get(`/tickets/${ticketId}`);

export const addTicketMessage = (ticketId, text) => api.post(`/tickets/${ticketId}/messages`, { text });

export const resolveTicket = (ticketId) => api.post(`/tickets/${ticketId}/resolve`);
