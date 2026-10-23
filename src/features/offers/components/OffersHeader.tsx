import { Plus, Trash2, Upload } from 'lucide-react';
export function OffersHeader({
  count,
  hasStorageError,
  onClear,
  onUpload,
  onAdd,
}: {
  count: number;
  hasStorageError: boolean;
  onClear: () => void;
  onUpload: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="page-heading">
      <div className="page-title">
        <h1 id="offers-title">
          Мой кэшбек
          <span className="count-pill">{count}</span>
        </h1>
        {(count > 0 || hasStorageError) && (
          <button
            className="icon-button clear-button"
            aria-label="Очистить все записи"
            onClick={onClear}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <div className="page-actions">
        <button className="button secondary" aria-label="Загрузить скриншот" onClick={onUpload}>
          <Upload size={17} />
          <span className="action-label-long">Загрузить скриншот</span>
          <span className="action-label-short" aria-hidden="true">
            Скриншот
          </span>
        </button>
        <button className="button primary" aria-label="Добавить категорию" onClick={onAdd}>
          <Plus size={18} />
          <span className="action-label-long">Добавить категорию</span>
          <span className="action-label-short" aria-hidden="true">
            Вручную
          </span>
        </button>
      </div>
    </div>
  );
}
