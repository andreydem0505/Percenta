import hues from '../data/bank-colors.json';
import { findBank } from './banks';

export interface BankColors {
  foreground: string;
  background: string;
}

const logoHues: Readonly<Record<string, number | null>> = hues;
const neutralColors: BankColors = { foreground: '#535f6c', background: '#eef0f3' };

export function bankColors(name: string): BankColors {
  const bank = findBank(name);
  const hue = bank ? logoHues[bank.id] : undefined;
  if (typeof hue !== 'number') return neutralColors;
  return {
    foreground: `hsl(${hue} 28% 34%)`,
    background: `hsl(${hue} 45% 94%)`,
  };
}
