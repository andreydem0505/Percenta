import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EmptyOffers } from './EmptyOffers';

const fileTransfer = () => ({ files: [], types: ['Files'], dropEffect: 'none' });

it('keeps the drop hint active while dragging over its nested content', () => {
  render(<EmptyOffers onScreenshotDrop={vi.fn()} />);
  const area = screen.getByRole('region', { name: 'Перетащите скриншот банка' });
  fireEvent.dragEnter(area, { dataTransfer: fileTransfer() });
  const heading = screen.getByRole('heading', { name: 'Отпустите скриншот здесь' });
  fireEvent.dragEnter(heading, { dataTransfer: fileTransfer() });
  fireEvent.dragLeave(heading, { dataTransfer: fileTransfer() });
  expect(screen.getByText('Отпустите скриншот здесь')).toBeInTheDocument();
  fireEvent.dragLeave(area, { dataTransfer: fileTransfer() });
  expect(screen.getByText('Пока нет категорий')).toBeInTheDocument();
});

it('asks for one file and accepts a subsequent single-file drop', () => {
  const onScreenshotDrop = vi.fn();
  render(<EmptyOffers onScreenshotDrop={onScreenshotDrop} />);
  const area = screen.getByRole('region', { name: 'Перетащите скриншот банка' });
  const file = new File(['image'], 'screen.png', { type: 'image/png' });
  fireEvent.drop(area, { dataTransfer: { ...fileTransfer(), files: [file, file] } });
  expect(screen.getByRole('alert')).toHaveTextContent('Перетащите один скриншот за раз.');
  expect(onScreenshotDrop).not.toHaveBeenCalled();
  const transfer = { ...fileTransfer(), files: [file] };
  fireEvent.dragOver(area, { dataTransfer: transfer });
  expect(transfer.dropEffect).toBe('copy');
  expect(fireEvent.drop(area, { dataTransfer: transfer })).toBe(false);
  expect(onScreenshotDrop).toHaveBeenCalledWith(file);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('ignores dragging text or links', () => {
  const onScreenshotDrop = vi.fn();
  render(<EmptyOffers onScreenshotDrop={onScreenshotDrop} />);
  const area = screen.getByRole('region', { name: 'Перетащите скриншот банка' });
  const dataTransfer = { files: [], types: ['text/plain', 'text/uri-list'] };
  fireEvent.dragEnter(area, { dataTransfer });
  fireEvent.dragOver(area, { dataTransfer });
  fireEvent.drop(area, { dataTransfer });
  expect(screen.getByText('Пока нет категорий')).toBeInTheDocument();
  expect(onScreenshotDrop).not.toHaveBeenCalled();
});
