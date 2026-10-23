// Explicit, opt-in download. The application never contacts these sources at runtime.
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import { normalizeBankName } from '../../src/features/banks/model/bank-names.ts';
import { decodeBankIcon } from './decode-icon.mjs';
import { approvedImagePermission, refreshImageRights } from './image-rights.mjs';

const updateImages = process.argv.includes('--images');
const { permissions } = JSON.parse(
  await readFile(new URL('./config/logo-permissions.json', import.meta.url)),
);
const previousBanks = new Map(
  JSON.parse(await readFile('src/features/banks/data/banks.json', 'utf8')).map((bank) => [
    bank.id,
    bank,
  ]),
);
const previousImages = new Map(
  JSON.parse(await readFile(new URL('./provenance/catalog.json', import.meta.url))).images.map(
    (image) => [image.id, image],
  ),
);

const revision = '83405f6c4e9a10c3f9c3bcba3eea25653210cb16';
const sources = {
  cbr: 'https://www.cbr.ru/banking_sector/credit/fullcolist/',
  sbp: 'https://qr.nspk.ru/proxyapp/c2bmembers.json',
  rblp: `https://raw.githubusercontent.com/melpnz/rblp/${revision}/README.md`,
  websites: 'https://www.cbr.ru/banking_sector/credit/cowebsites/',
};
const overrides = JSON.parse(await readFile(new URL('./config/aliases.json', import.meta.url)));
const aliases = new Map();
for (const [name, values] of Object.entries(overrides)) {
  for (const alias of [name, ...values]) aliases.set(normalizeBankName(alias), name);
}
const canonical = (name) => aliases.get(normalizeBankName(name)) ?? name;
const key = (name) => normalizeBankName(canonical(name));
function displayName(name) {
  return name
    .replace(/[«»"]/g, '')
    .trim()
    .replace(
      /^(?:(?:ПАО|АО|ООО|ОАО|ЗАО|НАО|НПАО|АКБ|КБ|АБ|АНКБ|НКБ|АКИБ|МКИБ|КАБ|КМ|комбанк)\s+)+/i,
      '',
    )
    .replace(/\s*\((?:ПАО|АО|ООО|ОАО|ЗАО)\)\s*$/i, '')
    .replace(/\s+(?:ПАО|АО|ООО|ОАО|ЗАО)$/i, '')
    .trim();
}
async function download(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 5_000_000) throw new Error(`Oversized resource: ${url}`);
      return bytes;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}
// Cached snapshots make a failed image download retryable without losing its source list.
await mkdir('.cache/banks', { recursive: true });
async function snapshot(name, url) {
  const filename = `.cache/banks/${name}`;
  if (process.argv.includes('--cached')) return readFile(filename);
  const bytes = await download(url);
  await writeFile(filename, bytes);
  return bytes;
}
const [html, sbpBytes, readme] = await Promise.all([
  snapshot('cbr.html', sources.cbr),
  snapshot('sbp.json', sources.sbp),
  snapshot('rblp.txt', sources.rblp),
]);
const document = new JSDOM(html.toString()).window.document;
const registry = [...document.querySelectorAll('table tr')]
  .map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent.trim()))
  .filter((row) => row[7] === 'Действующая' && !row[1]);
if (registry.length < 200) throw new Error('The CBR directory format changed. No files updated.');
const banks = new Map();
function get(name, identity = name) {
  const id = key(identity);
  if (!id) throw new Error(`Empty bank identity: ${name}`);
  if (!banks.has(id)) banks.set(id, { name: canonical(name), aliases: new Set(), candidates: [] });
  const bank = banks.get(id);
  bank.aliases.add(name);
  return bank;
}
for (const row of registry) {
  // ООО «АТБ» (2776) and Азиатско-Тихоокеанский Банк (1810) are unrelated.
  const bank = get(row[4], row[2] === '2776' ? 'Автоторгбанк' : row[4]);
  if (bank.registrationNumber && bank.registrationNumber !== row[2]) {
    throw new Error(`Ambiguous registry names: ${bank.name}, ${row[4]}`);
  }
  if (!overrides[bank.name]) bank.name = displayName(row[4]);
  if (row[2] === '2776') bank.name = 'Автоторгбанк';
  bank.registrationNumber = row[2];
  bank.current = true;
}
const websiteHtml = await snapshot('websites.html', sources.websites);
const websiteDoc = new JSDOM(websiteHtml.toString()).window.document;
const websites = new Map(
  [...websiteDoc.querySelectorAll('table tr')].flatMap((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length !== 4) return [];
    return [
      [
        cells[1].textContent.trim(),
        [...cells[3].querySelectorAll('a')]
          .map((a) => a.href)
          .filter(
            (url) =>
              /^https?:/.test(url) &&
              !/(?:^|\.)(?:vk\.com|vk\.ru|t\.me|ok\.ru|linkedin\.com|dzen\.ru|youtube\.com|rutube\.ru|facebook\.com|instagram\.com|twitter\.com|x\.com)$/i.test(
                new URL(url).hostname,
              ),
          )
          .sort((a, b) => new URL(a).pathname.length - new URL(b).pathname.length),
      ],
    ];
  }),
);

