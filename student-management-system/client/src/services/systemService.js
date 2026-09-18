import api from './api.js';

// Connection state of the platform's data services. Never returns credentials.
export async function getSystemStatus() {
  const response = await api.get('/database/status');
  return response.data;
}

// Copies every record to the institutional archive database.
export async function syncAllRecords() {
  const response = await api.post('/database/sync-all');
  return response.data;
}
