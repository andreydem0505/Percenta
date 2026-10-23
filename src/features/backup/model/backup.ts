import { createId } from '../../../shared/lib/id';
import {
  clean,
  normalize,
  validInput,
  type Offer,
  type StoredOffers,
} from '../../offers/model/offers';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_OFFERS = 10_000;

export function parseOffersBackup(text: string): Offer[] {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('Не удалось прочитать JSON. Выберите файл, созданный через экспорт кэшбека.');
  }
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) {
    throw new Error('Формат файла не поддерживается. Нужен экспорт кэшбека версии 1.');
  }
  if (!('offers' in value) || !Array.isArray(value.offers)) {
    throw new Error('В файле нет списка предложений offers. Данные не изменены.');
  }
  if (value.offers.length > MAX_OFFERS) {
    throw new Error('В одном файле может быть не больше 10 000 предложений.');
  }
  const ids = new Set<string>();
  return value.offers.map((entry: unknown, index: number) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !('id' in entry) ||
      typeof entry.id !== 'string' ||
      !entry.id.trim() ||
      !('category' in entry) ||
      typeof entry.category !== 'string' ||
      !('bank' in entry) ||
      typeof entry.bank !== 'string' ||
      !('percent' in entry) ||
      typeof entry.percent !== 'number'
    ) {
      throw new Error(`Предложение ${index + 1}: нужны id, категория, банк и числовой процент.`);
    }
    // Copy only the backup schema; arbitrary imported properties never enter storage.
    const offer: Offer = {
      id: entry.id,
      category: clean(entry.category),
      bank: clean(entry.bank),
      percent: entry.percent,
    };
    if (!validInput(offer)) {
      throw new Error(`Предложение ${index + 1}: проверьте названия и процент от 0 до 100.`);
    }
    if (ids.has(offer.id)) {
      throw new Error(
        `Предложение ${index + 1}: повторяется идентификатор id. Данные не изменены.`,
      );
    }
    ids.add(offer.id);
    return offer;
  });
}

export function serializeOffersBackup(offers: readonly Offer[]): string {
  return (
    JSON.stringify(
      {
        version: 1,
        offers: offers.map(({ id, category, bank, percent }) => ({ id, category, bank, percent })),
      } satisfies StoredOffers,
      null,
      2,
    ) + '\n'
  );
}

const pairKey = (offer: Offer) =>
  JSON.stringify([normalize(offer.bank), normalize(offer.category)]);

/** Merge by bank/category; an imported ID must never overwrite an unrelated offer. */
export function mergeImportedOffers(
  existing: readonly Offer[],
  incoming: readonly Offer[],
): Offer[] {
  const result = existing.map((offer) => ({ ...offer }));
  const byPair = new Map(result.map((offer, index) => [pairKey(offer), index]));
  const ids = new Set(result.map((offer) => offer.id));
  for (const offer of incoming) {
    const value = {
      id: offer.id,
      category: clean(offer.category),
      bank: clean(offer.bank),
      percent: offer.percent,
    };
    const key = pairKey(offer);
    const index = byPair.get(key);
    if (index !== undefined) {
      result[index] = { ...value, id: result[index].id };
    } else {
      let id = offer.id;
      while (ids.has(id)) id = createId();
      ids.add(id);
      byPair.set(key, result.length);
      result.push({ ...value, id });
    }
  }
  return result;
}
