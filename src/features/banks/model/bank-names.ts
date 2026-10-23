/** Match complete names and explicit aliases; never guess from a substring. */
export function normalizeBankName(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gu, ' ')
    .split(/\s+/)
    .filter(
      (word) =>
        word &&
        ![
          'пао',
          'ао',
          'ооо',
          'оао',
          'зао',
          'нао',
          'нпао',
          'акб',
          'кб',
          'укб',
          'аикб',
          'киб',
          'икбр',
          'банк',
          'bank',
        ].includes(word),
    )
    .join('')
    .replace(/банк$/, '');
}
