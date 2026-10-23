import sharp from 'sharp';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../tests/fixtures',
);
await mkdir(directory, { recursive: true });
const text = (x, y, content, size = 36, color = '#152c20') =>
  `<text x="${x}" y="${y}" font-family="Arial" font-size="${size}" fill="${color}">${content}</text>`;
const svg = (body, background = '#ffffff') =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect width="900" height="700" fill="${background}"/>${body}</svg>`,
  );
const list = [
  text(65, 85, 'Мои категории', 44),
  text(65, 215, 'Супермаркеты'),
  text(710, 215, '5%'),
  text(65, 335, 'Кафе и рестораны'),
  text(710, 335, '7,5%'),
  text(65, 455, 'Аптеки'),
  text(710, 455, '10%'),
].join('');
await sharp(svg(list)).png().toFile(path.join(directory, 'list.png'));
await sharp(svg(list)).jpeg({ quality: 92 }).toFile(path.join(directory, 'list.jpg'));
await sharp(svg(list)).webp({ quality: 92 }).toFile(path.join(directory, 'list.webp'));
const grid = [
  text(65, 85, 'Мои категории', 44),
  text(100, 230, '5%', 52),
  text(95, 290, 'Аптеки', 32),
  text(480, 230, '10%', 52),
  text(450, 290, 'Супермаркеты', 32),
  text(100, 470, '7,5%', 52),
  text(95, 530, 'Кафе', 32),
  text(480, 470, '3%', 52),
  text(475, 530, 'АЗС', 32),
].join('');
await sharp(svg(grid)).png().toFile(path.join(directory, 'grid.png'));
await sharp(svg(list.replaceAll('#152c20', '#ffffff'), '#181c20'))
  .png()
  .toFile(path.join(directory, 'dark.png'));
await sharp(svg('')).png().toFile(path.join(directory, 'empty.png'));
// Synthetic regression for tall dark lists with illustrations and coloured rates.
// The user's original screenshot is deliberately not included in the repository.
const illustrated = [
  text(70, 190, 'Предложения в октябре', 70, '#eeeeee'),
  text(70, 320, 'Кешбэк по категориям', 56, '#eeeeee'),
  text(70, 680, 'Кешбэк при оплате онлайн', 56, '#eeeeee'),
  text(70, 750, 'и на кассе', 56, '#eeeeee'),
  text(70, 1780, 'Кешбэк в Яндекс Такси', 56, '#eeeeee'),
  ...[
    [470, 'Яндекс Лавка', '3'],
    [950, 'Аптеки', '5'],
    [1210, 'Электроника', '5'],
    [1470, 'Все покупки на кассе', '3'],
    [1950, 'Комфорт', '5'],
    [2190, 'Комфорт+', '5'],
    [2430, 'Ultima', '5'],
  ].map(
    ([y, category, percent], index) => `
    <circle cx="120" cy="${y - 15}" r="60" fill="${['#00aaff', '#9589e6', '#f58749'][index % 3]}"/>
    ${text(91, y + 12, index % 2 ? '+' : '●', 82, '#ffffff')}
    ${text(220, y, category, 44, '#d6d6d6')}
    <circle cx="1000" cy="${y - 15}" r="26" fill="#df3e98"/>
    ${text(980, y + 4, '+', 48, '#ffffff')}
    ${text(1040, y, `${percent}%`, 44, '#7040ff')}
  `,
  ),
].join('');
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="2600"><rect width="1200" height="2600" fill="#101010"/>${illustrated}</svg>`,
  ),
)
  .png()
  .toFile(path.join(directory, 'illustrated-dark.png'));
await writeFile(path.join(directory, 'broken.heic'), 'This is not a HEIC file.');
if (process.platform === 'darwin') {
  let exists = true;
  try {
    await access(path.join(directory, 'list.heic'));
  } catch {
    exists = false;
  }
  if (!exists)
    execFileSync(
      '/usr/bin/sips',
      [
        '-s',
        'format',
        'heic',
        path.join(directory, 'list.png'),
        '--out',
        path.join(directory, 'list.heic'),
      ],
      { stdio: 'pipe' },
    );
}
console.log('Подготовлены синтетические изображения для проверки OCR и загрузки.');
