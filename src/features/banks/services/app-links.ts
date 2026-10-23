import {
  androidBankAppHref,
  iosBankAppLinks,
  type BankApp,
  type BankAppLink,
  type MobilePlatform,
} from '../model/bank-apps';

export const BANK_APP_PREFERENCES_KEY = 'cashback.bank-apps.v1';
function savedLinks(): Record<string, string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BANK_APP_PREFERENCES_KEY) ?? 'null');
    if (
      value &&
      typeof value === 'object' &&
      'version' in value &&
      value.version === 1 &&
      'links' in value &&
      value.links &&
      typeof value.links === 'object' &&
      !Array.isArray(value.links)
    )
      return value.links as Record<string, string>;
  } catch {
    /* Opening an app must still work when storage is unavailable. */
  }
  return {};
}

export function preferredIosBankAppLink(app: BankApp): BankAppLink | undefined {
  const links = iosBankAppLinks(app);
  const saved = savedLinks()[app.registrationNumber];
  // A saved value selects a catalog entry; it can never supply an arbitrary URL.
  return links.find((link) => link.id === saved) ?? links[0];
}

export function rememberIosBankAppLink(app: BankApp, id: string): void {
  if (!iosBankAppLinks(app).some((link) => link.id === id)) return;
  try {
    localStorage.setItem(
      BANK_APP_PREFERENCES_KEY,
      JSON.stringify({
        version: 1,
        links: { ...savedLinks(), [app.registrationNumber]: id },
      }),
    );
  } catch {
    /* Opening the bank still works; only remembering the choice is skipped. */
  }
}

export function bankAppTarget(app: BankApp, platform: MobilePlatform): BankAppLink | undefined {
  if (platform === 'android')
    return { id: 'android', label: app.name, href: androidBankAppHref(app) };
  return preferredIosBankAppLink(app);
}

export function bankAppHref(app: BankApp, platform: 'android'): string;
export function bankAppHref(app: BankApp, platform: MobilePlatform): string | undefined;
export function bankAppHref(app: BankApp, platform: MobilePlatform): string | undefined {
  return bankAppTarget(app, platform)?.href;
}
