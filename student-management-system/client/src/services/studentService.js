import api from './api.js';

// params: { search, branch, city, sortBy, order, page, limit }
export async function getStudents(params) {
  const response = await api.get('/students', { params });
  return response.data;
}

export async function getStudentFilters() {
  const response = await api.get('/students/filters');
  return response.data;
}

export async function getStudent(id) {
  const response = await api.get(`/students/${id}`);
  return response.data;
}

export async function createStudent(student) {
  const response = await api.post('/students', student);
  return response.data;
}

export async function updateStudent(id, student) {
  const response = await api.put(`/students/${id}`, student);
  return response.data;
}

export async function deleteStudent(id) {
  const response = await api.delete(`/students/${id}`);
  return response.data;
}
