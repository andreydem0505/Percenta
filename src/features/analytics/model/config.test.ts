import { describe, expect, it } from 'vitest';
import { analyticsConfig } from './config';

const env = {
  PROD: true,
  VITE_ANALYTICS_ENABLED: 'true',
  VITE_FIREBASE_API_KEY: 'public-key',
  VITE_FIREBASE_PROJECT_ID: 'demo-project',
  VITE_FIREBASE_APP_ID: 'demo-app',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-DEMO123',
};
const location = { hostname: 'example.org', protocol: 'https:' };

describe('Analytics configuration', () => {
  it('requires a production opt-in and complete public configuration', () => {
    expect(analyticsConfig(env, location)?.measurementId).toBe('G-DEMO123');
    for (const changes of [
      { PROD: false },
      { VITE_ANALYTICS_ENABLED: 'false' },
      { VITE_FIREBASE_API_KEY: '' },
      { VITE_FIREBASE_APP_ID: undefined },
      { VITE_FIREBASE_MEASUREMENT_ID: 'not-a-stream' },
    ])
      expect(analyticsConfig({ ...env, ...changes }, location)).toBeNull();
  });
  it.each(['localhost', '127.0.0.1', '[::1]', 'demo.localhost'])(
    'does not collect on %s',
    (hostname) => {
      expect(analyticsConfig(env, { ...location, hostname })).toBeNull();
    },
  );
  it('does not collect on HTTP, including local network previews', () => {
    expect(analyticsConfig(env, { ...location, protocol: 'http:' })).toBeNull();
  });
});
