import { describe, expect, it } from 'vitest';
import { prepareOcrPixels } from './ocr-pixels';

describe('подготовка цветного текста на тёмном фоне', () => {
  it('делает фиолетовый процент тёмным и сохраняет читаемость серого текста', () => {
    const pixels = new Uint8ClampedArray(100 * 4);
    for (let i = 0; i < pixels.length; i += 4) pixels.set([16, 16, 16, 255], i);
    pixels.set([110, 64, 255, 255], 4);
    pixels.set([214, 214, 214, 255], 8);
    prepareOcrPixels(pixels);
    expect([...pixels.slice(0, 4)]).toEqual([255, 255, 255, 255]);
    expect([...pixels.slice(4, 8)]).toEqual([0, 0, 0, 255]);
    expect(pixels[8]).toBeLessThan(70);
    expect(pixels[8]).toBe(pixels[9]);
    expect(pixels[9]).toBe(pixels[10]);
  });
  it('сохраняет светлый скриншот и альфа-канал', () => {
    const pixels = new Uint8Array([255, 255, 255, 255, 32, 64, 100, 123]);
    const original = pixels.slice();
    prepareOcrPixels(pixels);
    expect(pixels).toEqual(original);
    expect(() => prepareOcrPixels(new Uint8Array())).not.toThrow();
  });
});
