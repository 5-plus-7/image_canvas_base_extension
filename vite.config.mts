import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 重要: 多维表格插件部署需要相对路径
  server: {
    port: 3000,
    host: '0.0.0.0', // 允许外部访问
    open: true,
  },
  publicDir: "public",
  optimizeDeps: {
    esbuildOptions: {
      // Bumping to 2022 due to "Arbitrary module namespace identifier names" not being
      // supported in Vite's default browser target https://github.com/vitejs/vite/issues/13556
      target: "es2022",
      treeShaking: true,
    },
  },
});
