import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BankAppNotice } from './BankAppNotice';
import { bankAppHref } from '../services/app-links';
import { getBankApp } from '../model/bank-apps';

describe('резервный переход в банк', () => {
  it('предлагает только приложения и позволяет закрыть подсказку', () => {
    const onClose = vi.fn();
    render(<BankAppNotice app={getBankApp('Сбер')!} onClose={onClose} />);
    expect(screen.getByRole('link', { name: 'Открыть Сбербанк Онлайн' })).toHaveAttribute(
      'href',
      'sberbankonline://',
    );
    for (const link of screen.getAllByRole('link'))
      expect(link.getAttribute('href')).not.toMatch(/^https?:/);
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть подсказку открытия банка' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('позволяет открыть А-Ключ и запомнить старое приложение Альфа-Банка', () => {
    const onClose = vi.fn();
    const app = getBankApp('Альфа')!;
    render(<BankAppNotice app={app} onClose={onClose} />);
    expect(screen.getByRole('link', { name: 'Открыть А-Ключ' })).toHaveAttribute(
      'href',
      'kluch://',
    );
    document.addEventListener('click', (event) => event.preventDefault(), { once: true });
    fireEvent.click(screen.getByRole('link', { name: 'Открыть Альфа-Банк (старое приложение)' }));
    expect(bankAppHref(app, 'ios')).toBe('alfabank://');
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('не предлагает варианты iPhone на Android', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 14)');
    render(<BankAppNotice app={getBankApp('Альфа')!} onClose={vi.fn()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/Проверьте, что приложение установлено/)).toBeInTheDocument();
  });
  it('очищает подсказку при уходе в приложение и снимает обработчики после закрытия', () => {
    const onClose = vi.fn();
    const { unmount } = render(<BankAppNotice app={getBankApp('Т-Банк')!} onClose={onClose} />);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    fireEvent(window, new Event('pagehide'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
