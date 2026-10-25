import { useRef, useState, type DragEvent } from 'react';
import { BrandMark } from '../../../shared/ui/BrandMark';

export function EmptyOffers({ onScreenshotDrop }: { onScreenshotDrop: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const dragDepth = useRef(0);

  function hasFiles(event: DragEvent) {
    return (
      Array.from(event.dataTransfer.types ?? []).includes('Files') ||
      event.dataTransfer.files.length > 0
    );
  }

  return (
    <div
      className={`empty-state${dragging ? ' empty-state--dragging' : ''}`}
      role="region"
      aria-label="Перетащите скриншот банка"
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setDragging(false);
        setError('');
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 1) {
          setError('Перетащите один скриншот за раз.');
          return;
        }
        if (files[0]) onScreenshotDrop(files[0]);
      }}
    >
      <BrandMark className="empty-state-mark" />
      <h3>{dragging ? 'Отпустите скриншот здесь' : 'Пока нет категорий'}</h3>
      <p>
        Перетащите сюда скриншот из приложения банка с категориями кэшбека и процентами или добавьте
        их кнопками выше.
      </p>
      {error && (
        <p className="empty-state-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
