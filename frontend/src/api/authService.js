import api from './axiosConfig';

export const register = async (name, email, password) => {
  return await api.post('/auth/register', { name, email, password });
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.access_token) {
    // Store JWT + profile info in localStorage for Protected Routes and
    // the dashboard's personalized greeting.
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('role', response.data.role);
    localStorage.setItem('name', response.data.user?.name || '');
    localStorage.setItem('userId', response.data.user?.id || '');
    // Consumed once by the dashboard to show a first-time welcome message,
    // then cleared so a page refresh falls back to "welcome back".
    localStorage.setItem('firstLogin', response.data.first_login ? 'true' : 'false');
  }
  return response.data;
};

export const logout = () => {
  localStorage.clear();
};

export const getProfile = () => api.get('/auth/me');

export const updateProfile = async (name) => {
  const response = await api.patch('/auth/me', { name });
  // Keep the greeting on the dashboard in sync with the new name.
  localStorage.setItem('name', response.data.name);
  return response.data;
};

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });