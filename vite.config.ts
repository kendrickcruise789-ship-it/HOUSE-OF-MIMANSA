import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Same-origin path the deployed shop service answers on; `npm run shop:local` serves it.
      // SHOP_DEV_USER makes the local host act as that fixture account, which is the only way
      // to open the owner panel in a browser preview — the deployed entry point has no such switch.
      proxy: {
        '/functions/v1/app': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (p) =>
            process.env.SHOP_DEV_USER
              ? `${p}${p.includes('?') ? '&' : '?'}user=${process.env.SHOP_DEV_USER}`
              : p,
        },
      },
    },
  };
});
