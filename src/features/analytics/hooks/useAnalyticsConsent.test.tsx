import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_KEY, useAnalyticsConsent } from './useAnalyticsConsent';

function setup() {
  const controller = { available: true, setEnabled: vi.fn(async () => {}) };
  const hook = renderHook(() => useAnalyticsConsent(controller));
  return { ...hook, controller };
}

describe('Analytics preferences', () => {
  it('starts without consent and remembers a refusal after reload', () => {
    const first = setup();
    expect(first.result.current.visible).toBe(true);
    expect(first.controller.setEnabled).toHaveBeenLastCalledWith(false);
    act(() => first.result.current.choose('denied'));
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('denied');
    first.unmount();
    const second = setup();
    expect(second.result.current.visible).toBe(false);
    expect(second.controller.setEnabled).toHaveBeenLastCalledWith(false);
    act(() => second.result.current.open());
    expect(second.result.current.visible).toBe(true);
  });
  it('restores consent and permits revocation', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    const { result, controller } = setup();
    expect(controller.setEnabled).toHaveBeenLastCalledWith(true);
    act(() => result.current.choose('denied'));
    expect(controller.setEnabled).toHaveBeenLastCalledWith(false);
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('denied');
  });
  it('does not start collection when saving consent fails', () => {
    const { result, controller } = setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    act(() => result.current.choose('granted'));
    expect(controller.setEnabled).not.toHaveBeenCalledWith(true);
    expect(result.current.error).toContain('Аналитика не включена');
  });
  it('stops collection even when saving revocation fails, and explains the limitation', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    const { result, controller } = setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    act(() => result.current.choose('denied'));
    expect(controller.setEnabled).toHaveBeenLastCalledWith(false);
    expect(result.current.error).toContain('Перед следующим посещением');
  });
  it('synchronizes revocation and browser clearing from another tab', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    const { result, controller } = setup();
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'denied');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY })));
    expect(controller.setEnabled).toHaveBeenLastCalledWith(false);
    expect(result.current.choice).toBe('denied');
    localStorage.clear();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
    expect(result.current.choice).toBeNull();
    expect(result.current.visible).toBe(true);
  });
  it('treats unavailable storage and invalid preferences as no consent', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'invalid');
    expect(setup().result.current.choice).toBeNull();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    const { controller } = setup();
    expect(controller.setEnabled).not.toHaveBeenCalledWith(true);
  });
});
