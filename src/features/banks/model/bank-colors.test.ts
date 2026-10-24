import { describe, expect, it } from 'vitest';
import hues from '../data/bank-colors.json';
import { bankColors } from './bank-colors';
import { BANKS } from './banks';

function luminance(color: string) {
  let rgb: number[];
  if (color.startsWith('#')) {
    rgb = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255);
  } else {
    const [h, s, l] = color.match(/[\d.]+/g)!.map(Number);
    const lightness = l / 100;
    const a = (s / 100) * Math.min(lightness, 1 - lightness);
    rgb = [0, 8, 4].map((n) => {
      const k = (n + h / 30) % 12;
      return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    });
  }
  const linear = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

describe('цвета названий банков', () => {
  it('сохраняет узнаваемые оттенки логотипов', () => {
    const hue = (name: string) => Number(bankColors(name).foreground.match(/\d+/)![0]);
    expect(hue('Сбер')).toBeGreaterThanOrEqual(90);
    expect(hue('Сбер')).toBeLessThanOrEqual(155);
    expect(hue('Т-Банк')).toBeGreaterThanOrEqual(40);
    expect(hue('Т-Банк')).toBeLessThanOrEqual(70);
    expect(hue('Альфа-Банк') < 20 || hue('Альфа-Банк') > 345).toBe(true);
    expect(hue('ВТБ')).toBeGreaterThanOrEqual(180);
    expect(hue('ВТБ')).toBeLessThanOrEqual(240);
  });
  it('использует один цвет для разных названий того же банка', () => {
    expect(bankColors('Тинькофф')).toEqual(bankColors('Т-Банк'));
    expect(bankColors('ПАО Сбербанк')).toEqual(bankColors('сбер'));
    expect(bankColors('Сбер')).not.toEqual(bankColors('ВТБ'));
  });
  it('оставляет неизвестные и неоднозначные названия нейтральными', () => {
    expect(bankColors('Мой банк')).toEqual(bankColors(''));
    expect(bankColors('Сбер будущего')).toEqual(bankColors(''));
  });
  it('покрывает все сохранённые изображения и обеспечивает контраст текста не ниже 4,5:1', () => {
    expect(Object.keys(hues).sort()).toEqual(
      BANKS.filter((bank) => bank.logo)
        .map((bank) => bank.id)
        .sort(),
    );
    for (const hue of Object.values(hues)) {
      expect(hue === null || (Number.isInteger(hue) && hue >= 0 && hue < 360)).toBe(true);
    }
    for (const name of [...BANKS.map((bank) => bank.name), 'Мой банк']) {
      const colors = bankColors(name);
      const contrast =
        (luminance(colors.background) + 0.05) / (luminance(colors.foreground) + 0.05);
      expect(contrast, name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
