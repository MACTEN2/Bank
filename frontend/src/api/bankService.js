import api from './axiosConfig';

export const getAccountDetails = (accountId) => {
  return api.get(`/accounts/${accountId}`);
};

export const getTransactionHistory = (accountId) => {
  return api.get(`/accounts/${accountId}/transactions`);
};

export const depositMoney = (accountId, amount) => {
  return api.post(`/accounts/${accountId}/deposit`, { amount });
};

export const withdrawMoney = (accountId, amount) => {
  return api.post(`/accounts/${accountId}/withdraw`, { amount });
};