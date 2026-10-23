import sharp from 'sharp';

// Some banks still serve Windows ICO files, unsupported by sharp directly.
export async function decodeBankIcon(bytes) {
  if (bytes.length < 6 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) return bytes;
  const frames = [];
  for (let i = 0; i < bytes.readUInt16LE(4) && 6 + (i + 1) * 16 <= bytes.length; i++) {
    const entry = 6 + i * 16;
    frames.push({
      width: bytes[entry] || 256,
      height: bytes[entry + 1] || 256,
      offset: bytes.readUInt32LE(entry + 12),
      size: bytes.readUInt32LE(entry + 8),
    });
  }
  for (const frame of frames.sort((a, b) => b.width - a.width)) {
    const { width, height, offset, size } = frame;
    if (offset + size > bytes.length || size < 40) continue;
    const data = bytes.subarray(offset, offset + size);
    if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return data;
    const headerSize = data.readUInt32LE(0);
    const depth = data.readUInt16LE(14);
    if (headerSize !== 40 || ![1, 4, 8, 24, 32].includes(depth) || data.readUInt32LE(16) !== 0)
      continue;
    const colors = depth <= 8 ? data.readUInt32LE(32) || 1 << depth : 0;
    const start = headerSize + colors * 4;
    const stride = Math.ceil((width * depth) / 32) * 4;
    const maskStart = start + stride * height;
    const maskStride = Math.ceil(width / 32) * 4;
    if (maskStart > data.length) continue;
    const rgba = Buffer.alloc(width * height * 4);
    let hasAlpha = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const row = start + (height - y - 1) * stride;
        let pixel = row + x * (depth / 8);
        if (depth <= 8) {
          const shift = 8 - depth - ((x * depth) % 8);
          const index = (data[row + Math.floor((x * depth) / 8)] >> shift) & ((1 << depth) - 1);
          pixel = headerSize + index * 4;
        }
        const dest = (y * width + x) * 4;
        rgba[dest] = data[pixel + 2];
        rgba[dest + 1] = data[pixel + 1];
        rgba[dest + 2] = data[pixel];
        rgba[dest + 3] = depth === 32 ? data[pixel + 3] : 255;
        if (depth === 32 && rgba[dest + 3]) hasAlpha = true;
      }
    }
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const alpha = (y * width + x) * 4 + 3;
        if (depth === 32 && !hasAlpha) rgba[alpha] = 255;
        const mask = maskStart + (height - y - 1) * maskStride + Math.floor(x / 8);
        if (mask < data.length && data[mask] & (128 >> (x % 8))) rgba[alpha] = 0;
      }
    return sharp(rgba, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();
  }
  throw new Error('Unsupported ICO image');
}
