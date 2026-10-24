import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BankInput } from './BankInput';

const banks = ['Сбер', 'ВТБ', 'Т-Банк'];

function Field({ initial = 'Сбер' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <BankInput label="Банк" banks={banks} value={value} onChange={setValue} />;
}

describe('выбор банка', () => {
  it('показывает полный список и позволяет заменить уже введённый банк', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const picker = screen.getByRole('combobox', { name: 'Выбрать банк' });
    expect(
      within(picker)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Выберите банк', ...banks]);
    await user.selectOptions(picker, 'ВТБ');
    expect(screen.getByRole('combobox', { name: 'Банк' })).toHaveValue('ВТБ');
    expect(picker).toHaveValue('ВТБ');
  });
  it('не заменяет собственное название банка до выбора из списка', async () => {
    const user = userEvent.setup();
    render(<Field initial="Мой банк" />);
    const input = screen.getByRole('combobox', { name: 'Банк' });
    const picker = screen.getByRole('combobox', { name: 'Выбрать банк' });
    await user.click(picker);
    expect(input).toHaveValue('Мой банк');
    await user.selectOptions(picker, 'Т-Банк');
    expect(input).toHaveValue('Т-Банк');
  });
  it('оставляет список доступным после очистки и сохраняет ручной ввод', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByRole('combobox', { name: 'Банк' });
    await user.click(screen.getByRole('button', { name: 'Очистить банк' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Очистить банк' })).not.toBeInTheDocument();
    const picker = screen.getByRole('combobox', { name: 'Выбрать банк' });
    expect(picker).toBeEnabled();
    await user.selectOptions(picker, 'Сбер');
    expect(input).toHaveValue('Сбер');
    await user.clear(input);
    await user.type(input, 'Другой банк');
    expect(input).toHaveValue('Другой банк');
    expect(within(picker).getByRole('option', { name: 'ВТБ' })).toBeInTheDocument();
  });
  it('блокирует оба способа ввода во время обработки', () => {
    render(<BankInput label="Банк" banks={banks} value="Сбер" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('combobox', { name: 'Банк' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Выбрать банк' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Очистить банк' })).not.toBeInTheDocument();
  });
});
