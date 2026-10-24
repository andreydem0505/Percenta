import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { useAnalyticsConsent } from '../hooks/useAnalyticsConsent';
import { AnalyticsConsent } from './AnalyticsConsent';

it('lets a visitor refuse, reopen the settings and opt in without blocking the app', async () => {
  const controller = { available: true, setEnabled: vi.fn(async () => {}) };
  function Page() {
    const consent = useAnalyticsConsent(controller);
    return (
      <>
        <button onClick={consent.open}>Настройки cookie</button>
        <AnalyticsConsent consent={consent} />
      </>
    );
  }
  render(<Page />);
  const user = userEvent.setup();
  expect(screen.getByRole('complementary', { name: 'Cookie для статистики' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Не разрешать' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(controller.setEnabled).not.toHaveBeenCalledWith(true);
  await user.click(screen.getByRole('button', { name: 'Настройки cookie' }));
  await user.click(screen.getByRole('button', { name: 'Разрешить' }));
  expect(controller.setEnabled).toHaveBeenLastCalledWith(true);
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
