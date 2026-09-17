import axios from 'axios';

// All requests go to /api. During development Vite forwards them to the
// Express server (see vite.config.js). The browser never talks to MongoDB directly.
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

  // No response at all, or the Vite proxy could not reach the Express server
  if (!error?.response || error.response.status >= 500) {
    return 'Cannot reach the server. Make sure the backend is running (cd server → npm run dev).';
  }

  return 'Something went wrong. Please try again.';
}

export default api;
