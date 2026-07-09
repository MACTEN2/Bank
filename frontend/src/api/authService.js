import api from './axiosConfig';

export const register = async (name, email, password) => {
  return await api.post('/auth/register', { name, email, password });
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.access_token) {
    // Store JWT in localStorage for Protected Routes
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('accountId', response.data.account_id);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};