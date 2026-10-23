import { validInput, type Offer, type StoredOffers, type OfferRepository } from '../model/offers';

export const STORAGE_KEY = 'cashback.offers.v1';
export function loadOffers(storage: Pick<Storage, 'getItem'> = localStorage): Offer[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  let value: StoredOffers;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Не удалось прочитать сохранённые записи. Данные не изменены.');
  }
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.offers) ||
    !value.offers.every(
      (offer) =>
        offer &&
        typeof offer.id === 'string' &&
        typeof offer.category === 'string' &&
        typeof offer.bank === 'string' &&
        validInput(offer),
    ) ||
    new Set(value.offers.map((offer) => offer.id)).size !== value.offers.length
  ) {
    throw new Error('Формат сохранённых записей не поддерживается. Данные не изменены.');
  }
  return value.offers;
}

export function saveOffers(
  offers: Offer[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, offers } satisfies StoredOffers));
  } catch {
    throw new Error(
      'Не удалось сохранить данные на устройстве. Проверьте, доступно ли хранилище браузера, и повторите.',
    );
  }
}

/** Storage access is deferred so denied localStorage is reported through the normal load flow. */
export function createLocalOfferRepository(
  getStorage: () => Pick<Storage, 'getItem' | 'setItem'> = () => window.localStorage,
  events: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): OfferRepository {
  return {
    load: () => loadOffers(getStorage()),
    save: (offers) => saveOffers(offers, getStorage()),
    subscribe(onChange) {
      const handler = (event: Event) => {
        const change = event as StorageEvent;
        if (change.key === null || change.key === STORAGE_KEY) onChange();
      };
      events.addEventListener('storage', handler);
      return () => events.removeEventListener('storage', handler);
    },
  };
}
