import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker, OEM, PSM } from 'tesseract.js';
import { ocrImage } from './image.mjs';
import { parseOcr } from '../../src/features/recognition/model/parse-ocr.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const worker = await createWorker(['rus', 'eng'], OEM.LSTM_ONLY, {
  langPath: path.join(root, 'public/ocr'),
  cacheMethod: 'none',
});
await worker.setParameters({
  tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  preserve_interword_spaces: '1',
});
const expectedList = [
  { category: 'Супермаркеты', percent: '5' },
  { category: 'Кафе и рестораны', percent: '7.5' },
  { category: 'Аптеки', percent: '10' },
];
try {
  for (const filename of [
    'list.png',
    'list.jpg',
    'list.webp',
    'grid.png',
    'dark.png',
    'empty.png',
    'illustrated-dark.png',
  ]) {
    const { bytes, dark } = await ocrImage(path.join(root, 'tests/fixtures', filename));
    await worker.setParameters({ tessedit_pageseg_mode: dark ? PSM.AUTO : PSM.SPARSE_TEXT });
    const result = await worker.recognize(bytes, {}, { blocks: true });
    const values = parseOcr(
      (result.data.blocks ?? []).flatMap((block) =>
        block.paragraphs.flatMap((paragraph) => paragraph.lines),
      ),
    ).map(({ category, percent }) => ({ category, percent }));
    const expected =
      filename === 'empty.png'
        ? []
        : filename === 'illustrated-dark.png'
          ? [
              { category: 'Яндекс Лавка', percent: '3' },
              { category: 'Аптеки', percent: '5' },
              { category: 'Электроника', percent: '5' },
              { category: 'Все покупки на кассе', percent: '3' },
              { category: 'Комфорт', percent: '5' },
              { category: 'Комфорт+', percent: '5' },
              { category: 'Ultima', percent: '5' },
            ]
          : filename === 'grid.png'
            ? [
                { category: 'Аптеки', percent: '5' },
                { category: 'Супермаркеты', percent: '10' },
                { category: 'Кафе', percent: '7.5' },
                { category: 'АЗС', percent: '3' },
              ]
            : expectedList;
    const sorted = (rows) => rows.toSorted((a, b) => a.category.localeCompare(b.category, 'ru'));
    assert.deepEqual(sorted(values), sorted(expected), filename);
    console.log(`${filename}: ${values.length} категорий, результат верный`);
  }
} finally {
  await worker.terminate();
}
