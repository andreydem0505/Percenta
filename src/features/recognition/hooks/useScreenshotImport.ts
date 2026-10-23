import { useEffect, useRef, useState } from 'react';
import { prepareImage, loadImage } from '../services/images';
import type { OcrDraft } from '../model/parse-ocr';
import { createId } from '../../../shared/lib/id';

export interface Draft extends OcrDraft {
  id: string;
}
type Phase = 'choose' | 'converting' | 'reading' | 'review';
export interface ScreenshotServices {
  prepare: typeof prepareImage;
  verify: typeof loadImage;
  recognize: (
    blob: Blob,
    signal: AbortSignal,
    progress: (value: number) => void,
  ) => Promise<OcrDraft[]>;
}
const browserServices: ScreenshotServices = {
  prepare: prepareImage,
  verify: loadImage,
  recognize: async (...args) => (await import('../services/ocr')).recognizeCategories(...args),
};

export function useScreenshotImport(services: ScreenshotServices = browserServices) {
  const [bank, setBank] = useState('');
  const [image, setImage] = useState<Blob | null>(null);
  const [filename, setFilename] = useState('');
  const [preview, setPreview] = useState('');
  const [phase, setPhase] = useState<Phase>('choose');
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      operation.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!image) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const busy = phase === 'converting' || phase === 'reading';
  function cancel() {
    operation.current?.abort();
    operation.current = null;
    setPhase('choose');
    setProgress(0);
    setNotice('Обработка отменена. Можно выбрать другой файл или ввести категории вручную.');
  }
  async function selectFile(file?: File) {
    if (!file) return;
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 60_000);
    setError('');
    setNotice('');
    setDrafts([]);
    setImage(null);
    setFilename('');
    setPhase('choose');
    try {
      const blob = await services.prepare(file, controller.signal, () => {
        if (!controller.signal.aborted) setPhase('converting');
      });
      await services.verify(blob, controller.signal);
      if (controller.signal.aborted) return;
      setImage(blob);
      setFilename(file.name);
      setPhase('choose');
    } catch (error) {
      if (operation.current !== controller) return;
      if (controller.signal.aborted) {
        if (controller.signal.reason === 'timeout') {
          setError('Преобразование заняло слишком много времени. Попробуйте PNG или JPEG.');
          setPhase('choose');
        }
        return;
      }
      setError(error instanceof Error ? error.message : 'Не удалось открыть файл.');
      setPhase('choose');
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function recognize() {
    if (!bank.trim()) {
      setError('Сначала укажите название банка.');
      return;
    }
    if (!image) {
      setError('Выберите скриншот с категориями кэшбека.');
      return;
    }
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 120_000);
    setPhase('reading');
    setProgress(0);
    setError('');
    setNotice('');
    try {
      if (controller.signal.aborted) return;
      const values = await services.recognize(image, controller.signal, (value) => {
        if (!controller.signal.aborted) setProgress((current) => Math.max(current, value));
      });
      if (controller.signal.aborted) return;
      setDrafts(values.map((value) => ({ ...value, id: createId() })));
      if (!values.length)
        setNotice(
          'Не удалось найти категории и проценты. Добавьте строки вручную или попробуйте более чёткий скриншот.',
        );
      setPhase('review');
    } catch (error) {
      if (operation.current !== controller) return;
      if (controller.signal.aborted) {
        if (controller.signal.reason === 'timeout') {
          setError(
            'Распознавание заняло слишком много времени. Попробуйте уменьшить изображение или ввести категории вручную.',
          );
          setPhase('choose');
        }
        return;
      }
      setError(
        'Не удалось распознать изображение. Попробуйте другой скриншот или добавьте категории вручную.',
      );
      setPhase('choose');
    } finally {
      window.clearTimeout(timeout);
    }
  }
  function update(id: string, patch: Partial<Draft>) {
    setDrafts((values) =>
      values.map((value) => (value.id === id ? { ...value, ...patch } : value)),
    );
  }
  return {
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
    recognize,
    update,
  };
}
