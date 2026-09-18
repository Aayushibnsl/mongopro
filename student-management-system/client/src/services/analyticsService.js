import api from './api.js';

// Every analytics figure the app needs, in one request.
export async function getAnalytics() {
  const response = await api.get('/analytics');
  return response.data;
}
