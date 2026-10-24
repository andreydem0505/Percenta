import { useId } from 'react';
import { BankLogo } from './BankLogo';
import { ClearableInput } from '../../../shared/ui/ClearableInput';
import { ChevronDown } from 'lucide-react';

export function BankInput({
  label,
  value,
  onChange,
  banks,
  disabled,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  banks: string[];
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <>
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <ClearableInput
          id={id}
          wrapperClassName="bank-input"
          leading={<BankLogo bank={value} />}
          trailing={
            <span className="bank-picker">
              <ChevronDown size={16} aria-hidden="true" />
              <select
                aria-label="Выбрать банк"
                title="Выбрать банк"
                value={banks.includes(value) ? value : ''}
                disabled={disabled || banks.length === 0}
                onChange={(event) => onChange(event.target.value)}
              >
                <option value="" disabled>
                  Выберите банк
                </option>
                {banks.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </span>
          }
          required
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={80}
          list={`${id}-options`}
          value={value}
          onValueChange={onChange}
          clearLabel="Очистить банк"
          placeholder="Например, Т-Банк"
          autoComplete="off"
        />
      </div>
      <datalist id={`${id}-options`}>
        {banks.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}
