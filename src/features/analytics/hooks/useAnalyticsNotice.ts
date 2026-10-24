import { useEffect, useState } from 'react';
import { browserAnalytics, type AnalyticsController } from '../services/firebase-analytics';

export const ANALYTICS_NOTICE_KEY = 'percenta.analytics-notice.v1';
function readDismissed() {
  try {
    return localStorage.getItem(ANALYTICS_NOTICE_KEY) === 'seen';
  } catch {
    return false;
  }
}

export function useAnalyticsNotice(controller: AnalyticsController = browserAnalytics) {
  const [dismissed, setDismissed] = useState(readDismissed);
  useEffect(() => {
    // Collection is independent of notice dismissal, legacy choices and localStorage access.
    void controller.setEnabled(controller.available);
  }, [controller]);
  useEffect(() => {
    function synchronize(event: StorageEvent) {
      if (event.key === null || event.key === ANALYTICS_NOTICE_KEY) setDismissed(readDismissed());
    }
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, []);

  function dismiss() {
    try {
      // This records only dismissal of the notice, never evidence of consent.
      localStorage.setItem(ANALYTICS_NOTICE_KEY, 'seen');
    } catch {
      // The notice can still close for this visit if browser storage is unavailable.
    }
    setDismissed(true);
  }

  return { visible: controller.available && !dismissed, dismiss };
}
