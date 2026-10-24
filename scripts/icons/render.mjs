import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = fileURLToPath(new URL('./app-icon.svg', import.meta.url));
const publicDirectory = new URL('../../public/', import.meta.url);
await mkdir(new URL('icons/', publicDirectory), { recursive: true });

for (const [size, file] of [
  [180, 'apple-touch-icon.png'],
  [192, 'icons/app-192.png'],
  [512, 'icons/app-512.png'],
]) {
  await sharp(source)
    .resize(size, size)
    .flatten({ background: '#f2f3f4' })
    .png()
    .toFile(fileURLToPath(new URL(file, publicDirectory)));
}
console.log('Иконки Percenta для экрана «Домой» обновлены.');
