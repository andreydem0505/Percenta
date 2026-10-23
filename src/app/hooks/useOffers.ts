import { useEffect, useState } from 'react';
import { mergeImportedOffers } from '../../features/backup/model/backup';
import {
  upsertOffers,
  type Offer,
  type OfferInput,
  type OfferRepository,
} from '../../features/offers/model/offers';

export function useOffers(repository: OfferRepository, notify: (message: string) => void) {
  const [initial] = useState(() => {
    try {
      return { offers: repository.load(), error: '' };
    } catch (error) {
      return {
        offers: [] as Offer[],
        error: error instanceof Error ? error.message : 'Хранилище браузера недоступно.',
      };
    }
  });
  const [offers, setOffers] = useState(initial.offers);
  const [error, setError] = useState(initial.error);
  const [blocked, setBlocked] = useState(!!initial.error);

  function reload(announce = true) {
    try {
      setOffers(repository.load());
      setError('');
      setBlocked(false);
      if (announce) notify('Данные перечитаны');
    } catch (error) {
      setBlocked(true);
      setError(
        error instanceof Error
          ? error.message
          : 'Не удалось прочитать изменения. Перезагрузите страницу перед сохранением.',
      );
    }
  }
  useEffect(() => repository.subscribe(() => reload(false)), [repository]);

  function commit(update: () => Offer[], message: string, reset = false): boolean {
    if (blocked && !reset) {
      notify('Сначала устраните ошибку хранилища или очистите сохранённые записи.');
      return false;
    }
    try {
      const next = update();
      repository.save(next);
      setOffers(next);
      setError('');
      setBlocked(false);
      notify(message);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить данные.');
      return false;
    }
  }
  return {
    offers,
    error,
    reload,
    save: (inputs: OfferInput[], id?: string) =>
      commit(
        () => upsertOffers(offers, inputs, id),
        id ? 'Запись обновлена' : inputs.length > 1 ? 'Категории сохранены' : 'Категория сохранена',
      ),
    importOffers: (incoming: Offer[]) =>
      commit(() => mergeImportedOffers(offers, incoming), 'Данные импортированы'),
    remove: (id: string) =>
      commit(() => offers.filter((offer) => offer.id !== id), 'Запись удалена'),
    clear: () => commit(() => [], 'Все записи удалены', true),
  };
}
