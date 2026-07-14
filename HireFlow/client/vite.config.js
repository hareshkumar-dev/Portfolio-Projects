import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api requests are proxied to the API server so the
// frontend can use relative URLs in every environment.
// Ports 3004/5004 keep HireFlow independent of the other apps.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004,
    proxy: {
      '/api': 'http://localhost:5004',
    },
  },
});
