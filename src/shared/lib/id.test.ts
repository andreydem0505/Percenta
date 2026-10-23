import { describe, expect, it, vi } from 'vitest';
import { createId } from './id';

describe('идентификаторы на мобильном устройстве', () => {
  it('работает без randomUUID на HTTP-адресе локальной сети', () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    try {
      const id = createId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(createId()).not.toBe(id);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
