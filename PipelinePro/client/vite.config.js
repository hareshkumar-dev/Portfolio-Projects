import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api requests are proxied to the API server so the
// frontend can use relative URLs in every environment.
// Ports 3001/5001 keep PipelinePro independent of ServiceDesk (3000/5000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
});
