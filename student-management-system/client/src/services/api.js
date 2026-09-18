import axios from 'axios';

// All requests go to /api. During development Vite forwards them to the
// Express server (see vite.config.js). The browser never talks to the data store directly.
const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

// Turn any request error into a friendly sentence for the UI.
export function getErrorMessage(error) {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;

  if (error?.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.';
  }

  // No response at all, or the proxy could not reach the API
  if (!error?.response || error.response.status >= 500) {
    return 'Cannot reach the platform right now. Please check your connection and try again.';
  }

  return 'Something went wrong. Please try again.';
}

export default api;
