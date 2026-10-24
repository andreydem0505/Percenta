import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const temporary = await mkdtemp(path.join(tmpdir(), 'percenta-fonts-'));
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const previousConfig = process.env.FONTCONFIG_FILE;
try {
  // Use the distributed font, without installing it on the developer's system.
  const config = path.join(temporary, 'fonts.conf');
  await writeFile(
    config,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${escapeXml(path.join(root, 'public/fonts'))}</dir><cachedir>${escapeXml(temporary)}</cachedir></fontconfig>`,
  );
  process.env.FONTCONFIG_FILE = config;
  const { default: sharp } = await import('sharp');
  await sharp(path.join(root, 'scripts/seo/social-card.svg'))
    .png()
    .toFile(path.join(root, 'public/social-card.png'));
  console.log('Социальное превью Percenta обновлено с локальным шрифтом Onest.');
} finally {
  if (previousConfig === undefined) delete process.env.FONTCONFIG_FILE;
  else process.env.FONTCONFIG_FILE = previousConfig;
  await rm(temporary, { recursive: true, force: true });
}
