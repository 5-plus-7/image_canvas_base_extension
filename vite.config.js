import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // 使用相对路径，确保飞书多维表格插件环境中资源加载正常
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  optimizeDeps: {
    include: ['@excalidraw/excalidraw', 'react', 'react-dom', 'd3-sankey']
  }
})
