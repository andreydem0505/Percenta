import { prepareOcrPixels } from '../model/ocr-pixels';

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const ACCEPT_IMAGES =
  '.png,.jpg,.jpeg,.webp,.heic,.heif,image/png,image/jpeg,image/webp,image/heic,image/heif';
const abortError = () => new DOMException('Операция отменена', 'AbortError');

export function validateImage(file: File): void {
  if (!file.size) throw new Error('Файл пуст. Выберите другое изображение.');
  if (file.size > MAX_FILE_SIZE)
    throw new Error('Изображение слишком большое. Максимальный размер — 25 МБ.');
  if (
    !/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name) &&
    !/^image\/(png|jpeg|webp|hei[cf])$/.test(file.type)
  ) {
    throw new Error('Выберите PNG, JPEG, WebP или HEIC.');
  }
}

export async function isHeic(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const signature = new TextDecoder('ascii').decode(bytes);
  return (
    /\.(heic|heif)$/i.test(file.name) ||
    /^image\/hei[cf]/.test(file.type) ||
    (signature.includes('ftyp') && /heic|heix|hevc|hevx|mif1/.test(signature))
  );
}

export async function prepareImage(
  file: File,
  signal: AbortSignal,
  onConverting: () => void,
): Promise<Blob> {
  validateImage(file);
  if (signal.aborted) throw abortError();
  if (!(await isHeic(file))) return file;
  if (signal.aborted) throw abortError();
  onConverting();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/heic.worker.ts', import.meta.url), {
      type: 'module',
    });
    const stop = () => {
      worker.terminate();
      signal.removeEventListener('abort', cancel);
    };
    const cancel = () => {
      stop();
      reject(abortError());
    };
    signal.addEventListener('abort', cancel, { once: true });
    worker.onmessage = (event) => {
      stop();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.blob);
    };
    worker.onerror = () => {
      stop();
      reject(
        new Error(
          'Не удалось преобразовать HEIC. Выберите другой файл или сохраните изображение в PNG/JPEG.',
        ),
      );
    };
    worker.postMessage(file);
  });
}

export function loadImage(blob: Blob, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const cleanup = () => {
      URL.revokeObjectURL(url);
      signal?.removeEventListener('abort', cancel);
    };
    const cancel = () => {
      img.src = '';
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener('abort', cancel, { once: true });
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Не удалось открыть изображение. Возможно, файл повреждён.'));
    };
    img.src = url;
  });
}

/** Limit the working canvas to keep mobile memory usage bounded. */
export async function imageForOcr(
  blob: Blob,
  signal: AbortSignal,
): Promise<{ canvas: HTMLCanvasElement; dark: boolean }> {
  const img = await loadImage(blob, signal);
  const scale = Math.min(2, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx)
    throw new Error('Браузер не поддерживает обработку изображений. Используйте ручной ввод.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dark = prepareOcrPixels(data.data);
  ctx.putImageData(data, 0, 0);
  return { canvas, dark };
}
