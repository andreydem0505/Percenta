import { downloadOffersBackup } from '../services/files';
import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { useBackupImport } from '../hooks/useBackupImport';
import { formatPercent, type Offer } from '../../offers/model/offers';

export function DataTransfer({
  offers,
  onImport,
  onClose,
}: {
  offers: readonly Offer[];
  onImport: (offers: Offer[]) => boolean;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { incoming, filename, busy, error, setError, read } = useBackupImport();

  return (
    <div className="backup-content">
      <section className="backup-section" aria-labelledby="export-title">
        <h3 id="export-title">Экспорт</h3>
        <p>Все ваши предложения в одном JSON-файле — для резервной копии или другого устройства.</p>
        <button
          className="button secondary full-width"
          onClick={() => {
            setError('');
            try {
              downloadOffersBackup(offers);
            } catch {
              setError('Не удалось скачать файл. Попробуйте ещё раз.');
            }
          }}
        >
          <Download size={17} /> Скачать JSON
        </button>
      </section>
      <section className="backup-section" aria-labelledby="import-title">
        <h3 id="import-title">Импорт</h3>
        <p>
          Новые предложения добавятся. Совпадения по банку и категории обновятся из файла. Остальные
          записи сохранятся.
        </p>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-label="JSON-файл с кэшбеком"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void read(file);
          }}
        />
        <button
          className="button secondary full-width"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={17} />{' '}
          {busy ? 'Читаем файл…' : incoming ? 'Выбрать другой JSON' : 'Выбрать JSON-файл'}
        </button>
        {incoming && (
          <div className="backup-preview">
            <p className="backup-filename">{filename}</p>
            <p role="status">Предложений в файле: {incoming.length}</p>
            {incoming.length > 0 ? (
              <ul className="backup-offers" aria-label="Предложения из файла" tabIndex={0}>
                {incoming.map((offer) => (
                  <li key={offer.id}>
                    <div>
                      <strong>{offer.category}</strong>
                      <span>{offer.bank}</span>
                    </div>
                    <b>{formatPercent(offer.percent)}%</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Файл пуст. Текущие записи останутся без изменений.</p>
            )}
          </div>
        )}
      </section>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Отмена
        </button>
        {incoming && incoming.length > 0 && (
          <button
            className="button primary"
            onClick={() => {
              if (onImport(incoming)) onClose();
              else
                setError(
                  'Не удалось сохранить импорт. Данные не изменены. Проверьте локальное хранилище и повторите.',
                );
            }}
          >
            Импортировать
          </button>
        )}
      </div>
    </div>
  );
}
