import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANK_LOGOS_ENABLED } from '../../src/features/banks/model/logo-visibility.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFile(path.join(root, file));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await read('vendor/manifest.json'));

// Read selected tar entries without extracting or executing anything from the archives.
function tarEntries(gzip) {
  const tar = gunzipSync(gzip);
  const entries = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const string = (start, length) =>
      header
        .subarray(start, start + length)
        .toString()
        .replace(/\0.*$/s, '');
    const name = [string(345, 155), string(0, 100)].filter(Boolean).join('/');
    const size = parseInt(string(124, 12).trim() || '0', 8);
    assert(
      Number.isSafeInteger(size) && size >= 0 && offset + 512 + size <= tar.length,
      'Invalid source archive',
    );
    const type = string(156, 1);
    if (type === '0' || type === '')
      entries.set(name, tar.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}
for (const asset of [...manifest.sources, ...manifest.licenses]) {
  const local = await read(`vendor/${asset.file}`);
  assert.equal(sha(local), asset.sha256, asset.file);
  assert.equal(
    sha(await read(`dist/legal/${asset.file}`)),
    asset.sha256,
    `Missing distributed ${asset.file}`,
  );
}
const heic = tarEntries(await read('vendor/sources/heic-to-1.6.6.tar.gz'));
assert.equal(sha(heic.get('heic-to-1.6.6/dist/next/heic-to.js')), manifest.heic.moduleSha256);
assert(heic.get('heic-to-1.6.6/src/lib/libheif.js').toString().includes('LIBDE265_VERSION=1.0.16'));
for (const source of manifest.sources.filter((asset) => asset.name !== 'heic-to')) {
  const files = tarEntries(await read(`vendor/${source.file}`));
  assert(
    [...files.keys()].some((file) => /\.(c|cpp)$/.test(file)),
    `${source.name} C/C++ sources missing`,
  );
  assert(
    [...files.keys()].some((file) => /\/COPYING$/.test(file)),
    `${source.name} license missing`,
  );
}
assert.equal(sha(await read('dist/vendor/heic/heic-to.mjs')), manifest.heic.moduleSha256);
const workerName = (await readdir(path.join(root, 'dist/assets'))).find((file) =>
  /^heic\.worker-.*\.js$/.test(file),
);
assert(workerName, 'HEIC worker missing');
const worker = (await read(`dist/assets/${workerName}`)).toString();
assert(worker.includes('vendor/heic/heic-to.mjs'));
assert(Buffer.byteLength(worker) < 20_000, 'LGPL module was bundled into the application worker');
assert(
  !/subtle\.digest|integrity:/.test(worker),
  'Runtime replacement must not be integrity-locked',
);
assert.equal(
  (await read('dist/ocr/worker.min.js.LICENSE.txt')).toString(),
  (await read('node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt')).toString(),
);
for (const model of manifest.models)
  assert.equal(sha(await read(`dist/ocr/${model.language}.traineddata.gz`)), model.sha256);
const outputManifest = JSON.parse(await read('dist/legal/vendor-manifest.json'));
for (const font of manifest.fonts) {
  assert.equal(sha(await read(`dist/${font.file}`)), font.sha256, font.file);
  assert(
    (await read(`dist/legal/${font.licenseFile}`)).toString().includes('SIL OPEN FONT LICENSE'),
  );
}
assert(outputManifest.npm.every((pkg) => pkg.notices.length > 0));
for (const file of [
  'integration/heic.worker.ts.txt',
  'integration/rebuild-heic.mjs',
  'heic-replacement.txt',
  'third-party.txt',
  'bank-image-rights.json',
])
  assert((await read(`dist/legal/${file}`)).length > 0);
const images = JSON.parse(await read('dist/legal/bank-image-rights.json'));
for (const image of images.images) {
  assert.equal(sha(await read(`public/${image.file}`)), image.sha256, image.name);
  if (BANK_LOGOS_ENABLED)
    assert.equal(sha(await read(`dist/${image.file}`)), image.sha256, image.name);
}
if (!BANK_LOGOS_ENABLED)
  assert(
    !(await readdir(path.join(root, 'dist'))).includes('banks'),
    'Disabled bank images must not be included in the production build',
  );
const notice = (await read('dist/legal/third-party.txt')).toString();
for (const item of ['Leptonica', 'libwebp', 'Emscripten', 'ieee754', 'buffer', 'libde265', 'tr46'])
  assert(notice.toLowerCase().includes(item.toLowerCase()), `Missing ${item} attribution`);
console.log(
  'OK: library sources, notices, model provenance and independently replaceable HEIC module are delivered.',
);
console.log(
  `Bank images are preserved locally, public display is ${BANK_LOGOS_ENABLED ? 'enabled' : 'disabled'}: ${images.summary.notEstablished} owner grants remain unconfirmed; this check does not certify legal clearance.`,
);
