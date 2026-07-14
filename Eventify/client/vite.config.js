import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api requests are proxied to the API server so the
// frontend can use relative URLs in every environment.
// Ports 3002/5002 keep Eventify independent of the other apps.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      '/api': 'http://localhost:5002',
    },
  },
});
