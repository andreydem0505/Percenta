import { useEffect, useRef, useState } from 'react';
import type { Offer } from '../../offers/model/offers';
import { readBackupFile } from '../services/files';
import { parseOffersBackup } from '../model/backup';

type BackupReader = (file: File, signal: AbortSignal) => Promise<string>;

export function useBackupImport(readFile: BackupReader = readBackupFile) {
  const operation = useRef<AbortController | null>(null);
  const [incoming, setIncoming] = useState<Offer[] | null>(null);
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(
    () => () => {
      operation.current?.abort();
      operation.current = null;
    },
    [],
  );

  async function read(file: File) {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setIncoming(null);
    setFilename('');
    setError('');
    setBusy(true);
    try {
      const text = await readFile(file, controller.signal);
      if (controller.signal.aborted) return;
      setIncoming(parseOffersBackup(text));
      setFilename(file.name);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : 'Не удалось прочитать файл.');
    } finally {
      if (operation.current === controller) setBusy(false);
    }
  }
  return { incoming, filename, busy, error, setError, read };
}
