import api from './api.js';

export async function getDashboard() {
  const response = await api.get('/dashboard');
  return response.data;
}

export async function getDatabaseStatus() {
  const response = await api.get('/database/status');
  return response.data;
}

export async function syncAllRecords() {
  const response = await api.post('/database/sync-all');
  return response.data;
}
