import { mkdir, readFile, readdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(root, 'public/legal');
const manifest = JSON.parse(await readFile(path.join(root, 'vendor/manifest.json'), 'utf8'));
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Fail closed: updating a binary without reviewing its corresponding sources is not a release.
for (const asset of [...manifest.sources, ...manifest.licenses]) {
  const bytes = await readFile(path.join(root, 'vendor', asset.file));
  if (hash(bytes) !== asset.sha256) throw new Error(`Unreviewed legal asset: ${asset.file}`);
}
for (const font of manifest.fonts) {
  const bytes = await readFile(path.join(root, 'public', font.file));
  if (hash(bytes) !== font.sha256) throw new Error(`Unreviewed font: ${font.file}`);
}
for (const model of manifest.models) {
  const folder = path.join(root, 'node_modules', model.package);
  const pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8'));
  const bytes = await readFile(path.join(folder, model.file));
  const gitHash = createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest('hex');
  if (
    pkg.version !== model.packageVersion ||
    hash(bytes) !== model.sha256 ||
    gitHash !== model.gitBlobSha1
  ) {
    throw new Error(`Unreviewed OCR language model: ${model.language}`);
  }
}
const core = JSON.parse(
  await readFile(path.join(root, 'node_modules/tesseract.js-core/package.json'), 'utf8'),
);
if (core.version !== manifest.ocr.coreVersion)
  throw new Error('OCR core changed: review native-library notices.');

for (const generated of ['licenses/packages', 'sources', 'integration']) {
  await rm(path.join(target, generated), { recursive: true, force: true });
  await mkdir(path.join(target, generated), { recursive: true });
}
const sections = [
  'Percenta — сторонние компоненты\n\nОригинальные лицензии и уведомления сохранены ниже. Производственный npm-граф включает также Node.js-зависимости, которые могут не попасть в браузер. Языковые npm-обёртки нужны только при сборке; поставляемые бинарные модели отдельно проверены по upstream Git blob SHA-1 и SHA-256 и лицензируются по Apache-2.0. Банковские изображения не входят в эти свободные лицензии.\n',
  await readFile(path.join(root, 'NOTICE'), 'utf8'),
];
// These exact releases belong to firebase-js-sdk, whose npm subpackages omit
// the repository-level LICENSE. Preserve the reviewed upstream text verbatim.
const supplemental = {
  'tr46@0.0.3': 'licenses/tr46-MIT.txt',
  ...Object.fromEntries(
    [
      '@firebase/app@0.16.2',
      '@firebase/analytics@0.10.25',
      '@firebase/component@0.7.5',
      '@firebase/installations@0.6.24',
      '@firebase/logger@0.5.2',
      '@firebase/util@1.15.3',
    ].map((name) => [name, 'licenses/firebase-Apache-2.0.txt']),
  ),
};
// tslib 2.8.1 ships the reviewed Microsoft 0BSD notice in LICENSE.txt.
const allowed = new Set(['MIT', 'ISC', 'Apache-2.0', 'LGPL-3.0', 'BSD-2-Clause', '0BSD']);
const inventory = [];
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location || entry.dev || entry.link) continue;
  const folder = path.join(root, location);
  const pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8'));
  if (!allowed.has(pkg.license))
    throw new Error(`License review required: ${pkg.name}@${pkg.version} (${pkg.license})`);
  const files = (await readdir(folder)).filter((name) =>
    /^(licen[cs]e|copying|notice)(?:[-._]|$)/i.test(name),
  );
  const key = `${pkg.name}@${pkg.version}`;
  const text = [
    `\n${'='.repeat(72)}\n${key}\nLicense: ${pkg.license}\nSource: ${typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || pkg.homepage || entry.resolved}\n`,
  ];
  const id = `${pkg.name.replaceAll('/', '__').replaceAll('@', '')}-${pkg.version}`;
  const notices = [];
  for (const file of files.sort()) {
    const content = await readFile(path.join(folder, file), 'utf8');
    const destination = `licenses/packages/${id}-${file.replace(/[^a-z0-9.-]/gi, '_')}.txt`;
    await writeFile(path.join(target, destination), content);
    text.push(`\n--- ${file} ---\n${content}`);
    notices.push(destination);
  }
  if (!files.length) {
    const file = supplemental[key];
    if (!file)
      throw new Error(`Missing license text for ${key}: supply a reviewed upstream notice.`);
    const license = manifest.licenses.find((asset) => asset.file === file);
    if (!license) throw new Error(`Missing supplemental provenance for ${key}`);
    const content = await readFile(path.join(root, 'vendor', file), 'utf8');
    text.push(
      `\nSupplemental upstream notice (npm metadata declares ${pkg.license}): ${license.url}\n${content}`,
    );
    notices.push(file);
  }
  inventory.push({ name: pkg.name, version: pkg.version, license: pkg.license, notices });
  sections.push(text.join(''));
}
for (const asset of manifest.licenses) {
  const bytes = await readFile(path.join(root, 'vendor', asset.file));
  await copyFile(path.join(root, 'vendor', asset.file), path.join(target, asset.file));
  sections.push(
    `\n${'='.repeat(72)}\n${asset.name}\nSource: ${asset.url}\nSHA-256: ${asset.sha256}\n\n${bytes.toString('utf8')}`,
  );
}
for (const asset of manifest.sources)
  await copyFile(path.join(root, 'vendor', asset.file), path.join(target, asset.file));
for (const [source, destination] of [
  ['src/features/recognition/workers/heic.worker.ts', 'integration/heic.worker.ts.txt'],
  ['scripts/vendor/rebuild-heic.mjs', 'integration/rebuild-heic.mjs'],
  ['node_modules/heic-to/README.md', 'heic-build-instructions.txt'],
  ['scripts/banks/provenance/logo-rights.json', 'bank-image-rights.json'],
])
  await copyFile(path.join(root, source), path.join(target, destination));
const workerNotice = await readFile(
  path.join(root, 'node_modules', manifest.ocr.workerLicenseSidecar),
  'utf8',
);
sections.push(`\n${'='.repeat(72)}\nTesseract browser-worker bundled notices\n\n${workerNotice}`);
await writeFile(path.join(target, 'third-party.txt'), sections.join('\n'));
await writeFile(
  path.join(target, 'vendor-manifest.json'),
  JSON.stringify({ ...manifest, npm: inventory }, null, 2) + '\n',
);
console.log('Проверены лицензии, исходники HEIC и происхождение языковых моделей.');
