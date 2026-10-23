import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MOBILE_QUERY, useMobileVersion } from './use-mobile-version';

afterEach(() => vi.unstubAllGlobals());
it('переключает мобильную кнопку при изменении размера экрана', () => {
  let mobile = false;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query) => {
      expect(query).toBe(MOBILE_QUERY);
      return {
        matches: mobile,
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      };
    }),
  );
  const { result, unmount } = renderHook(useMobileVersion);
  expect(result.current).toBe(false);
  act(() => {
    mobile = true;
    listeners.forEach((listener) => listener());
  });
  expect(result.current).toBe(true);
  act(() => {
    mobile = false;
    listeners.forEach((listener) => listener());
  });
  expect(result.current).toBe(false);
  unmount();
  expect(listeners.size).toBe(0);
});
