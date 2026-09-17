import api from './api.js';

// The list of predefined operations (names, explanations, example queries)
export async function getOperationCatalog() {
  const response = await api.get('/operations');
  return response.data;
}

// e.g. runComparison('gt', { field: 'cgpa', value: 8 })
export async function runComparison(operator, params) {
  const response = await api.get(`/operations/comparison/${operator}`, { params });
  return response.data;
}

// e.g. runLogical('and')
export async function runLogical(operator) {
  const response = await api.get(`/operations/logical/${operator}`);
  return response.data;
}

// e.g. runOther('countDocuments')
export async function runOther(operation) {
  const response = await api.get(`/operations/other/${operation}`);
  return response.data;
}
