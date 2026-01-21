// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/static',    // build files go into backend/static
    emptyOutDir: true,             // clear previous builds
    assetsDir: '',                 // (optional) put assets at static root
  },
  base: '/static/',  // ensure asset URLs point to /static/:contentReference[oaicite:10]{index=10}
});
