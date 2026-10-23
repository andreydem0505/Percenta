import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadForm } from './UploadForm';
import type { OcrDraft } from '../model/parse-ocr';

const mocks = vi.hoisted(() => ({ recognize: vi.fn(), prepare: vi.fn() }));
vi.mock('../services/ocr', () => ({ recognizeCategories: mocks.recognize }));
vi.mock('../services/images', () => ({
  ACCEPT_IMAGES: '.png,.jpg,.jpeg,.webp,.heic',
  prepareImage: mocks.prepare,
  loadImage: vi.fn().mockResolvedValue({ naturalWidth: 900, naturalHeight: 700 }),
}));
beforeEach(() => {
  mocks.recognize.mockReset();
  mocks.prepare.mockReset();
  mocks.prepare.mockImplementation(async (file: File) => file);
});
async function chooseImage(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Название банка'), 'Т-Банк');
  await user.upload(
    screen.getByLabelText('Выбрать скриншот'),
    new File(['fake PNG'], 'screen.png', { type: 'image/png' }),
  );
}
describe('проверка распознанных категорий', () => {
  it('позволяет исправить результат перед сохранением', async () => {
    mocks.recognize.mockResolvedValue([{ category: 'Аптеки', percent: '5', uncertain: false }]);
    const onSave = vi.fn().mockReturnValue(true),
      onClose = vi.fn();
    const user = userEvent.setup();
    render(<UploadForm banks={[]} onSave={onSave} onClose={onClose} onManual={vi.fn()} />);
    await chooseImage(user);
    await user.click(screen.getByRole('button', { name: 'Распознать' }));
    await screen.findByText('Проверьте результат');
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Процент 1'));
    await user.type(screen.getByLabelText('Процент 1'), '7,5');
    await user.click(screen.getByRole('button', { name: 'Сохранить категории' }));
    expect(onSave).toHaveBeenCalledWith([{ category: 'Аптеки', bank: 'Т-Банк', percent: 7.5 }]);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('пустой результат допускает ручное добавление строки', async () => {
    mocks.recognize.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<UploadForm banks={[]} onSave={vi.fn()} onClose={vi.fn()} onManual={vi.fn()} />);
    await chooseImage(user);
    await user.click(screen.getByRole('button', { name: 'Распознать' }));
    await screen.findByText(/Не удалось найти категории/);
    expect(screen.getByRole('button', { name: 'Сохранить категории' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Добавить строку' }));
    expect(screen.getByLabelText('Категория 1')).toBeInTheDocument();
  });
  it('отменённая операция не показывает запоздавший результат', async () => {
    let resolve!: (value: OcrDraft[]) => void;
    mocks.recognize.mockImplementation(
      () =>
        new Promise<OcrDraft[]>((done) => {
          resolve = done;
        }),
    );
    const user = userEvent.setup();
    render(<UploadForm banks={[]} onSave={vi.fn()} onClose={vi.fn()} onManual={vi.fn()} />);
    await chooseImage(user);
    await user.click(screen.getByRole('button', { name: 'Распознать' }));
    await waitFor(() => expect(mocks.recognize).toHaveBeenCalledOnce());
    const signal = mocks.recognize.mock.calls[0][1] as AbortSignal;
    await user.click(screen.getByRole('button', { name: 'Отменить обработку' }));
    expect(signal.aborted).toBe(true);
    await act(async () => resolve([{ category: 'Аптеки', percent: '5', uncertain: false }]));
    expect(screen.queryByText('Проверьте результат')).not.toBeInTheDocument();
    expect(screen.getByText(/Обработка отменена/)).toBeInTheDocument();
  });
  it('ошибка распознавания оставляет ручной ввод доступным', async () => {
    mocks.recognize.mockRejectedValue(new Error('WASM failed'));
    const manual = vi.fn(),
      user = userEvent.setup();
    render(<UploadForm banks={[]} onSave={vi.fn()} onClose={vi.fn()} onManual={manual} />);
    await chooseImage(user);
    await user.click(screen.getByRole('button', { name: 'Распознать' }));
    await screen.findByText(/Не удалось распознать изображение/);
    await user.click(screen.getByRole('button', { name: 'Ввести вручную' }));
    expect(manual).toHaveBeenCalledOnce();
  });
  it('сообщает об ошибке конвертации HEIC', async () => {
    mocks.prepare.mockRejectedValue(new Error('Повреждённый HEIC'));
    const user = userEvent.setup();
    render(<UploadForm banks={[]} onSave={vi.fn()} onClose={vi.fn()} onManual={vi.fn()} />);
    await chooseImage(user);
    expect(await screen.findByText('Повреждённый HEIC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Распознать' })).toBeDisabled();
  });
});
