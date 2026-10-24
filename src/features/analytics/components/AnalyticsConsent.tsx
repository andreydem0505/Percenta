import type { useAnalyticsConsent } from '../hooks/useAnalyticsConsent';

export function AnalyticsConsent({ consent }: { consent: ReturnType<typeof useAnalyticsConsent> }) {
  if (!consent.visible) return null;
  return (
    <aside
      id="analytics-consent"
      className="analytics-consent"
      aria-labelledby="analytics-title"
      aria-describedby="analytics-description"
      tabIndex={-1}
    >
      <div>
        <h2 id="analytics-title">Cookie для статистики</h2>
        <p id="analytics-description">
          Cookie Google Analytics помогают улучшать Percenta. Записи кэшбека остаются у вас.{' '}
          <a href="/legal/privacy.html" target="_blank" rel="noreferrer">
            Подробнее
          </a>
        </p>
        {consent.error && (
          <p className="analytics-error" role="alert">
            {consent.error}
          </p>
        )}
      </div>
      <div className="analytics-actions">
        <button className="button secondary" onClick={() => consent.choose('denied')}>
          Не разрешать
        </button>
        <button className="button secondary" onClick={() => consent.choose('granted')}>
          Разрешить
        </button>
        {consent.choice && (
          <button className="text-button" onClick={consent.close}>
            Закрыть
          </button>
        )}
      </div>
    </aside>
  );
}
