import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base:'./',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  optimizeDeps: {
    include: ['@excalidraw/excalidraw', 'react', 'react-dom']
  }
})
