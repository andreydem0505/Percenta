import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../../app/App';
import { MAX_BACKUP_BYTES, serializeOffersBackup } from '../model/backup';
import { type Offer } from '../../offers/model/offers';
import { loadOffers, saveOffers, STORAGE_KEY } from '../../offers/data/local-offer-repository';

const existing: Offer = { id: 'a', category: 'Кафе', bank: 'Сбер', percent: 5 };
const incoming: Offer[] = [
  { id: 'b', category: 'Кафе', bank: 'Сбер', percent: 3.5 },
  { id: 'c', category: 'Кафе', bank: 'Т-Банк', percent: 10 },
];
const file = (text = serializeOffersBackup(incoming)) =>
  new File([text], 'aubenia.json', { type: 'application/json' });

async function open() {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole('button', { name: 'Импорт и экспорт данных' }));
  return { user, ...view };
}

describe('импорт и экспорт в интерфейсе', () => {
  it('показывает файл до подтверждения, объединяет и сохраняет после перезагрузки', async () => {
    saveOffers([existing]);
    const { user, unmount } = await open();
    await user.upload(screen.getByLabelText('JSON-файл с кэшбеком'), file());
    expect(await screen.findByText('Предложений в файле: 2')).toBeInTheDocument();
    expect(loadOffers()).toEqual([existing]);
    expect(screen.getByRole('list', { name: 'Предложения из файла' })).toHaveTextContent('Т-Банк');
    await user.click(screen.getByRole('button', { name: 'Импортировать' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(loadOffers()).toEqual([{ ...existing, percent: 3.5 }, incoming[1]]);
    unmount();
    render(<App />);
    expect(screen.getAllByRole('heading', { name: 'Кафе' })).toHaveLength(2);
  });
  it('отмена не меняет данные, повторный выбор не импортирует предыдущий файл', async () => {
    saveOffers([existing]);
    const { user } = await open();
    await user.upload(screen.getByLabelText('JSON-файл с кэшбеком'), file());
    await screen.findByText('Предложений в файле: 2');
    await user.upload(screen.getByLabelText('JSON-файл с кэшбеком'), file('{broken'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось прочитать JSON');
    expect(screen.queryByRole('button', { name: 'Импортировать' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(loadOffers()).toEqual([existing]);
  });
  it('отклоняет слишком большой и пустой файл без очистки текущего набора', async () => {
    saveOffers([existing]);
    const { user } = await open();
    const big = file();
    Object.defineProperty(big, 'size', { value: MAX_BACKUP_BYTES + 1 });
    await user.upload(screen.getByLabelText('JSON-файл с кэшбеком'), big);
    expect(await screen.findByRole('alert')).toHaveTextContent('5 МБ');
    await user.upload(
      screen.getByLabelText('JSON-файл с кэшбеком'),
      file(serializeOffersBackup([])),
    );
    expect(await screen.findByText('Предложений в файле: 0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Импортировать' })).not.toBeInTheDocument();
    expect(loadOffers()).toEqual([existing]);
  });
  it('оставляет предпросмотр и прежние данные при отказе хранилища', async () => {
    saveOffers([existing]);
    const { user } = await open();
    await user.upload(screen.getByLabelText('JSON-файл с кэшбеком'), file());
    await screen.findByText('Предложений в файле: 2');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    await user.click(screen.getByRole('button', { name: 'Импортировать' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Не удалось сохранить импорт');
    expect(loadOffers()).toEqual([existing]);
    expect(screen.queryByText('Данные импортированы')).not.toBeInTheDocument();
  });
  it('не затирает повреждённое хранилище импортом', async () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    const { user } = await open();
    await user.upload(screen.getByLabelText('JSON-файл с кэшбеком'), file());
    await screen.findByText('Предложений в файле: 2');
    await user.click(screen.getByRole('button', { name: 'Импортировать' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Не удалось сохранить импорт');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
  it('экспортирует полный набор при активном поиске', async () => {
    saveOffers([existing, incoming[1]]);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: 'Поиск по категории или банку' }), 'Сбер');
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Импорт и экспорт данных' }));
    await user.click(screen.getByRole('button', { name: 'Скачать JSON' }));
    const blob = create.mock.calls[0][0] as Blob;
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(JSON.parse(text).offers).toEqual([existing, incoming[1]]);
    expect(loadOffers()).toEqual([existing, incoming[1]]);
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
  });
});
