import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Offer, OfferRepository } from '../../features/offers/model/offers';
import { useOffers } from './useOffers';

const offer: Offer = { id: 'a', category: 'Кафе', bank: 'Банк', percent: 5 };
function memoryRepository(initial: Offer[] = [offer]) {
  let values = initial;
  let listener = () => {};
  const dispose = vi.fn();
  const repository: OfferRepository = {
    load: () => values,
    save: vi.fn((next) => {
      values = next;
    }),
    subscribe: (onChange) => {
      listener = onChange;
      return dispose;
    },
  };
  return {
    repository,
    dispose,
    change: (next: Offer[]) => {
      values = next;
      listener();
    },
  };
}
describe('операции с предложениями через контракт хранилища', () => {
  it('работает с другим хранилищем, синхронизирует внешние изменения и снимает подписку', () => {
    const { repository, change, dispose } = memoryRepository();
    const { result, unmount } = renderHook(() => useOffers(repository, vi.fn()));
    act(() => {
      expect(result.current.save([{ ...offer, percent: 7 }], offer.id)).toBe(true);
    });
    expect(repository.load()).toEqual([{ ...offer, percent: 7 }]);
    act(() => change([{ ...offer, percent: 9 }]));
    expect(result.current.offers[0].percent).toBe(9);
    unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });
  it('оставляет прежнее состояние и не объявляет успех при отказе записи', () => {
    const { repository } = memoryRepository();
    repository.save = () => {
      throw new Error('Нет места');
    };
    const notify = vi.fn();
    const { result } = renderHook(() => useOffers(repository, notify));
    act(() => {
      expect(result.current.clear()).toBe(false);
    });
    expect(result.current.offers).toEqual([offer]);
    expect(result.current.error).toBe('Нет места');
    expect(notify).not.toHaveBeenCalled();
  });
  it('блокирует перезапись нечитаемого набора до явной очистки или успешного чтения', () => {
    const { repository } = memoryRepository();
    repository.load = () => {
      throw new Error('Повреждено');
    };
    const { result } = renderHook(() => useOffers(repository, vi.fn()));
    act(() => {
      expect(result.current.save([offer])).toBe(false);
    });
    expect(repository.save).not.toHaveBeenCalled();
    act(() => {
      expect(result.current.clear()).toBe(true);
    });
    expect(repository.save).toHaveBeenCalledWith([]);
    expect(result.current.error).toBe('');
  });
});
