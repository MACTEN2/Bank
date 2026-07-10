import api from './axiosConfig';

export const getMyAccount = () => api.get('/accounts/me');

export const getMyTransactions = () => api.get('/transactions/me');

export const depositMoney = (amount) => api.post('/transactions/deposit', { amount });

export const withdrawMoney = (amount) => api.post('/transactions/withdraw', { amount });

export const transferMoney = (toAccountId, amount) =>
  api.post('/accounts/transfer', { to_account_id: toAccountId, amount });
