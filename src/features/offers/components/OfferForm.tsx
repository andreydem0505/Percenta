import { BankInput } from '../../banks/components/BankInput';
import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, Info, Trash2 } from 'lucide-react';
import { parsePercent, type Offer, type OfferInput } from '../model/offers';
import { ClearableInput } from '../../../shared/ui/ClearableInput';

export function OfferForm({
  offer,
  banks,
  onSave,
  onRemove,
  onClose,
}: {
  offer?: Offer;
  banks: string[];
  onSave: (input: OfferInput, id?: string) => boolean;
  onRemove?: (id: string) => boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(offer?.category ?? '');
  const [bank, setBank] = useState(offer?.bank ?? '');
  const [percent, setPercent] = useState(offer ? String(offer.percent).replace('.', ',') : '');
  const [error, setError] = useState('');
  const categoryId = useId();
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parsePercent(percent);
    if (!category.trim() || !bank.trim() || value === null) {
      setError('Укажите категорию, банк и процент от 0 до 100.');
      return;
    }
    if (onSave({ category, bank, percent: value }, offer?.id)) onClose();
    else setError('Не удалось сохранить запись. Проверьте доступ к хранилищу браузера.');
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="field">
        <label htmlFor={categoryId}>Категория</label>
        <ClearableInput
          id={categoryId}
          autoFocus
          required
          maxLength={120}
          value={category}
          onValueChange={setCategory}
          clearLabel="Очистить категорию"
          placeholder="Например, Супермаркеты"
        />
      </div>
      <div className="form-columns">
        <BankInput label="Банк" value={bank} onChange={setBank} banks={banks} />
        <label className="field">
          Кэшбек
          <div className="percent-input">
            <input
              required
              inputMode="decimal"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              placeholder="5"
              aria-label="Процент кэшбека"
            />
            <span>%</span>
          </div>
        </label>
      </div>
      <div className="inline-note">
        <Info size={17} />
        <span>Если у этого банка уже есть такая категория, процент обновится.</span>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <footer className={`modal-actions${offer && onRemove ? ' offer-edit-actions' : ''}`}>
        {offer && onRemove && (
          <button
            type="button"
            className="text-button delete-offer"
            aria-label={`Удалить ${offer.category}, ${offer.bank}`}
            title="Удалить предложение"
            onClick={() => {
              if (onRemove(offer.id)) onClose();
            }}
          >
            <Trash2 size={16} />
            <span className="delete-offer-label">Удалить предложение</span>
          </button>
        )}
        <button type="button" className="button secondary" onClick={onClose}>
          Отмена
        </button>
        <button className="button primary" type="submit">
          Сохранить <ArrowRight size={17} />
        </button>
      </footer>
    </form>
  );
}
