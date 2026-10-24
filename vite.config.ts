import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { seoPlugin } from './scripts/seo/site';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { BANK_LOGOS_ENABLED } from './src/features/banks/model/logo-visibility';

function bankLogoVisibility(): Plugin {
  let outputDirectory: string;
  return {
    name: 'bank-logo-visibility',
    apply: 'build',
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir);
    },
    async writeBundle() {
      // Vite copies public/ before this hook. Remove only generated copies,
      // preserving every original image in public/banks/ for a future restore.
      if (!BANK_LOGOS_ENABLED)
        await rm(path.join(outputDirectory, 'banks'), { recursive: true, force: true });
    },
  };
}

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
    bankLogoVisibility(),
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
