import { Check, ShieldCheck, X } from 'lucide-react';

export function StorageNotice({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="storage-error" role="alert">
      <ShieldCheck size={20} />
      <div>
        <strong>Проблема с локальным хранилищем</strong>
        <p>{error}</p>
        <button className="text-button" onClick={onRetry}>
          Попробовать снова
        </button>
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <span>
        <Check size={15} />
      </span>
      {message}
      <button className="icon-button" aria-label="Скрыть уведомление" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
