import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ANALYTICS_NOTICE_KEY, useAnalyticsNotice } from './useAnalyticsNotice';

function setup(available = true) {
  const controller = { available, setEnabled: vi.fn(async () => {}) };
  const hook = renderHook(() => useAnalyticsNotice(controller));
  return { ...hook, controller };
}

describe('Analytics notice', () => {
  it('starts available analytics before dismissal and remembers the notice after reload', () => {
    const first = setup();
    expect(first.result.current.visible).toBe(true);
    expect(first.controller.setEnabled).toHaveBeenLastCalledWith(true);
    act(() => first.result.current.dismiss());
    expect(first.result.current.visible).toBe(false);
    expect(localStorage.getItem('percenta.analytics-consent.v1')).toBeNull();
    first.unmount();
    const second = setup();
    expect(second.result.current.visible).toBe(false);
    expect(second.controller.setEnabled).toHaveBeenLastCalledWith(true);
  });
  it('starts collection regardless of legacy refusal, dismissal or reload', () => {
    localStorage.setItem('percenta.analytics-consent.v1', 'denied');
    const first = setup();
    expect(first.controller.setEnabled).toHaveBeenLastCalledWith(true);
    act(() => first.result.current.dismiss());
    expect(first.controller.setEnabled).not.toHaveBeenCalledWith(false);
    expect(localStorage.getItem('percenta.analytics-consent.v1')).toBe('denied');
    first.unmount();
    expect(setup().controller.setEnabled).toHaveBeenLastCalledWith(true);
  });
  it('still dismisses for the current visit when writing storage fails', () => {
    const { result, controller } = setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
    expect(localStorage.getItem(ANALYTICS_NOTICE_KEY)).toBeNull();
    expect(controller.setEnabled).toHaveBeenLastCalledWith(true);
  });
  it('starts collection even if localStorage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    const { controller, result } = setup();
    expect(controller.setEnabled).toHaveBeenLastCalledWith(true);
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
  });
  it('synchronizes the notice without stopping collection on changes from other tabs', () => {
    const { result, controller } = setup();
    localStorage.setItem(ANALYTICS_NOTICE_KEY, 'seen');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: ANALYTICS_NOTICE_KEY })));
    expect(result.current.visible).toBe(false);
    localStorage.setItem('percenta.analytics-consent.v1', 'denied');
    act(() =>
      window.dispatchEvent(new StorageEvent('storage', { key: 'percenta.analytics-consent.v1' })),
    );
    expect(controller.setEnabled).toHaveBeenLastCalledWith(true);
    localStorage.clear();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
    expect(result.current.visible).toBe(true);
    expect(controller.setEnabled).not.toHaveBeenCalledWith(false);
  });
  it('does not show a notice or enable analytics when configuration is unavailable', () => {
    const { result, controller } = setup(false);
    expect(result.current.visible).toBe(false);
    expect(controller.setEnabled).not.toHaveBeenCalledWith(true);
  });
});
