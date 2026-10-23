import { cp, mkdir, readdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const destination = path.join(root, 'public/ocr');
await mkdir(destination, { recursive: true });
await copyFile(
  require.resolve('tesseract.js/dist/worker.min.js'),
  path.join(destination, 'worker.min.js'),
);
await copyFile(
  require.resolve('tesseract.js/dist/worker.min.js.LICENSE.txt'),
  path.join(destination, 'worker.min.js.LICENSE.txt'),
);
const core = path.dirname(require.resolve('tesseract.js-core'));
for (const file of await readdir(core)) {
  if (file.endsWith('.wasm') || file.endsWith('.wasm.js')) {
    await cp(path.join(core, file), path.join(destination, file));
  }
}
for (const language of ['rus', 'eng']) {
  const languageRoot = path.dirname(require.resolve(`@tesseract.js-data/${language}/package.json`));
  await copyFile(
    path.join(languageRoot, '4.0.0_best_int', `${language}.traineddata.gz`),
    path.join(destination, `${language}.traineddata.gz`),
  );
}
console.log('Локальные ресурсы OCR готовы.');
