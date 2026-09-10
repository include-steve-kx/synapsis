import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/ios/**', '**/build/**', '**/tmp/**', '**/output/**'] },
  },
  build: { target: 'es2022', sourcemap: true },
});
