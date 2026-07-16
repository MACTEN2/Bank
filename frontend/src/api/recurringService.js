import api from './axiosConfig';

export const getMyRecurringTransfers = () => api.get('/recurring/me');

export const createRecurringTransfer = (toAccountId, amount, frequency) =>
  api.post('/recurring', { to_account_id: toAccountId, amount, frequency });

export const toggleRecurringTransfer = (id) => api.post(`/recurring/${id}/toggle`);

export const deleteRecurringTransfer = (id) => api.delete(`/recurring/${id}`);

export const processRecurringTransfers = () => api.post('/recurring/process');
