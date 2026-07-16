import api from './axiosConfig';

export const sendChatMessage = (messages) => api.post('/chat/message', { messages });
