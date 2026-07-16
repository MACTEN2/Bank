import api from './axiosConfig';

export const getMyBeneficiaries = () => api.get('/beneficiaries/me');

export const createBeneficiary = (nickname, accountId) =>
  api.post('/beneficiaries', { nickname, account_id: accountId });

export const deleteBeneficiary = (id) => api.delete(`/beneficiaries/${id}`);
