import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const sources = {
  applications: 'https://qr.nspk.ru/proxyapp/c2bmembers.json',
  websites: 'https://www.cbr.ru/banking_sector/credit/cowebsites/',
};
const selection = JSON.parse(await readFile('scripts/banks/config/app-selection.json', 'utf8'));
const banks = JSON.parse(await readFile('src/features/banks/data/banks.json', 'utf8'));
await mkdir('.cache/bank-apps', { recursive: true });
async function snapshot(name, url) {
  const filename = `.cache/bank-apps/${name}`;
  if (process.argv.includes('--cached')) return readFile(filename, 'utf8');
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const text = await response.text();
  await writeFile(filename, text);
  return text;
}
const [members, websites] = await Promise.all([
  snapshot('members.json', sources.applications),
  snapshot('websites.html', sources.websites),
]);
const dictionary = JSON.parse(members).dictionary;
const document = new JSDOM(websites).window.document;
const sites = new Map(
  [...document.querySelectorAll('table tr')].flatMap((row) => {
    const cells = row.querySelectorAll('td');
    return cells.length === 4
      ? [[cells[1].textContent.trim(), [...cells[3].querySelectorAll('a')].map((a) => a.href)]]
      : [];
  }),
);
const host = (url) => new URL(url).hostname.replace(/^www\./, '');
if (
  selection.length !== 30 ||
  new Set(selection.map((item) => item.registrationNumber)).size !== 30
)
  throw new Error('Expected 30 different retail banks');
const applications = selection.map(({ registrationNumber, website }) => {
  const bank = banks.find((bank) => bank.current && bank.registrationNumber === registrationNumber);
  if (!bank) throw new Error(`Bank missing from catalog: ${registrationNumber}`);
  const matches = dictionary.filter((member) =>
    [bank.name, ...bank.aliases].includes(member.bankName),
  );
  if (matches.length !== 1) throw new Error(`Ambiguous application: ${bank.name}`);
  const member = matches[0];
  if (!/^bank\d{12}$/.test(member.schema)) throw new Error(`Unexpected scheme: ${bank.name}`);
  if (
    !website.startsWith('https://') ||
    !(sites.get(registrationNumber) ?? []).some((url) => host(url) === host(website))
  )
    throw new Error(`Website not confirmed by CBR: ${bank.name}`);
  if (member.package_name && !/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(member.package_name))
    throw new Error(`Unexpected Android package: ${bank.name}`);
  return {
    registrationNumber,
    name: bank.name,
    scheme: member.schema,
    ...(member.package_name ? { androidPackage: member.package_name } : {}),
    website,
  };
});
// iOS release-specific links live in a separate catalog and must not be overwritten here.
// Do not construct SBP payments, login, or transfer routes.
await writeFile(
  'src/features/banks/data/bank-apps.json',
  JSON.stringify(applications, null, 2) + '\n',
);
await writeFile(
  'scripts/banks/provenance/apps.json',
  JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      sources,
      scope: '30 selected popular retail banks; not an asset ranking',
      verification:
        'Registered schemes/packages and official website domains checked; bare-root app handling requires physical-device testing.',
      iosOverrides: 'src/features/banks/data/bank-apps-ios.json',
      iosVerification: 'scripts/banks/provenance/ios-apps.json',
      members: applications.map((app) => ({
        registrationNumber: app.registrationNumber,
        sourceBankName: dictionary.find((member) => member.schema === app.scheme).bankName,
      })),
    },
    null,
    2,
  ) + '\n',
);
console.log(`Prepared ${applications.length} bank app shortcuts. No payment details included.`);
