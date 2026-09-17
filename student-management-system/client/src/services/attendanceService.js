import api from './api.js';

// params: { courseId, studentId, low }
export async function getAttendance(params) {
  const response = await api.get('/attendance', { params });
  return response.data;
}

export async function createAttendance(record) {
  const response = await api.post('/attendance', record);
  return response.data;
}

export async function updateAttendance(id, record) {
  const response = await api.put(`/attendance/${id}`, record);
  return response.data;
}

export async function deleteAttendance(id) {
  const response = await api.delete(`/attendance/${id}`);
  return response.data;
}
