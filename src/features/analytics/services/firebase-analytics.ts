import { analyticsConfig, type AnalyticsConfig } from '../model/config';

const loadSdk = async () => ({
  app: await import('@firebase/app'),
  analytics: await import('@firebase/analytics'),
});

export interface AnalyticsController {
  available: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
}

/** Loads the SDK only when enabled by the application; contains no offer data. */
export function createAnalyticsController(
  config: AnalyticsConfig | null,
  load = loadSdk,
  browser = window,
): AnalyticsController {
  let allowed = false;
  let pending: Promise<void> | undefined;
  let active:
    | {
        sdk: Awaited<ReturnType<typeof loadSdk>>['analytics'];
        instance: import('@firebase/analytics').Analytics;
      }
    | undefined;

  async function initialize() {
    const sdk = await load();
    if (!allowed || !(await sdk.analytics.isSupported()) || !allowed || !config) return;
    sdk.analytics.setConsent({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    const name = 'percenta-analytics';
    const app =
      sdk.app.getApps().find((candidate) => candidate.name === name) ??
      sdk.app.initializeApp(config, name);
    const instance = sdk.analytics.initializeAnalytics(app, {
      // Enhanced measurement MUST also be disabled in the GA web stream settings.
      config: {
        send_page_view: true,
        page_location: `${browser.location.origin}/`,
        page_title: 'Percenta',
        page_referrer: '',
        ignore_referrer: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=Lax;Secure',
        cookie_expires: 60 * 60 * 24 * 90,
        cookie_update: false,
      },
    });
    active = { sdk: sdk.analytics, instance };
  }

  return {
    available: config !== null,
    async setEnabled(enabled) {
      allowed = enabled;
      if (!config) return;
      // Synchronous opt-out also covers revocation during asynchronous SDK initialization.
      (browser as unknown as Record<string, unknown>)[`ga-disable-${config.measurementId}`] =
        !enabled;
      if (active) {
        active.sdk.setAnalyticsCollectionEnabled(active.instance, enabled);
        return;
      }
      if (!enabled) return;
      // Shared promise prevents duplicate page views in React StrictMode.
      pending ??= initialize()
        .catch(() => {
          // Analytics failures and blockers must never prevent using the app.
        })
        .finally(() => {
          pending = undefined;
        });
      await pending;
    },
  };
}

export const browserAnalytics = createAnalyticsController(
  analyticsConfig(import.meta.env, window.location),
);
