import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build the React app as a SINGLE self-contained IIFE bundle and write
// it straight into the Salesforce static resources folder. React and
// ReactDOM are bundled in (not externalized), and the entry's exports
// (mount / unmount) are exposed on window.ProjectBoardApp.
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
      name: 'ProjectBoardApp',
      formats: ['iife'],
      fileName: () => 'projectBoard.js'
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true
      }
    }
  }
});
