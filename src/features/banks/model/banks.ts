import catalog from '../data/banks.json';
import { normalizeBankName } from './bank-names';

export interface Bank {
  id: string;
  name: string;
  aliases: string[];
  current: boolean;
  logo?: string;
  registrationNumber?: string;
}

export const BANKS: readonly Bank[] = catalog;
const byName = new Map<string, Bank | null>();
const exactKey = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gu, '');
const byExactName = new Map<string, Bank | null>();
for (const bank of BANKS) {
  for (const alias of [bank.name, ...bank.aliases]) {
    const exact = exactKey(alias);
    const exactMatch = byExactName.get(exact);
    byExactName.set(exact, exactMatch !== undefined && exactMatch?.id !== bank.id ? null : bank);
    const key = normalizeBankName(alias);
    if (!key) continue;
    // Ambiguous aliases must not silently display the wrong logo.
    const existing = byName.get(key);
    byName.set(key, existing !== undefined && existing?.id !== bank.id ? null : bank);
  }
}

export function findBank(value: string): Bank | undefined {
  const exact = exactKey(value);
  if (byExactName.has(exact)) return byExactName.get(exact) ?? undefined;
  return byName.get(normalizeBankName(value)) ?? undefined;
}

export function bankSuggestions(saved: string[]): string[] {
  const names = new Map<string, string>();
  // Include the full licensed-bank registry; legacy names still resolve their logos.
  for (const bank of BANKS) if (bank.current) names.set(bank.id, bank.name);
  for (const name of saved) {
    const value = name.trim();
    if (value)
      names.set(
        findBank(value)?.id ?? (normalizeBankName(value) || value.toLocaleLowerCase('ru')),
        value,
      );
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'ru'));
}
