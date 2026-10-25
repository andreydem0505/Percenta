export function normalizeCategoryLabel(category: string): string {
  return category
    .normalize('NFKC')
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]+/gu, ' ')
    .trim();
}

// Bare fare names occur on bank screenshots without the word "taxi".
// Match the entire label so "Экономика" or "Бизнес-услуги" stay unrelated.
const taxiFare = new RegExp(
  `^(?:(?:тариф|класс) )?(?:${[
    'эконом(?: ?плюс)?',
    'econom(?:y)?(?: ?plus)?',
    'комфорт(?: ?плюс)?',
    'comfort(?: ?plus)?',
    'бизнес',
    'business',
    'премьер',
    'premier',
    'элит',
    'elite',
    'ультима',
    'ultima',
    'круиз',
    'cruise',
    'минивэн',
    'minivan',
  ].join('|')})$`,
  'u',
);

/** Used by search and visual hints; saved labels remain unchanged. */
export function isTaxiFareCategory(category: string): boolean {
  return taxiFare.test(normalizeCategoryLabel(category));
}

/** Recognise broad cashback labels without renaming or merging the saved category. */
export function isAllPurchases(category: string): boolean {
  const text = normalizeCategoryLabel(category);
  if (/(?:^| )не (?:(?:на|за) )?(?:все|всех|любые|любых|каждую|любую)(?: |$)/.test(text))
    return false;
  return [
    /(?:^| )(?:все|любые) (?:покупки|платежи|траты|расходы|товары|категории)(?: |$)/,
    /(?:^| )(?:всех|любых) (?:покупок|покупках|платежей|платежах|тратах|трат|расходов|расходах|товаров|категориях|категорий)(?: |$)/,
    /(?:^| )(?:каждую|любую) (?:покупку|оплату)(?: |$)/,
    /(?:^| )(?:на|за) все(?: остальное)?$/,
    /(?:^| )(?:остальные|прочие|другие) (?:покупки|траты|расходы|категории)(?: |$)/,
    /^(?:базовый|стандартный|обычный) к[эе]шб[эе]к$/,
    /^(?:к[эе]шб[эе]к )?(?:везде|во всех магазинах|в любых магазинах)$/,
    /(?:^| )(?:all purchases|all spending|any purchase|any purchases)(?: |$)/,
  ].some((pattern) => pattern.test(text));
}
