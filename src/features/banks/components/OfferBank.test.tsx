import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfferBank } from './OfferBank';

describe('кнопка банковского приложения', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 'sberbankonline://'],
    ['Mozilla/5.0 (Linux; Android 14)', 'intent://#Intent;scheme=bank100000000111;'],
  ])('оставляет мобильный адрес без переписывания для %s', (agent, prefix) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent);
    render(<OfferBank bank="Сбер" mobile onLaunch={vi.fn()} />);
    expect(screen.getByRole('link').getAttribute('href')?.startsWith(prefix)).toBe(true);
  });
  it.each([
    ['Альфа-Банк', 'kluch://'],
    ['Тинькофф', 'tinkoffbank://Main'],
    ['ОТП Банк', 'otp://ru.otpbank.mobile/toMain'],
    ['ВТБ', 'sirius://siriusapp.com/i/welcomes'],
    ['Ozon Банк', 'https://bank-ozon.onelink.me/JbZg/'],
  ])('направляет iPhone в приложение %s без промежуточного сайта', (bank, href) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)');
    render(<OfferBank bank={bank} mobile onLaunch={vi.fn()} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', href);
    expect(screen.getByRole('link')).not.toHaveAttribute('target');
  });
  it('на iPhone открывает веб-банк Совкомбанка отдельно и не показывает подсказку об установке', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)');
    const onLaunch = vi.fn();
    const { rerender } = render(<OfferBank bank="Халва" mobile onLaunch={onLaunch} />);
    const link = screen.getByRole('link', { name: 'Открыть веб-банк Совкомбанк' });
    expect(link).toHaveAttribute('href', 'https://halvacard.ru/lk');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
    document.addEventListener('click', (event) => event.preventDefault(), { once: true });
    fireEvent.click(link);
    expect(onLaunch).not.toHaveBeenCalled();
    rerender(<OfferBank bank="Халва" mobile={false} onLaunch={onLaunch} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('не заменяет ссылку сайтом при неизвестном мобильном user-agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Unknown browser');
    render(<OfferBank bank="Альфа" mobile onLaunch={vi.fn()} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'kluch://');
  });
  it.each(['ВТБ', 'Ozon Банк'])(
    'возвращает кнопку %s на iPhone и скрывает её на компьютере',
    (bank) => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)');
      const { rerender } = render(<OfferBank bank={bank} mobile onLaunch={vi.fn()} />);
      expect(screen.getByText(bank)).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
      rerender(<OfferBank bank={bank} mobile={false} onLaunch={vi.fn()} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    },
  );
  it('появляется только в мобильной версии для поддержанного банка', () => {
    const { rerender } = render(<OfferBank bank="Тинькофф" mobile={false} onLaunch={vi.fn()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Тинькофф')).toBeInTheDocument();
    rerender(<OfferBank bank="Тинькофф" mobile onLaunch={vi.fn()} />);
    expect(
      screen.getByRole('link', { name: 'Открыть приложение банка Т-Банк' }),
    ).toBeInTheDocument();
    rerender(<OfferBank bank="Мой банк" mobile onLaunch={vi.fn()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('оставляет реальную ссылку для жеста пользователя и предлагает резерв после нажатия', () => {
    const onLaunch = vi.fn();
    render(<OfferBank bank="Сбер" mobile onLaunch={onLaunch} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href');
    expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
    // Prevent jsdom navigation only in the test, after the actual click handler runs.
    document.addEventListener('click', (event) => event.preventDefault(), { once: true });
    fireEvent.click(link);
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ name: 'Сбербанк' }));
  });
});
