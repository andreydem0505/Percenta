import type { FirebaseOptions } from '@firebase/app';

export type AnalyticsConfig = FirebaseOptions & { measurementId: string };

export function analyticsConfig(
  env: Record<string, unknown>,
  location: Pick<Location, 'hostname' | 'protocol'>,
): AnalyticsConfig | null {
  if (
    !env.PROD ||
    env.VITE_ANALYTICS_ENABLED !== 'true' ||
    location.protocol !== 'https:' ||
    /^(localhost|127\..*|\[?::1\]?)$|\.localhost$/i.test(location.hostname)
  )
    return null;
  const fields = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  if (Object.values(fields).some((value) => typeof value !== 'string' || !value.trim()))
    return null;
  if (!/^G-[A-Z0-9]+$/.test(String(fields.measurementId))) return null;
  return fields as AnalyticsConfig;
}
