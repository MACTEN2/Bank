import api from './axiosConfig';

export const getMyGoals = () => api.get('/goals/me');

export const createGoal = (name, targetAmount) => api.post('/goals', { name, target_amount: targetAmount });

export const contributeToGoal = (goalId, amount) => api.post(`/goals/${goalId}/contribute`, { amount });

export const deleteGoal = (goalId) => api.delete(`/goals/${goalId}`);
