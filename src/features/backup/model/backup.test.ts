import { downloadOffersBackup } from '../services/files';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeImportedOffers, parseOffersBackup, serializeOffersBackup } from './backup';
import { type Offer } from '../../offers/model/offers';
import { loadOffers, saveOffers } from '../../offers/data/local-offer-repository';

const offers: Offer[] = [
  { id: 'one', category: 'Все покупки', bank: 'Сбер', percent: 1.5 },
  { id: 'two', category: 'Кафе', bank: 'Сбер', percent: 5 },
  { id: 'three', category: 'Кафе', bank: 'Т-Банк', percent: 10 },
];

describe('резервная копия кэшбека', () => {
  afterEach(() => vi.useRealTimers());

  it('переносит все предложения, включая меньший процент, дроби и идентификаторы', () => {
    const json = serializeOffersBackup(offers);
    expect(JSON.parse(json)).toEqual({ version: 1, offers });
    const restored = mergeImportedOffers([], parseOffersBackup(json));
    saveOffers(restored);
    expect(loadOffers()).toEqual(offers);
    expect(parseOffersBackup('\uFEFF' + json)).toEqual(offers);
  });
  it.each(['', '{', 'null', '[]', '{"version":2,"offers":[]}', '{"version":1}'])(
    'отклоняет повреждённый или неподдерживаемый файл %s',
    (text) => {
      expect(() => parseOffersBackup(text)).toThrow();
    },
  );
  it.each([
    { ...offers[0], id: '' },
    { ...offers[0], category: ' ' },
    { ...offers[0], bank: ' ' },
    { ...offers[0], percent: '5' },
    { ...offers[0], percent: 101 },
    { ...offers[0], percent: -1 },
    { ...offers[0], percent: null },
    { ...offers[0], category: 'x'.repeat(121) },
    { ...offers[0], bank: 'x'.repeat(81) },
  ])('отклоняет весь файл при невалидной записи', (invalid) => {
    expect(() =>
      parseOffersBackup(JSON.stringify({ version: 1, offers: [offers[1], invalid] })),
    ).toThrow('Предложение 2');
  });
  it('проверяет повторяющиеся ID, размер списка, бесконечность и граничные проценты', () => {
    expect(() => parseOffersBackup(serializeOffersBackup([offers[0], offers[0]]))).toThrow(
      'идентификатор',
    );
    expect(() =>
      parseOffersBackup(JSON.stringify({ version: 1, offers: Array(10001).fill(offers[0]) })),
    ).toThrow('10 000');
    expect(() =>
      parseOffersBackup(
        '{"version":1,"offers":[{"id":"a","category":"Кафе","bank":"Банк","percent":1e309}]}',
      ),
    ).toThrow('от 0 до 100');
    expect(
      parseOffersBackup(
        serializeOffersBackup([
          { ...offers[0], percent: 0 },
          { ...offers[1], percent: 100 },
        ]),
      ),
    ).toHaveLength(2);
  });
  it('копирует только поля формата и убирает лишние пробелы', () => {
    expect(
      parseOffersBackup(
        JSON.stringify({
          version: 1,
          offers: [
            { ...offers[0], category: ' Все   покупки ', image: 'private', arbitrary: 'ignored' },
          ],
        }),
      ),
    ).toEqual([offers[0]]);
    expect(
      JSON.parse(serializeOffersBackup([{ ...offers[0], extra: 'ignored' } as Offer])).offers[0],
    ).toEqual(offers[0]);
  });
  it('объединяет по банку и категории, сохраняя чужие предложения и существующий ID', () => {
    const incoming = [
      { id: 'foreign', category: ' кафе ', bank: ' СБЕР ', percent: 3 },
      { id: 'new', category: 'Аптеки', bank: 'Сбер', percent: 7 },
    ];
    const merged = mergeImportedOffers(offers, parseOffersBackup(serializeOffersBackup(incoming)));
    expect(merged).toContainEqual({ id: 'two', category: 'кафе', bank: 'СБЕР', percent: 3 });
    expect(merged).toContainEqual(offers[0]);
    expect(merged).toContainEqual(offers[2]);
    expect(merged).toContainEqual(incoming[1]);
    expect(offers[1].percent).toBe(5);
    expect(mergeImportedOffers(merged, incoming)).toEqual(merged);
  });
  it('разрешает коллизию ID разных предложений и повтор пары внутри файла', () => {
    const incoming = [
      { id: 'one', category: 'Аптеки', bank: 'Сбер', percent: 7 },
      { id: 'last', category: 'АПТЕКИ', bank: 'сбер', percent: 8 },
    ];
    const merged = mergeImportedOffers(offers, incoming);
    expect(merged).toHaveLength(4);
    expect(merged[0]).toEqual(offers[0]);
    expect(merged[3]).toMatchObject({ category: 'АПТЕКИ', bank: 'сбер', percent: 8 });
    expect(new Set(merged.map((offer) => offer.id)).size).toBe(4);
    expect(mergeImportedOffers(offers, [])).toEqual(offers);
  });
  it('создаёт локальный JSON для скачивания и освобождает Blob URL', async () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toMatch(/^aubenia-\d{4}-\d{2}-\d{2}\.json$/);
      expect(this.href).toBe('blob:backup');
      expect(document.body.contains(this)).toBe(true);
    });
    downloadOffersBackup(offers);
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json;charset=utf-8');
    expect(blob.size).toBeGreaterThan(0);
    vi.runOnlyPendingTimers();
    expect(revoke).toHaveBeenCalledWith('blob:backup');
  });
});
