import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Address of the Express backend.
// Every request the React app makes to /api is forwarded there, so the browser
// never needs the backend URL – and never sees any database credentials.
// If you change PORT in server/.env, start the client with: BACKEND_URL=http://localhost:<port> npm run dev
const BACKEND_URL = process.env.BACKEND_URL || 'https://mongopro.vercel.app';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND_URL,
    },
  },
});
