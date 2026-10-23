import sharp from 'sharp';
import { prepareOcrPixels } from '../../src/features/recognition/model/ocr-pixels.ts';

// Match the browser's size limit and pixel transform in real OCR checks.
export async function ocrImage(filename) {
  const source = sharp(filename).rotate();
  const metadata = await source.metadata();
  const scale = Math.min(2, 2400 / Math.max(metadata.width, metadata.height));
  const { data, info } = await source
    .resize(
      Math.max(1, Math.round(metadata.width * scale)),
      Math.max(1, Math.round(metadata.height * scale)),
    )
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const dark = prepareOcrPixels(data);
  const bytes = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  return { bytes, dark };
}
