import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, join } from 'path';
import { copyFileSync } from 'fs';

/** Copy index.html to 404.html so Vercel serves the SPA for unmatched routes */
function vercel404Plugin() {
  return {
    name: 'vercel-404',
    closeBundle() {
      const outDir = join(__dirname, 'dist');
      copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [vue(), vercel404Plugin()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3333,
  },
});
