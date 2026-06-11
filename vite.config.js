import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Porra-Infelices/',
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {},
  server: {
    port: 3000,
    open: true,
  },
});