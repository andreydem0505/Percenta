import { MAX_BACKUP_BYTES, serializeOffersBackup } from '../model/backup';
import type { Offer } from '../../offers/model/offers';

export function readBackupFile(file: File, signal: AbortSignal): Promise<string> {
  if (file.size > MAX_BACKUP_BYTES)
    return Promise.reject(new Error('Файл слишком большой. Максимальный размер — 5 МБ.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => signal.removeEventListener('abort', cancel);
    const cancel = () => {
      cleanup();
      reader.abort();
      reject(new DOMException('Операция отменена', 'AbortError'));
    };
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener('abort', cancel, { once: true });
    reader.onload = () => {
      cleanup();
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      cleanup();
      reject(new Error('Не удалось открыть файл. Выберите его ещё раз.'));
    };
    try {
      reader.readAsText(file);
    } catch {
      cleanup();
      reject(new Error('Не удалось открыть файл. Выберите его ещё раз.'));
    }
  });
}

export function downloadOffersBackup(offers: readonly Offer[]): void {
  const blob = new Blob([serializeOffersBackup(offers)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    link.href = url;
    link.download = `percenta-${date}.json`;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    // Let Safari finish consuming the download before releasing its Blob URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
