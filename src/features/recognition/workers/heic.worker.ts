import type { heicTo as convertHeic } from 'heic-to/next';

// Keep LGPL code independently replaceable; never bundle or integrity-lock this module.
const moduleUrl = `${import.meta.env.BASE_URL}vendor/heic/heic-to.mjs`;

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const { heicTo } = (await import(/* @vite-ignore */ moduleUrl)) as {
      heicTo: typeof convertHeic;
    };
    const blob = await heicTo({ blob: event.data, type: 'image/png' });
    self.postMessage({ blob });
  } catch {
    self.postMessage({
      error:
        'Не удалось преобразовать HEIC. Файл повреждён или использует неподдерживаемый вариант формата. Попробуйте PNG или JPEG.',
    });
  }
};
