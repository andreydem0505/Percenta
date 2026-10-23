import applications from '../data/bank-apps.json';
import iosApplications from '../data/bank-apps-ios.json';
import { findBank } from './banks';

export interface BankApp {
  registrationNumber: string;
  name: string;
  scheme: string;
  androidPackage?: string;
  website: string;
}
export const BANK_APPS: readonly BankApp[] = applications;
const byRegistration = new Map(BANK_APPS.map((app) => [app.registrationNumber, app]));
export interface BankAppLink {
  id: string;
  label: string;
  href: string;
  /** Explicit web bank, distinct from an HTTPS Universal Link into a native app. */
  webApp?: boolean;
}
const iosByRegistration = new Map(
  iosApplications.map((app) => [app.registrationNumber, app.links]),
);
export function iosBankAppLinks(app: BankApp): readonly BankAppLink[] {
  // An explicit empty override disables a reported broken route; never restore its SBP root.
  return (
    iosByRegistration.get(app.registrationNumber) ?? [
      { id: app.scheme, label: app.name, href: `${app.scheme}://` },
    ]
  );
}

export function getBankApp(bank: string): BankApp | undefined {
  const registration = findBank(bank)?.registrationNumber;
  return registration ? byRegistration.get(registration) : undefined;
}

export type MobilePlatform = 'android' | 'ios' | 'other';
export function mobilePlatform(
  userAgent: string,
  maxTouchPoints = 0,
  platform = '',
): MobilePlatform {
  if (/android/i.test(userAgent)) return 'android';
  if (
    /iphone|ipad|ipod/i.test(`${userAgent} ${platform}`) ||
    (/macintosh|macintel/i.test(`${userAgent} ${platform}`) && maxTouchPoints > 1)
  )
    return 'ios';
  return 'other';
}

export function androidBankAppHref(app: BankApp): string {
  const packageName = app.androidPackage ? `package=${app.androidPackage};` : '';
  return `intent://#Intent;scheme=${app.scheme};${packageName}S.browser_fallback_url=${encodeURIComponent(app.website)};end`;
}
