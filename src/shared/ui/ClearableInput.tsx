import { useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

type ClearableInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  clearLabel: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  wrapperClassName?: string;
};

export function ClearableInput({
  value,
  onValueChange,
  clearLabel,
  leading,
  trailing,
  wrapperClassName = '',
  disabled,
  readOnly,
  ...props
}: ClearableInputProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <span className={`clearable-input ${wrapperClassName}`.trim()}>
      {leading}
      <input
        {...props}
        ref={input}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {value && !disabled && !readOnly && (
        <button
          type="button"
          className="icon-button input-clear"
          aria-label={clearLabel}
          title={clearLabel}
          onPointerDown={(event) => {
            if (event.button === 0) event.preventDefault();
          }}
          onClick={() => {
            onValueChange('');
            input.current?.focus({ preventScroll: true });
          }}
        >
          <X size={16} />
        </button>
      )}
      {trailing}
    </span>
  );
}
