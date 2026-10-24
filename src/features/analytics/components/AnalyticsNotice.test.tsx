import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { useAnalyticsNotice } from '../hooks/useAnalyticsNotice';
import { AnalyticsNotice } from './AnalyticsNotice';

it('shows a nonblocking notice with one dismissal button and a privacy link', async () => {
  const controller = { available: true, setEnabled: vi.fn(async () => {}) };
  function Page() {
    const notice = useAnalyticsNotice(controller);
    return <AnalyticsNotice notice={notice} />;
  }
  render(<Page />);
  const user = userEvent.setup();
  const notice = screen.getByRole('complementary', { name: 'Cookie для статистики' });
  expect(notice).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(within(notice).getAllByRole('button')).toHaveLength(1);
  expect(within(notice).getByRole('link', { name: 'Подробнее' })).toHaveAttribute(
    'href',
    '/legal/privacy.html',
  );
  expect(controller.setEnabled).toHaveBeenLastCalledWith(true);
  await user.click(within(notice).getByRole('button', { name: 'Понятно' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
