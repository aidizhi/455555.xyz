import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        demo: 'demo.html',
        components: 'components.html'
      }
    }
  },
  server: {
    port: 8080,
    open: true
  }
});
