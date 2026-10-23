import { createWorker, OEM, PSM } from 'tesseract.js';
import { imageForOcr } from './images';
import { parseOcr, type OcrLine, type OcrDraft } from '../model/parse-ocr';

export async function recognizeCategories(
  blob: Blob,
  signal: AbortSignal,
  onProgress: (value: number) => void,
): Promise<OcrDraft[]> {
  const { canvas: image, dark } = await imageForOcr(blob, signal);
  const base = `${window.location.origin}${import.meta.env.BASE_URL}ocr`;
  const workerPromise = createWorker(['rus', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${base}/worker.min.js`,
    corePath: base,
    langPath: base,
    logger: (message) => {
      if (!signal.aborted)
        onProgress(
          message.status === 'recognizing text'
            ? 0.25 + message.progress * 0.75
            : message.progress * 0.2,
        );
    },
  });
  let worker: Awaited<typeof workerPromise> | undefined;
  let cancel: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    cancel = () => {
      void worker?.terminate();
      reject(new DOMException('Операция отменена', 'AbortError'));
    };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
  // Initialization cannot be interrupted in Tesseract; terminate it once ready if cancelled.
  void workerPromise.then(
    (value) => {
      if (signal.aborted) void value.terminate();
    },
    () => {},
  );
  try {
    worker = await Promise.race([workerPromise, aborted]);
    await worker.setParameters({
      // Automatic layout retains names beside illustrations on dark screens.
      // Preserve sparse layout for the light lists and grids it already reads well.
      tessedit_pageseg_mode: dark ? PSM.AUTO : PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    });
    const result = await Promise.race([
      worker.recognize(image, {}, { blocks: true, text: true }),
      aborted,
    ]);
    const lines: OcrLine[] = (result.data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) => paragraph.lines),
    );
    return parseOcr(lines);
  } finally {
    if (cancel) signal.removeEventListener('abort', cancel);
    if (!signal.aborted) await worker?.terminate();
    image.width = 0;
    image.height = 0;
  }
}
