import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build the React calendar as a SINGLE self-contained IIFE bundle and
// write it straight into the Salesforce static resources folder.
// React/ReactDOM are bundled in; the entry's exports (mount/unmount)
// are exposed on window.MeetSlotApp.
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: '../salesforce/force-app/main/default/staticresources',
    emptyOutDir: false,
    lib: {
      entry: 'src/main.jsx',
      name: 'MeetSlotApp',
      formats: ['iife'],
      fileName: () => 'meetSlot.js'
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true
      }
    }
  }
});
