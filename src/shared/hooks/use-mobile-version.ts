import { useSyncExternalStore } from 'react';

export const MOBILE_QUERY = '(max-width: 560px)';
function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(MOBILE_QUERY);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}
const snapshot = () => window.matchMedia?.(MOBILE_QUERY).matches ?? false;

export function useMobileVersion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
