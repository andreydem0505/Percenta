import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClearableInput } from './ClearableInput';

function Field({ onSubmit }: { onSubmit: () => void }) {
  const [value, setValue] = useState('Кафе');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="category">Категория</label>
      <ClearableInput
        id="category"
        value={value}
        onValueChange={setValue}
        clearLabel="Очистить категорию"
      />
    </form>
  );
}

describe('очистка текстового поля', () => {
  it('очищает значение, возвращает фокус и позволяет продолжить ввод без отправки формы', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Field onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Категория');
    await user.click(screen.getByRole('button', { name: 'Очистить категорию' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.type(input, 'Аптеки');
    expect(input).toHaveValue('Аптеки');
    expect(screen.getByRole('button', { name: 'Очистить категорию' })).toBeVisible();
  });
  it('доступно очищает значение с клавиатуры', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Field onSubmit={onSubmit} />);
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Очистить категорию' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Категория')).toHaveValue('');
    expect(screen.getByLabelText('Категория')).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it.each(['disabled', 'readOnly'] as const)('не предлагает очистку для %s', (property) => {
    render(
      <ClearableInput
        aria-label="Банк"
        value="Сбер"
        onValueChange={vi.fn()}
        clearLabel="Очистить банк"
        {...{ [property]: true }}
      />,
    );
    expect(screen.getByLabelText('Банк')).toHaveValue('Сбер');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
