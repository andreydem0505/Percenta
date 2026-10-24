import type { useAnalyticsNotice } from '../hooks/useAnalyticsNotice';

export function AnalyticsNotice({ notice }: { notice: ReturnType<typeof useAnalyticsNotice> }) {
  if (!notice.visible) return null;
  return (
    <aside
      className="analytics-notice"
      aria-labelledby="analytics-title"
      aria-describedby="analytics-description"
    >
      <h2 id="analytics-title">Cookie для статистики</h2>
      <p id="analytics-description">
        Используя сайт, вы соглашаетесь с использованием cookie Google Analytics.{' '}
        <a href="/legal/privacy.html" target="_blank" rel="noreferrer">
          Подробнее
        </a>
      </p>
      <div className="analytics-actions">
        <button type="button" className="button secondary" onClick={notice.dismiss}>
          Понятно
        </button>
      </div>
    </aside>
  );
}
