import api from './axiosConfig';

export const getAllUsers = () => api.get('/admin/users/all');

export const getAllAccounts = () => api.get('/admin/accounts/all');

export const getAccountTransactions = (accountId) =>
  api.get(`/admin/accounts/${accountId}/transactions`);

export const adjustAccountBalance = (accountId, amount, type, reason) =>
  api.post(`/admin/accounts/${accountId}/adjust`, { amount, type, reason });

export const toggleAccountFreeze = (accountId, reason) =>
  api.post(`/admin/accounts/${accountId}/freeze`, reason ? { reason } : {});

export const updateUserRole = (userId, role) =>
  api.patch(`/admin/users/${userId}/role`, { role });

export const getTransactionFeed = (limit = 50) =>
  api.get(`/admin/transactions/feed?limit=${limit}`);
