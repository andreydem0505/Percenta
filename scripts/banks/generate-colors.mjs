import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../', import.meta.url));

function dominantHue(pixels) {
  const bins = Array.from({ length: 24 }, () => ({ weight: 0, x: 0, y: 0 }));
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b, alpha] = pixels.subarray(i, i + 4);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    // Ignore transparent padding, white backgrounds, black lettering and gray edges.
    if (alpha < 128 || chroma < 30 || max < 45 || min > 230) continue;
    let hue =
      max === r ? (g - b) / chroma : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    hue = (hue * 60 + 360) % 360;
    const weight = (chroma / 255) * (alpha / 255);
    const bin = bins[Math.floor(hue / 15)];
    bin.weight += weight;
    bin.x += Math.cos((hue * Math.PI) / 180) * weight;
    bin.y += Math.sin((hue * Math.PI) / 180) * weight;
  }
  const peak = bins.reduce((best, bin, i) => (bin.weight > bins[best].weight ? i : best), 0);
  if (bins[peak].weight === 0) return null;
  // Average only neighboring shades of the dominant color, not unrelated brand colors.
  const cluster = [-1, 0, 1].map((offset) => bins[(peak + offset + bins.length) % bins.length]);
  const x = cluster.reduce((sum, bin) => sum + bin.x, 0);
  const y = cluster.reduce((sum, bin) => sum + bin.y, 0);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360) % 360;
}

/** Read preserved local images once; the browser receives only numeric color data. */
export async function generateBankColors() {
  const catalog = JSON.parse(await readFile(path.join(root, 'src/features/banks/data/banks.json')));
  const entries = await Promise.all(
    catalog
      .filter((bank) => bank.logo)
      .map(async (bank) => {
        const pixels = await sharp(path.join(root, 'public', bank.logo))
          .toColourspace('srgb')
          .ensureAlpha()
          .raw()
          .toBuffer();
        return [bank.id, dominantHue(pixels)];
      }),
  );
  entries.sort(([left], [right]) => left.localeCompare(right, 'en'));
  await writeFile(
    path.join(root, 'src/features/banks/data/bank-colors.json'),
    JSON.stringify(Object.fromEntries(entries), null, 2) + '\n',
  );
  console.log(`Prepared muted label hues from ${entries.length} preserved bank images.`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  await generateBankColors();
