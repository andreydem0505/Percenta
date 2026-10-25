import { createId } from '../../../shared/lib/id';
import { isAllPurchases, isTaxiFareCategory } from './categories';

export interface Offer {
  id: string;
  category: string;
  bank: string;
  percent: number;
}

export type OfferInput = Omit<Offer, 'id'>;
export const normalize = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru');
export const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
export const formatPercent = (value: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);

export function matchesOfferSearch(
  offer: Pick<Offer, 'category' | 'bank'>,
  search: string,
): boolean {
  const query = normalize(search);
  return (
    normalize(`${offer.category} ${offer.bank}`).includes(query) ||
    ((query === 'такси' || query === 'taxi') && isTaxiFareCategory(offer.category))
  );
}

export function parsePercent(value: string): number | null {
  if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

export function validInput(input: OfferInput): boolean {
  return (
    !!clean(input.category) &&
    !!clean(input.bank) &&
    input.category.length <= 120 &&
    input.bank.length <= 80 &&
    Number.isFinite(input.percent) &&
    input.percent >= 0 &&
    input.percent <= 100
  );
}

export function upsertOffers(existing: Offer[], inputs: OfferInput[], editingId?: string): Offer[] {
  const result = existing.filter((offer) => offer.id !== editingId);
  for (const input of inputs) {
    if (!validInput(input)) throw new Error('Укажите категорию, банк и процент от 0 до 100.');
    const value = { ...input, category: clean(input.category), bank: clean(input.bank) };
    const index = result.findIndex(
      (offer) =>
        normalize(offer.category) === normalize(value.category) &&
        normalize(offer.bank) === normalize(value.bank),
    );
    if (index >= 0) result[index] = { ...value, id: result[index].id };
    else result.push({ ...value, id: editingId || createId() });
  }
  return result;
}

/** Every offer remains visible; broad purchase offers stay first, then highest cashback. */
export function sortOffers(offers: Offer[]): Offer[] {
  return [...offers].sort(
    (a, b) =>
      Number(isAllPurchases(b.category)) - Number(isAllPurchases(a.category)) ||
      b.percent - a.percent ||
      a.category.localeCompare(b.category, 'ru') ||
      a.bank.localeCompare(b.bank, 'ru') ||
      a.id.localeCompare(b.id),
  );
}

export interface StoredOffers {
  version: 1;
  offers: Offer[];
}

export interface OfferRepository {
  load(): Offer[];
  /** Writes are atomic: throwing must leave the previous snapshot intact. */
  save(offers: Offer[]): void;
  subscribe(onChange: () => void): () => void;
}
