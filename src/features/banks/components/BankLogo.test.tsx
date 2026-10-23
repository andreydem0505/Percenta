import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BankLogo } from './BankLogo';
import { findBank } from '../model/banks';

describe('логотип банка', () => {
  it('использует локальное изображение и безопасно обрабатывает ошибку загрузки', () => {
    const { container, rerender } = render(<BankLogo bank="Сбер" />);
    const image = container.querySelector('img')!;
    expect(image.getAttribute('src')).toBe(`/${findBank('Сбер')!.logo}`);
    expect(image).toHaveAttribute('alt', '');
    fireEvent.error(image);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<BankLogo bank="Тинькофф" />);
    expect(container.querySelector('img')).not.toBeNull();
  });
  it('показывает нейтральный значок для своего названия', () => {
    const { container } = render(<BankLogo bank="Мой новый банк" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
