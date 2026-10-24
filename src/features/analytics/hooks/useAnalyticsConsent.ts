import { useEffect, useState } from 'react';
import { browserAnalytics, type AnalyticsController } from '../services/firebase-analytics';

export const ANALYTICS_CONSENT_KEY = 'percenta.analytics-consent.v1';
export type AnalyticsChoice = 'granted' | 'denied' | null;

function readChoice(): AnalyticsChoice {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function useAnalyticsConsent(controller: AnalyticsController = browserAnalytics) {
  const [choice, setChoice] = useState(readChoice);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void controller.setEnabled(choice === 'granted');
  }, [choice, controller]);
  useEffect(() => {
    function synchronize(event: StorageEvent) {
      if (event.storageArea && event.storageArea !== localStorage) return;
      if (event.key !== null && event.key !== ANALYTICS_CONSENT_KEY) return;
      const current = readChoice();
      void controller.setEnabled(current === 'granted');
      setChoice(current);
      setError('');
      setOpened(false);
    }
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, [controller]);

  function choose(value: Exclude<AnalyticsChoice, null>) {
    // Revocation takes effect immediately, even if saving the preference fails.
    if (value === 'denied') void controller.setEnabled(false);
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
      setChoice(value);
      void controller.setEnabled(value === 'granted');
      setError('');
      setOpened(false);
    } catch {
      if (value === 'denied') setChoice(value);
      setError(
        value === 'denied'
          ? 'Сбор остановлен, но выбор не удалось сохранить. Перед следующим посещением очистите данные сайта или повторите попытку.'
          : 'Не удалось сохранить выбор. Аналитика не включена. Разрешите сохранение данных сайта и повторите попытку.',
      );
    }
  }

  return {
    available: controller.available,
    visible: controller.available && (choice === null || opened || !!error),
    choice,
    error,
    choose,
    open: () => setOpened(true),
    close: () => setOpened(false),
  };
}
