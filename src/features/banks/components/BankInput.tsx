import { useId } from 'react';
import { BankLogo } from './BankLogo';

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
      <label className="field">
        {label}
        <span className="bank-input">
          <BankLogo bank={value} />
          <input
            required
            autoFocus={autoFocus}
            disabled={disabled}
            maxLength={80}
            list={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Например, Т-Банк"
            autoComplete="off"
          />
        </span>
      </label>
      <datalist id={id}>
        {banks.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}
