import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await readFile(path.join(root, 'vendor/manifest.json'), 'utf8'));
const moduleFile = path.join(root, 'node_modules/heic-to/dist/next/heic-to.js');
const bytes = await readFile(moduleFile);
const digest = createHash('sha256').update(bytes).digest('hex');
if (digest !== manifest.heic.moduleSha256)
  throw new Error(
    'HEIC module changed: review its sources and licenses before updating vendor/manifest.json.',
  );
const target = path.join(root, 'public/vendor/heic');
await mkdir(target, { recursive: true });
await copyFile(moduleFile, path.join(target, 'heic-to.mjs'));
console.log('Отдельный заменяемый HEIC-модуль готов.');
