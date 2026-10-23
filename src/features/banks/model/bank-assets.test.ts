import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import catalog from '../data/banks.json';
import report from '../../../../scripts/banks/provenance/catalog.json';

it('поставляет все заявленные логотипы локально в исправном формате', async () => {
  const withLogo = catalog.filter((bank) => 'logo' in bank);
  expect(withLogo).toHaveLength(report.logos);
  expect(new Set(catalog.map((bank) => bank.id)).size).toBe(catalog.length);
  expect(catalog.filter((bank) => bank.current)).toHaveLength(report.registeredBanks);
  await Promise.all(
    withLogo.map(async (bank) => {
      expect(bank.logo).toMatch(/^banks\/[a-f0-9]{16}\.webp$/);
      const bytes = await readFile(`public/${bank.logo}`);
      const metadata = await sharp(bytes).metadata();
      expect([metadata.format, metadata.width, metadata.height]).toEqual(['webp', 96, 96]);
    }),
  );
});