async function officialIcon(registrationNumber, bankId) {
  const urls = [
    ...new Set(
      (websites.get(registrationNumber) ?? []).map((url) => url.replace(/^http:/, 'https:')),
    ),
  ].slice(0, 2);
  for (const url of urls) {
    try {
      const filename = `.cache/banks/site-${createHash('sha256').update(url).digest('hex')}.html`;
      let html;
      try {
        html = await readFile(filename, 'utf8');
      } catch {
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) continue;
        html = await response.text();
        if (html.length > 3_000_000) continue;
        await writeFile(filename, html);
      }
      const doc = new JSDOM(html, { url }).window.document;
      const icons = [...doc.querySelectorAll('link[rel]')]
        .filter((link) => /(^|\s)(icon|apple-touch-icon)(\s|$)/i.test(link.rel))
        .map((link) => link.href)
        .filter((href) => /^https?:/.test(href))
        .sort((a, b) => Number(/\.ico(?:\?|$)/i.test(a)) - Number(/\.ico(?:\?|$)/i.test(b)));
      const logos = [...doc.querySelectorAll('img[src]')]
        .filter((img) => /logo/i.test([img.getAttribute('src'), img.className, img.id].join(' ')))
        .map((img) => img.src)
        .filter((href) => /^https?:/.test(href));
      for (const iconUrl of [
        ...new Set([...icons, ...logos.slice(0, 2), new URL('/favicon.ico', url).href]),
      ].slice(0, 6)) {
        if (!approvedImagePermission(permissions, bankId, iconUrl)) continue;
        try {
          const cached = `.cache/banks/${createHash('sha256').update(iconUrl).digest('hex')}.image`;
          let bytes;
          try {
            bytes = await readFile(cached);
          } catch {
            const response = await fetch(iconUrl, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) continue;
            bytes = Buffer.from(await response.arrayBuffer());
            if (bytes.length > 1_000_000) continue;
            await writeFile(cached, bytes);
          }
          // Rasterize SVGs only when they cannot reference external resources or embed HTML.
          const text = bytes.toString();
          if (
            /<svg/i.test(text) &&
            /<script|foreignObject|<!ENTITY|@import|(?:href|url)\s*[=(]\s*["']?(?:https?:|\/\/|file:|data:)/i.test(
              text,
            )
          )
            continue;
          bytes = await decodeBankIcon(bytes);
          const image = sharp(bytes, { limitInputPixels: 16_000_000 });
          const metadata = await image.metadata();
          if (!metadata.width || !metadata.height || metadata.width < 16 || metadata.height < 16)
            continue;
          return { bytes, url: iconUrl };
        } catch {
          /* Try the next icon, then the next registered website. */
        }
      }
    } catch {
      /* The registry may contain an unavailable website. */
    }
  }
}
for (const match of readme.toString().matchAll(/^\| <img[^\n]+?\| ([^|]+) \| ([a-z0-9-]+) \|/gm)) {
  // The upstream table accidentally labels two different banks as АТБ.
  const name = match[2] === 'avtotorgbank' ? 'Автоторгбанк' : match[1].trim();
  const bank = get(name);
  if (!overrides[bank.name]) bank.name = name;
  bank.candidates.push({
    provider: 'rblp',
    url: `https://raw.githubusercontent.com/melpnz/rblp/${revision}/${encodeURI(`dark/png/icon + colored background/${match[2]}.png`)}`,
  });
}
for (const member of JSON.parse(sbpBytes).dictionary) {
  const bank = get(member.bankName);
  if (!overrides[bank.name]) bank.name = member.bankName;
  const url = new URL(member.logoURL);
  if (url.origin !== 'https://qr.nspk.ru') throw new Error('Unexpected logo host');
  bank.candidates.unshift({ provider: 'sbp', url: url.href });
}
for (const [name, values] of Object.entries(overrides)) {
  const bank = banks.get(key(name));
  if (bank) for (const alias of [name, ...values]) bank.aliases.add(alias);
}
await mkdir('public/banks', { recursive: true });
await mkdir('src/features/banks/data', { recursive: true });
const entries = [...banks.entries()];
const records = [];
const failures = [];
let completed = 0;
async function worker() {
  while (entries.length) {
    const [identity, bank] = entries.shift();
    const id = createHash('sha256').update(identity).digest('hex').slice(0, 16);
    const record = {
      id,
      name: bank.name,
      aliases: [...bank.aliases].sort((a, b) => a.localeCompare(b, 'ru')),
      current: !!bank.current,
      ...(bank.registrationNumber ? { registrationNumber: bank.registrationNumber } : {}),
    };
    const previous = previousBanks.get(id);
    if (previous?.logo) {
      record.logo = previous.logo;
      record.source = previousImages.get(id)?.source;
    }
    const permittedCandidates = updateImages
      ? [
          ...permissions
            .filter((permission) => permission.bankId === id)
            .map((permission) => ({ url: permission.sourceUrl })),
          ...bank.candidates,
        ].filter((candidate) => approvedImagePermission(permissions, id, candidate.url))
      : [];
    for (const candidate of permittedCandidates) {
      try {
        const filename = `.cache/banks/${createHash('sha256').update(candidate.url).digest('hex')}.image`;
        let bytes;
        try {
          bytes = await readFile(filename);
        } catch {
          bytes = await download(candidate.url);
          await writeFile(filename, bytes);
        }
        const logo = await sharp(bytes, { limitInputPixels: 16_000_000 })
          .rotate()
          .resize(96, 96, { fit: 'contain', background: '#ffffff' })
          .webp({ quality: 90 })
          .toBuffer();
        await writeFile(`public/banks/${id}.webp`, logo);
        record.logo = `banks/${id}.webp`;
        record.source = candidate.url;
        break;
      } catch (error) {
        failures.push({ name: bank.name, url: candidate.url, error: String(error) });
      }
    }
    if (updateImages && !record.logo && record.registrationNumber) {
      const icon = await officialIcon(record.registrationNumber, id);
      if (icon) {
        const bytes = await sharp(icon.bytes, { limitInputPixels: 16_000_000 })
          .rotate()
          .resize(96, 96, { fit: 'contain', background: '#ffffff' })
          .webp({ quality: 90 })
          .toBuffer();
        await writeFile(`public/banks/${id}.webp`, bytes);
        record.logo = `banks/${id}.webp`;
        record.source = icon.url;
      }
    }
    records.push(record);
    if (++completed % 50 === 0) console.log(`Prepared ${completed} banks`);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
records.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
const report = {
  updatedAt: new Date().toISOString(),
  sources,
  revision,
  registeredBanks: registry.length,
  names: records.length,
  logos: records.filter((bank) => bank.logo).length,
  currentWithLogo: records.filter((bank) => bank.current && bank.logo).length,
  withoutLogo: records.filter((bank) => !bank.logo).map(({ name }) => name),
  failures,
  images: records.filter((bank) => bank.logo).map(({ id, name, source }) => ({ id, name, source })),
};
await writeFile(
  'src/features/banks/data/banks.json',
  JSON.stringify(
    records.map(({ source, ...bank }) => bank),
    null,
    2,
  ) + '\n',
);
await writeFile('scripts/banks/provenance/catalog.json', JSON.stringify(report, null, 2) + '\n');
await refreshImageRights(report.images, permissions);
const used = new Set(records.filter((bank) => bank.logo).map((bank) => `${bank.id}.webp`));
for (const filename of await readdir('public/banks')) {
  if (/^[a-f0-9]{16}\.webp$/.test(filename) && !used.has(filename))
    await unlink(`public/banks/${filename}`);
}
console.log(
  JSON.stringify({
    ...report,
    images: report.images.length,
    withoutLogo: report.withoutLogo.length,
    failures: failures.length,
  }),
);
