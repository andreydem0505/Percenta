import { describe, expect, it } from 'vitest';
import { sortOffers, normalize, parsePercent, upsertOffers, type Offer } from './offers';
import { loadOffers, saveOffers, STORAGE_KEY } from '../data/local-offer-repository';

const offer = (id: string, category: string, bank: string, percent: number): Offer => ({
  id,
  category,
  bank,
  percent,
});
describe('выбор и обновление предложений', () => {
  it('показывает все предложения, включая одинаковые категории разных банков', () => {
    const values = [
      offer('a', 'Кафе', 'Сбер', 3),
      offer('b', 'Кафе', 'Т-Банк', 7),
      offer('c', 'Аптеки', 'Сбер', 5),
    ];
    expect(sortOffers(values).map((o) => o.id)).toEqual(['b', 'c', 'a']);
    expect(values).toHaveLength(3);
  });
  it('нормализует названия для обновления, сохраняя все карточки при сортировке', () => {
    expect(normalize('  КАФЕ   и рестораны  ')).toBe('кафе и рестораны');
    const values = [
      offer('a', 'Кафе', 'Сбер', 3),
      offer('b', ' кафе ', 'Т-Банк', 7),
      offer('c', 'Кафе и рестораны', 'Сбер', 8),
    ];
    expect(sortOffers(values).map((o) => o.id)).toEqual(['c', 'b', 'a']);
  });
  it('при равенстве сохраняет оба банка и упорядочивает их по алфавиту', () => {
    const values = [offer('a', 'Аптеки', 'Сбер', 5), offer('b', 'Аптеки', 'Альфа-Банк', 5)];
    expect(sortOffers(values).map((o) => o.id)).toEqual(['b', 'a']);
    expect(sortOffers([...values].reverse()).map((o) => o.id)).toEqual(['b', 'a']);
    expect(values.map((o) => o.id)).toEqual(['a', 'b']);
  });
  it('удаление одного предложения не затрагивает другое предложение категории', () => {
    const values = [offer('a', 'Аптеки', 'Сбер', 5), offer('b', 'Аптеки', 'Т-Банк', 10)];
    expect(sortOffers(values.filter((o) => o.id !== 'b'))).toEqual([values[0]]);
  });
  it('оставляет все покупки наверху, затем упорядочивает по проценту', () => {
    const values = [
      offer('a', 'АЗС', 'Сбер', 50),
      offer('b', 'За все покупки', 'Сбер', 1),
      offer('c', 'На любые покупки', 'Т-Банк', 2),
      offer('d', 'АЗС', 'Альфа-Банк', 5),
    ];
    const sorted = sortOffers(values);
    expect(sorted.map((o) => o.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(sorted).toHaveLength(4);
    expect(values.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('обновляет пару банк + категория и не затрагивает другие записи', () => {
    const values = [offer('a', 'Кафе', 'Сбер', 3), offer('b', 'Аптеки', 'Сбер', 5)];
    const result = upsertOffers(values, [{ category: ' кафе ', bank: ' сбер ', percent: 7.5 }]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a', percent: 7.5 });
    expect(values[0].percent).toBe(3);
  });
  it('редактирование в существующую пару объединяет дубликат', () => {
    const values = [offer('a', 'Кафе', 'Сбер', 3), offer('b', 'Аптеки', 'Сбер', 5)];
    expect(upsertOffers(values, [{ category: 'Аптеки', bank: 'Сбер', percent: 8 }], 'a')).toEqual([
      offer('b', 'Аптеки', 'Сбер', 8),
    ]);
  });
  it('пакетный импорт обновляет совпадения и добавляет остальные', () => {
    const result = upsertOffers(
      [offer('a', 'Кафе', 'Сбер', 3)],
      [
        { category: 'Кафе', bank: 'Сбер', percent: 4 },
        { category: 'АЗС', bank: 'Сбер', percent: 10 },
      ],
    );
    expect(result).toHaveLength(2);
    expect(result[0].percent).toBe(4);
  });
  it.each([
    ['5,5', 5.5],
    ['5.25', 5.25],
    ['0', 0],
    ['100', 100],
    [' 10 ', 10],
    ['', null],
    ['-5', null],
    ['101', null],
    ['5%', null],
    ['NaN', null],
    ['2.345', null],
    ['1e2', null],
  ])('проверяет процент %s', (input, expected) => {
    expect(parsePercent(input as string)).toBe(expected);
  });
});
describe('локальное хранение', () => {
  it('восстанавливает все ранее сохранённые предложения одинаковой категории', () => {
    const values = [offer('a', 'Аптеки', 'Сбер', 3), offer('b', 'Аптеки', 'Т-Банк', 7)];
    saveOffers(values);
    expect(sortOffers(loadOffers())).toEqual([values[1], values[0]]);
  });
  it('сохраняет и восстанавливает данные без скриншотов', () => {
    const values = [offer('a', 'Кафе', 'Сбер', 5.5)];
    saveOffers(values);
    expect(loadOffers()).toEqual(values);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ version: 1, offers: values });
  });
  it('повреждённое содержимое не затирается при чтении', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    expect(() => loadOffers()).toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
  });
  it.each([
    { version: 2, offers: [] },
    { version: 1, offers: [{ id: 'a', category: 'Кафе', bank: 'Сбер', percent: -5 }] },
    { version: 1, offers: [offer('a', 'Кафе', 'Сбер', 5), offer('a', 'АЗС', 'Сбер', 10)] },
  ])('отклоняет неподдерживаемые записи', (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    expect(() => loadOffers()).toThrow();
  });
  it('сообщает о недоступном хранилище', () => {
    expect(() =>
      saveOffers([], {
        setItem: () => {
          throw new DOMException('Quota exceeded');
        },
      }),
    ).toThrow('Не удалось сохранить');
    expect(() =>
      loadOffers({
        getItem: () => {
          throw new Error('Denied');
        },
      }),
    ).toThrow();
  });
});
