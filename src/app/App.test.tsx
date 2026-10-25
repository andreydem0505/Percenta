import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { loadOffers, STORAGE_KEY } from '../features/offers/data/local-offer-repository';

describe('основные пользовательские сценарии', () => {
  it('очищает категорию и банк в черновике, сохраняя запись при отмене', async () => {
    const offer = { id: 'clear-demo', category: 'Кафе', bank: 'Сбер', percent: 5 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, offers: [offer] }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Редактировать Кафе, Сбер' }));
    await user.click(screen.getByRole('button', { name: 'Очистить категорию' }));
    expect(screen.getByLabelText('Категория')).toHaveValue('');
    expect(screen.getByLabelText('Категория')).toHaveFocus();
    expect(screen.getByLabelText('Банк')).toHaveValue('Сбер');
    await user.click(screen.getByRole('button', { name: 'Очистить банк' }));
    expect(screen.getByLabelText('Банк')).toHaveValue('');
    expect(screen.getByLabelText('Банк')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(loadOffers()).toEqual([offer]);
    expect(screen.getByRole('heading', { name: 'Кафе' })).toBeInTheDocument();
  });
  it('закрывает уведомление cookie и показывает справку без настроек аналитики', async () => {
    localStorage.setItem('percenta.analytics-consent.v1', 'denied');
    const controller = { available: true, setEnabled: vi.fn(async () => {}) };
    const user = userEvent.setup();
    render(<App analyticsController={controller} />);
    await user.click(screen.getByRole('button', { name: 'Понятно' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Как это работает' }));
    expect(screen.getByRole('dialog', { name: 'Как это работает' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Настройки cookie' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Приватность' })).toBeVisible();
    expect(controller.setEnabled).toHaveBeenCalledWith(true);
    expect(controller.setEnabled).not.toHaveBeenCalledWith(false);
    expect(loadOffers()).toEqual([]);
  });
  it('начинается с честного пустого состояния', () => {
    render(<App />);
    expect(screen.getByText('Пока нет категорий')).toBeInTheDocument();
    expect(loadOffers()).toEqual([]);
  });
  it('добавляет вручную, сохраняет и показывает предложение', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Добавить категорию' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Категория'), 'Кафе');
    await user.type(within(dialog).getByLabelText('Банк'), 'Сбер');
    await user.type(within(dialog).getByLabelText('Процент кэшбека'), '5,5');
    await user.click(within(dialog).getByRole('button', { name: /Сохранить/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Кафе' })).toBeInTheDocument();
    expect(loadOffers()[0]).toMatchObject({ category: 'Кафе', bank: 'Сбер', percent: 5.5 });
  });
  it('показывает все банки и позволяет независимо редактировать и удалять предложения', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        offers: [
          { id: 'a', category: 'Кафе', bank: 'Сбер', percent: 3 },
          { id: 'b', category: 'Кафе', bank: 'Т-Банк', percent: 7 },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByRole('heading', { name: 'Кафе' })).toHaveLength(2);
    expect(screen.getByText('Т-Банк')).toBeInTheDocument();
    expect(screen.getByText('Сбер')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Редактировать Кафе, Сбер' }));
    expect(screen.queryByLabelText('Предложение банка')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Процент кэшбека')).toHaveValue('3');
    await user.clear(screen.getByLabelText('Процент кэшбека'));
    await user.type(screen.getByLabelText('Процент кэшбека'), '4');
    await user.click(screen.getByRole('button', { name: /Сохранить/ }));
    expect(loadOffers()).toContainEqual({ id: 'a', category: 'Кафе', bank: 'Сбер', percent: 4 });
    expect(loadOffers()).toContainEqual({ id: 'b', category: 'Кафе', bank: 'Т-Банк', percent: 7 });
    await user.click(screen.getByRole('button', { name: 'Редактировать Кафе, Т-Банк' }));
    await user.click(screen.getByRole('button', { name: 'Удалить Кафе, Т-Банк' }));
    expect(loadOffers()).toHaveLength(1);
    expect(screen.getByText('Сбер')).toBeInTheDocument();
  });
  it('выделяет все покупки и оставляет их наверху при поиске', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        offers: [
          { id: 'a', category: 'АЗС', bank: 'Сбер', percent: 50 },
          { id: 'b', category: 'За все покупки', bank: 'Сбер', percent: 1 },
          { id: 'c', category: 'На любые покупки', bank: 'Т-Банк', percent: 2 },
          { id: 'd', category: 'АЗС', bank: 'Т-Банк', percent: 5 },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Мой кэшбек4');
    const cards = () => screen.getAllByRole('article');
    expect(cards()).toHaveLength(4);
    expect(
      cards()
        .slice(0, 2)
        .every((card) => card.classList.contains('offer-card--all-purchases')),
    ).toBe(true);
    expect(within(cards()[0]).getByRole('heading')).toHaveTextContent('На любые покупки');
    expect(screen.queryByRole('combobox', { name: 'Сортировка' })).not.toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: 'Поиск по категории или банку' }),
      'Т-Банк',
    );
    expect(cards()).toHaveLength(2);
    expect(within(cards()[0]).getByRole('heading')).toHaveTextContent('На любые покупки');
    expect(within(cards()[1]).getByRole('heading')).toHaveTextContent('АЗС');
  });
  it('по запросу такси показывает тарифы всех банков без изменения сохранённых названий', async () => {
    const offers = [
      { id: 'a', category: 'Эконом', bank: 'Сбер', percent: 3 },
      { id: 'b', category: 'Комфорт+', bank: 'Т-Банк', percent: 7 },
      { id: 'c', category: 'Ultima', bank: 'Альфа-Банк', percent: 5 },
      { id: 'd', category: 'Комфорт+', bank: 'Сбер', percent: 2 },
      { id: 'e', category: 'Отели Комфорт', bank: 'Сбер', percent: 10 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, offers }));
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByRole('textbox', { name: 'Поиск по категории или банку' });
    await user.type(search, 'такси');
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(
      screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent),
    ).toEqual(['Комфорт+', 'Ultima', 'Эконом', 'Комфорт+']);
    expect(loadOffers()).toEqual(offers);
    await user.clear(search);
    await user.type(search, 'альфа');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Ultima' })).toBeInTheDocument();
    await user.clear(search);
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });
  it('редактирует запись без появления дубликата', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        offers: [{ id: 'a', category: 'Аптеки', bank: 'Сбер', percent: 5 }],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Редактировать Аптеки, Сбер' }));
    const input = screen.getByLabelText('Процент кэшбека');
    await user.clear(input);
    await user.type(input, '8');
    await user.click(screen.getByRole('button', { name: /Сохранить/ }));
    expect(loadOffers()).toEqual([{ id: 'a', category: 'Аптеки', bank: 'Сбер', percent: 8 }]);
  });
  it('не закрывает форму и не показывает успех при ошибке сохранения', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Добавить категорию' }));
    await user.type(screen.getByLabelText('Категория'), 'Аптеки');
    await user.type(screen.getByLabelText('Банк'), 'Банк');
    await user.type(screen.getByLabelText('Процент кэшбека'), '5');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    await user.click(screen.getByRole('button', { name: /Сохранить/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Не удалось сохранить запись/)).toBeInTheDocument();
    expect(loadOffers()).toEqual([]);
  });
  it('не затирает повреждённые данные при добавлении', async () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    render(<App />);
    expect(screen.getByText('Проблема с локальным хранилищем')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
  it('проверяет процент и не сохраняет 101%', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Добавить категорию' }));
    await user.type(screen.getByLabelText('Категория'), 'Аптеки');
    await user.type(screen.getByLabelText('Банк'), 'Банк');
    await user.type(screen.getByLabelText('Процент кэшбека'), '101');
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    expect(screen.getByText(/Укажите категорию, банк и процент/)).toBeInTheDocument();
    expect(loadOffers()).toEqual([]);
  });
  it('очистка требует подтверждения', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        offers: [{ id: 'a', category: 'Аптеки', bank: 'Сбер', percent: 5 }],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Очистить все записи' }));
    expect(loadOffers()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Удалить всё' }));
    expect(loadOffers()).toEqual([]);
    expect(screen.getByText('Пока нет категорий')).toBeInTheDocument();
  });
});
