import { File as NodeFile } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { isHeic, MAX_FILE_SIZE, validateImage } from './images';

const file = (name: string, data = 'not empty', type = '') =>
  new NodeFile([data], name, { type }) as unknown as File;
describe('проверка загружаемых изображений', () => {
  it.each(['image.png', 'image.JPG', 'image.webp', 'image.HEIC', 'image.heif'])(
    'принимает %s даже без MIME от телефона',
    (name) => {
      expect(() => validateImage(file(name))).not.toThrow();
    },
  );
  it('отклоняет пустые и неподдерживаемые файлы', () => {
    expect(() => validateImage(file('screen.png', ''))).toThrow('Файл пуст');
    expect(() => validateImage(file('text.txt'))).toThrow('Выберите PNG');
  });
  it('отклоняет слишком большой файл', () => {
    const value = file('screen.png');
    Object.defineProperty(value, 'size', { value: MAX_FILE_SIZE + 1 });
    expect(() => validateImage(value)).toThrow('25 МБ');
  });
  it('определяет HEIC по расширению, MIME или содержимому', async () => {
    expect(await isHeic(file('screen.HEIC'))).toBe(true);
    expect(await isHeic(file('image', 'data', 'image/heic'))).toBe(true);
    expect(await isHeic(file('screen.png', '\0\0\0\u0018ftypheic'))).toBe(true);
    expect(await isHeic(file('screen.png'))).toBe(false);
  });
});
