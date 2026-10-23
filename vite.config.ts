import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { seoPlugin } from './scripts/seo/site';

function replaceableHeicBoundary(): Plugin {
  return {
    name: 'preserve-lgpl-module-boundary',
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if (/[/\\]node_modules[/\\]heic-to[/\\]/.test(id)) {
          this.error('HEIC must remain a separate replaceable module in /vendor/heic/.');
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    seoPlugin(process.env.SITE_URL || loadEnv(mode, process.cwd(), '').SITE_URL),
    replaceableHeicBoundary(),
  ],
  // Keep the first lazy OCR/HEIC upload from triggering a dependency-optimizer reload.
  optimizeDeps: { include: ['tesseract.js'] },
  worker: { format: 'es', plugins: () => [replaceableHeicBoundary()] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
}));
