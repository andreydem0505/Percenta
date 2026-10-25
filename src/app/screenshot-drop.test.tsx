import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { loadOffers } from '../features/offers/data/local-offer-repository';
import { MAX_FILE_SIZE } from '../features/recognition/services/images';

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), verify: vi.fn(), recognize: vi.fn() }));
vi.mock('../features/recognition/services/ocr', () => ({ recognizeCategories: mocks.recognize }));
vi.mock('../features/recognition/services/images', async (importOriginal) => {
  const original = await importOriginal<typeof import('../features/recognition/services/images')>();
  return {
    ...original,
    prepareImage: (file: File, ...args: unknown[]) => {
      original.validateImage(file);
      return mocks.prepare(file, ...args);
    },
    loadImage: mocks.verify,
  };
});
beforeEach(() => {
  mocks.prepare.mockReset().mockImplementation(async (file: File) => file);
  mocks.verify.mockReset().mockResolvedValue({ naturalWidth: 900, naturalHeight: 700 });
  mocks.recognize
    .mockReset()
    .mockResolvedValue([{ category: 'Аптеки', percent: '5', uncertain: false }]);
});

function drop(file: File) {
  const area = screen.getByRole('region', { name: 'Перетащите скриншот банка' });
  fireEvent.drop(area, { dataTransfer: { types: ['Files'], files: [file] } });
}

describe('скриншот из пустого набора категорий', () => {
  it('открывает превью и сохраняет только после ввода банка, распознавания и проверки', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    drop(new File(['image'], 'screen.png', { type: 'image/png' }));
    const dialog = await screen.findByRole('dialog', { name: 'Добавить из скриншота' });
    expect(
      await within(dialog).findByRole('img', {
        name: 'Загруженный скриншот для проверки категорий',
      }),
    ).toBeVisible();
    expect(within(dialog).getByText('screen.png')).toBeVisible();
    expect(within(dialog).getByLabelText('Название банка')).toHaveValue('');
    expect(within(dialog).getByRole('button', { name: 'Распознать' })).toBeDisabled();
    expect(mocks.recognize).not.toHaveBeenCalled();
    expect(loadOffers()).toEqual([]);
    await user.type(within(dialog).getByLabelText('Название банка'), 'Т-Банк');
    await user.click(within(dialog).getByRole('button', { name: 'Распознать' }));
    await within(dialog).findByText('Проверьте результат');
    expect(loadOffers()).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Сохранить категории' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(loadOffers()).toEqual([
      expect.objectContaining({ category: 'Аптеки', bank: 'Т-Банк', percent: 5 }),
    ]);
  });

  it.each([
    ['screen.png', 'image/png'],
    ['screen.jpeg', 'image/jpeg'],
    ['screen.webp', 'image/webp'],
    ['screen.heic', 'image/heic'],
    ['screen.heif', ''],
  ])('передаёт файл %s в существующую обработку изображений', async (name, type) => {
    render(<App />);
    const file = new File(['image'], name, { type });
    drop(file);
    expect(await screen.findByText(name)).toBeVisible();
    expect(mocks.prepare).toHaveBeenCalledWith(file, expect.any(AbortSignal), expect.any(Function));
  });

  it('показывает ошибку формата и оставляет ручной ввод доступным', async () => {
    const user = userEvent.setup();
    render(<App />);
    drop(new File(['text'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Выберите PNG, JPEG, WebP или HEIC.',
    );
    expect(mocks.prepare).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ввести вручную' }));
    expect(screen.getByRole('dialog', { name: 'Добавить категорию' })).toBeVisible();
    expect(loadOffers()).toEqual([]);
  });

  it('отклоняет слишком большой файл без обработки', async () => {
    render(<App />);
    const file = new File(['image'], 'large.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
    drop(file);
    expect(await screen.findByRole('alert')).toHaveTextContent('Максимальный размер — 25 МБ.');
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it('отменяет загрузку при закрытии и не возвращает старый файл при новом открытии', async () => {
    let finish!: (file: Blob) => void;
    mocks.prepare.mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<App />);
    const file = new File(['image'], 'cancelled.png', { type: 'image/png' });
    drop(file);
    await screen.findByRole('dialog', { name: 'Добавить из скриншота' });
    const signal = mocks.prepare.mock.calls[0][1] as AbortSignal;
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(signal.aborted).toBe(true);
    await act(async () => finish(file));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Загрузить скриншот' }));
    expect(screen.queryByText('cancelled.png')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(loadOffers()).toEqual([]);
  });
});
