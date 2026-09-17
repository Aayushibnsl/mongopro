import api from './api.js';

export async function getCourses(params) {
  const response = await api.get('/courses', { params });
  return response.data;
}

export async function createCourse(course) {
  const response = await api.post('/courses', course);
  return response.data;
}

export async function updateCourse(id, course) {
  const response = await api.put(`/courses/${id}`, course);
  return response.data;
}

export async function deleteCourse(id) {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
}
