import { BankInput } from '../../banks/components/BankInput';
import { useId, useRef, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCheck,
  FileImage,
  ImagePlus,
  LoaderCircle,
  Plus,
  ScanLine,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { ACCEPT_IMAGES } from '../services/images';
import { useScreenshotImport } from '../hooks/useScreenshotImport';
import { parsePercent, type OfferInput } from '../../offers/model/offers';
import { createId } from '../../../shared/lib/id';
import { ClearableInput } from '../../../shared/ui/ClearableInput';

export function UploadForm({
  banks,
  onSave,
  onClose,
  onManual,
}: {
  banks: string[];
  onSave: (values: OfferInput[]) => boolean;
  onClose: () => void;
  onManual: () => void;
}) {
  const model = useScreenshotImport();
  const {
    bank,
    setBank,
    image,
    setImage,
    filename,
    setFilename,
    preview,
    phase,
    setPhase,
    progress,
    drafts,
    setDrafts,
    error,
    setError,
    notice,
    setNotice,
    dragging,
    setDragging,
    busy,
    cancel,
    selectFile,
    update,
  } = model;
  const fileInput = useRef<HTMLInputElement>(null);
  const categoryPrefix = useId();
  function save(event: FormEvent) {
    event.preventDefault();
    const values = drafts.map((draft) => ({
      category: draft.category,
      percent: parsePercent(draft.percent),
      bank,
    }));
    if (
      !values.length ||
      values.some(
        (value) => !value.category.trim() || value.category.length > 120 || value.percent === null,
      ) ||
      !bank.trim()
    ) {
      setError('Заполните категорию (до 120 символов) и процент от 0 до 100 в каждой строке.');
      return;
    }
    if (onSave(values as OfferInput[])) onClose();
    else setError('Не удалось сохранить записи. Проверьте доступ к хранилищу браузера.');
  }
  return (
    <form
      className="form-stack upload-form"
      onSubmit={
        phase === 'review'
          ? save
          : (event) => {
              event.preventDefault();
              void model.recognize();
            }
      }
    >
      <div className="upload-steps" aria-label="Этапы загрузки">
        <span className={phase !== 'review' ? 'current' : 'complete'}>
          <i>{phase === 'review' ? <Check size={12} /> : '1'}</i> Скриншот
        </span>
        <span className="step-line" />
        <span className={phase === 'review' ? 'current' : ''}>
          <i>2</i> Проверка
        </span>
      </div>
      <BankInput
        label="Название банка"
        value={bank}
        onChange={setBank}
        banks={banks}
        disabled={busy}
        autoFocus
      />
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT_IMAGES}
        className="sr-only"
        aria-label="Выбрать скриншот"
        disabled={busy}
        onChange={(event) => {
          void selectFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {phase !== 'review' && !preview && !busy && (
        <button
          type="button"
          className={`file-drop ${dragging ? 'dragging' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void selectFile(event.dataTransfer.files[0]);
          }}
        >
          <span className="upload-icon">
            <ImagePlus size={27} />
          </span>
          <strong>Выберите скриншот</strong>
          <span>или перетащите его сюда</span>
          <small>PNG, JPEG, WebP, HEIC · до 25 МБ</small>
        </button>
      )}
      {preview && (
        <div className={`image-preview ${phase === 'review' ? 'review-preview' : ''}`}>
          <img src={preview} alt="Загруженный скриншот для проверки категорий" />
          <div className="preview-filename">
            <FileImage size={16} />
            <span>{filename}</span>
            {!busy && phase !== 'review' && (
              <button
                type="button"
                className="icon-button"
                aria-label="Убрать изображение"
                onClick={() => {
                  setImage(null);
                  setFilename('');
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>
      )}
      {busy && (
        <div className="recognition-progress" role="status" aria-live="polite">
          <LoaderCircle className="spin" size={25} />
          <strong>
            {phase === 'converting' ? 'Преобразуем HEIC…' : 'Находим категории и проценты…'}
          </strong>
          <p>
            {phase === 'converting'
              ? 'Изображение обрабатывается на вашем устройстве.'
              : 'Первый запуск может занять немного больше времени.'}
          </p>
          {phase === 'reading' && (
            <progress value={progress} max={1} aria-label="Прогресс распознавания" />
          )}
          <button type="button" className="button secondary" onClick={cancel}>
            Отменить обработку
          </button>
        </div>
      )}
      {phase === 'review' && (
        <>
          <div className="review-intro">
            <CheckCheck size={21} />
            <div>
              <strong>Проверьте результат</strong>
              <p>Оставьте только активные категории. Исправьте названия и проценты, если нужно.</p>
            </div>
          </div>
          {drafts.map((draft, index) => (
            <div className={`draft-row ${draft.uncertain ? 'uncertain' : ''}`} key={draft.id}>
              <div className="field">
                <label className="draft-label" htmlFor={`${categoryPrefix}-${draft.id}`}>
                  Категория {index + 1}
                  {draft.uncertain && <span className="check-label">Проверьте</span>}
                </label>
                <ClearableInput
                  id={`${categoryPrefix}-${draft.id}`}
                  required
                  maxLength={120}
                  aria-label={`Категория ${index + 1}`}
                  value={draft.category}
                  placeholder="Название категории"
                  onValueChange={(category) => update(draft.id, { category })}
                  clearLabel={`Очистить категорию ${index + 1}`}
                />
              </div>
              <label className="field">
                Кэшбек
                <div className="percent-input">
                  <input
                    required
                    inputMode="decimal"
                    aria-label={`Процент ${index + 1}`}
                    value={draft.percent}
                    placeholder="5"
                    onChange={(event) => update(draft.id, { percent: event.target.value })}
                  />
                  <span>%</span>
                </div>
              </label>
              <button
                type="button"
                className="icon-button delete-draft"
                aria-label={`Удалить строку ${index + 1}`}
                onClick={() =>
                  setDrafts((values) => values.filter((value) => value.id !== draft.id))
                }
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            className="button secondary add-row"
            type="button"
            onClick={() =>
              setDrafts((values) => [
                ...values,
                { id: createId(), category: '', percent: '', uncertain: false },
              ])
            }
          >
            <Plus size={17} /> Добавить строку
          </button>
        </>
      )}
      {notice && (
        <p role="status" className="info-message">
          <AlertCircle size={18} />
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="privacy-note">
        <ShieldCheck size={16} />
        <span>Скриншот остаётся на вашем устройстве</span>
      </div>
      {!busy && (
        <footer className="modal-actions upload-actions">
          <button
            type="button"
            className="button secondary"
            onClick={
              phase === 'review'
                ? () => {
                    setPhase('choose');
                    setError('');
                    setNotice('');
                  }
                : onManual
            }
          >
            {phase === 'review' ? (
              'Назад'
            ) : (
              <>
                <Plus size={16} /> Ввести вручную
              </>
            )}
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={phase === 'review' ? !drafts.length : !image || !bank.trim()}
          >
            {phase === 'review' ? (
              <>
                Сохранить категории <ArrowRight size={16} />
              </>
            ) : (
              <>
                <ScanLine size={17} /> Распознать
              </>
            )}
          </button>
        </footer>
      )}
    </form>
  );
}
