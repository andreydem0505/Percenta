import { BankInput } from '../../banks/components/BankInput';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { parsePercent, type Offer, type OfferInput } from '../model/offers';

export function OfferForm({
  offer,
  banks,
  onSave,
  onClose,
}: {
  offer?: Offer;
  banks: string[];
  onSave: (input: OfferInput, id?: string) => boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(offer?.category ?? '');
  const [bank, setBank] = useState(offer?.bank ?? '');
  const [percent, setPercent] = useState(offer ? String(offer.percent).replace('.', ',') : '');
  const [error, setError] = useState('');
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
      <label className="field">
        Категория
        <input
          autoFocus
          required
          maxLength={120}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Например, Супермаркеты"
        />
      </label>
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
      <footer className="modal-actions">
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
