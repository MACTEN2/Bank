import api from './axiosConfig';

export const getMyBudgets = () => api.get('/budgets/me');

export const upsertBudget = (category, monthlyLimit) =>
  api.post('/budgets', { category, monthly_limit: monthlyLimit });

export const deleteBudget = (id) => api.delete(`/budgets/${id}`);
