import api from './axiosConfig';

export const getMyAccount = () => api.get('/accounts/me');

export const getMyTransactions = (filters = {}) => api.get('/transactions/me', { params: filters });

export const exportMyTransactions = (filters = {}) =>
  api.get('/transactions/me/export', { params: filters, responseType: 'blob' });

export const depositMoney = (amount) => api.post('/transactions/deposit', { amount });

export const withdrawMoney = (amount, category) =>
  api.post('/transactions/withdraw', { amount, category });

export const transferMoney = (toAccountId, amount, category) =>
  api.post('/accounts/transfer', { to_account_id: toAccountId, amount, category });

export const toggleCardLock = () => api.post('/accounts/lock');

export const downloadStatement = (year, month) =>
  api.get('/transactions/me/statement', { params: { year, month }, responseType: 'blob' });
