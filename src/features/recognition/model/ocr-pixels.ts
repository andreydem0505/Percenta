/** Keep coloured text as dark as white text when preparing a dark screenshot. */
export function prepareOcrPixels(pixels: Uint8Array | Uint8ClampedArray): boolean {
  let light = 0;
  let samples = 0;
  for (let i = 0; i + 3 < pixels.length; i += 64) {
    light += pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
    samples++;
  }
  if (!samples || light / samples >= 110) return false;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    // RGB inversion makes saturated purple percentages pale yellow. Use their
    // brightest channel instead, then suppress dim background details/arrows.
    const foreground = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    const gray = Math.round(255 - (Math.max(0, foreground - 64) * 255) / 191);
    pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
  }
  return true;
}
