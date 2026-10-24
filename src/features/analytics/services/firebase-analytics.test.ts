import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsController } from './firebase-analytics';

const config = { apiKey: 'demo', projectId: 'demo', appId: 'demo', measurementId: 'G-DEMO' };

function setup() {
  const app = { name: 'percenta-analytics' };
  const instance = { app };
  const sdk = {
    app: { getApps: vi.fn(() => []), initializeApp: vi.fn(() => app) },
    analytics: {
      isSupported: vi.fn(async () => true),
      setConsent: vi.fn(),
      initializeAnalytics: vi.fn(() => instance),
      setAnalyticsCollectionEnabled: vi.fn(),
    },
  };
  // The service contract is the official SDK; the test needs only the calls it uses.
  const load = vi.fn(async () => sdk) as unknown as NonNullable<
    Parameters<typeof createAnalyticsController>[1]
  >;
  const browser = {
    location: { origin: 'https://example.org', search: '?q=private', hash: '#private' },
  };
  const controller = createAnalyticsController(
    config,
    load,
    browser as unknown as Window & typeof globalThis,
  );
  return { sdk, load, controller, browser, instance };
}

describe('Firebase Analytics consent boundary', () => {
  it('never loads the SDK before consent, including refusal', async () => {
    const { load, controller } = setup();
    await controller.setEnabled(false);
    expect(load).not.toHaveBeenCalled();
  });
  it('does nothing when the deployment is not configured', async () => {
    const load = vi.fn();
    const controller = createAnalyticsController(null, load);
    await controller.setEnabled(true);
    expect(controller.available).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });
  it('initializes once under repeated effects and sends a fixed, clean page address', async () => {
    const { sdk, load, controller } = setup();
    await Promise.all([controller.setEnabled(true), controller.setEnabled(true)]);
    await controller.setEnabled(true);
    expect(load).toHaveBeenCalledTimes(1);
    expect(sdk.analytics.initializeAnalytics).toHaveBeenCalledTimes(1);
    expect(sdk.analytics.initializeAnalytics.mock.calls[0]).toEqual([
      expect.anything(),
      {
        config: expect.objectContaining({
          send_page_view: true,
          page_location: 'https://example.org/',
          page_referrer: '',
          page_title: 'Percenta',
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
        }),
      },
    ]);
    expect(sdk.analytics.setConsent).toHaveBeenCalledWith({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  });
  it('cancels initialization if consent is revoked while loading', async () => {
    const { sdk, controller } = setup();
    const starting = controller.setEnabled(true);
    await controller.setEnabled(false);
    await starting;
    expect(sdk.analytics.initializeAnalytics).not.toHaveBeenCalled();
  });
  it('cancels initialization if consent is revoked during support detection', async () => {
    const { sdk, controller } = setup();
    let resolveSupport!: (value: boolean) => void;
    sdk.analytics.isSupported.mockReturnValue(
      new Promise((resolve) => {
        resolveSupport = resolve;
      }),
    );
    const starting = controller.setEnabled(true);
    await vi.waitFor(() => expect(sdk.analytics.isSupported).toHaveBeenCalled());
    await controller.setEnabled(false);
    resolveSupport(true);
    await starting;
    expect(sdk.analytics.initializeAnalytics).not.toHaveBeenCalled();
  });
  it('stops future collection immediately and resumes without another initialization', async () => {
    const { sdk, controller, browser, instance } = setup();
    await controller.setEnabled(true);
    const stopping = controller.setEnabled(false);
    expect((browser as unknown as Record<string, unknown>)['ga-disable-G-DEMO']).toBe(true);
    await stopping;
    expect(sdk.analytics.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(instance, false);
    await controller.setEnabled(true);
    expect(sdk.analytics.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(instance, true);
    expect(sdk.analytics.initializeAnalytics).toHaveBeenCalledTimes(1);
  });
  it('leaves unsupported browsers usable', async () => {
    const { sdk, controller } = setup();
    sdk.analytics.isSupported.mockResolvedValue(false);
    await controller.setEnabled(true);
    expect(sdk.analytics.initializeAnalytics).not.toHaveBeenCalled();
  });
  it('contains SDK loading failures', async () => {
    const controller = createAnalyticsController(config, async () => {
      throw new Error('Blocked');
    });
    await expect(controller.setEnabled(true)).resolves.toBeUndefined();
  });
});
