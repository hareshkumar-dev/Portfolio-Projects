import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api requests are proxied to the API server so the
// frontend can use relative URLs in every environment.
// Ports 3003/5003 keep ShopTrack independent of the other apps.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    proxy: {
      '/api': 'http://localhost:5003',
    },
  },
});
