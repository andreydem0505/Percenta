import { describe, expect, it } from 'vitest';
import { BANKS, bankSuggestions, findBank } from './banks';

describe('банковский справочник', () => {
  it.each([
    ['Тинькофф', 'Т-Банк'],
    ['Tinkoff', 'Т-Банк'],
    ['т банк', 'Т-Банк'],
    ['Сбер', 'Сбербанк'],
    ['ПАО Сбербанк', 'Сбербанк'],
    ['СБЕРБАНК', 'Сбербанк'],
    ['Alfa Bank', 'Альфа-Банк'],
    ['ООО «Озон Банк»', 'Ozon Банк'],
    ['ВТБ 24', 'ВТБ'],
    ['РСХБ', 'Россельхозбанк'],
    ['Яндекс Пэй', 'Яндекс Банк'],
    ['Вайлдберриз', 'WB Банк'],
    ['Ренессанс Кредит', 'Ренессанс Банк'],
  ])('подбирает логотип по имени %s', (alias, expected) => {
    expect(findBank(alias)?.name).toBe(expected);
    expect(findBank(alias)?.logo).toMatch(/^banks\/[a-f0-9]+\.webp$/);
  });
  it('не принимает часть неизвестного названия за известный банк', () => {
    expect(findBank('Сбер будущего')).toBeUndefined();
    expect(findBank('Мой Альфа')).toBeUndefined();
    expect(findBank('Банк')).toBeUndefined();
    expect(findBank('')).toBeUndefined();
  });
  it('различает банки с одинаковой аббревиатурой', () => {
    expect(findBank('ООО «АТБ» Банк')?.registrationNumber).toBe('2776');
    expect(findBank('Азиатско-Тихоокеанский Банк')?.registrationNumber).toBe('1810');
    expect(findBank('ООО «АТБ» Банк')?.id).not.toBe(findBank('Азиатско-Тихоокеанский Банк')?.id);
  });
  it('включает все действующие банки и сохраняет собственные названия без дублей', () => {
    expect(BANKS.filter((bank) => bank.current)).toHaveLength(300);
    expect(
      new Set(BANKS.filter((bank) => bank.current).map((bank) => bank.registrationNumber)).size,
    ).toBe(300);
    const names = bankSuggestions(['Сбер', 'сбер', 'Мой банк', 'Мой банк', '  ']);
    expect(names).toContain('Мой банк');
    expect(names.filter((name) => findBank(name)?.name === 'Сбербанк')).toHaveLength(1);
    expect(new Set(names).size).toBe(names.length);
  });
});
