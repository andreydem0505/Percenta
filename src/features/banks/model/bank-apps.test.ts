import {
  BANK_APP_PREFERENCES_KEY,
  bankAppHref,
  rememberIosBankAppLink,
} from '../services/app-links';
import { describe, expect, it, vi } from 'vitest';
import { BANKS } from './banks';
import siriusMetadata from '../../../../tests/fixtures/bank-links/sirius-2.0.1.json';
import ozonAssociation from '../../../../tests/fixtures/bank-links/ozon-onelink-aasa.json';
import otpHomeRoute from '../../../../tests/fixtures/bank-links/otp-home-route.json';
import { BANK_APPS, getBankApp, iosBankAppLinks, mobilePlatform } from './bank-apps';

describe('ссылки в банковские приложения', () => {
  it('содержит 30 разных розничных банков с локальными схемами и HTTPS-резервом', () => {
    expect(BANK_APPS).toHaveLength(30);
    expect(new Set(BANK_APPS.map((app) => app.registrationNumber)).size).toBe(30);
    for (const app of BANK_APPS) {
      expect(
        BANKS.some((bank) => bank.current && bank.registrationNumber === app.registrationNumber),
      ).toBe(true);
      expect(app.scheme).toMatch(/^bank\d{12}$/);
      expect(new URL(app.website).protocol).toBe('https:');
      expect(new URL(app.website).search).toBe('');
      for (const link of iosBankAppLinks(app)) {
        const url = new URL(link.href);
        if (url.protocol === 'https:') {
          const httpsHosts: Record<string, string> = {
            '3542': 'bank-ozon.onelink.me',
            '963': 'halvacard.ru',
          };
          expect(url.hostname).toBe(httpsHosts[app.registrationNumber]);
        } else expect(url.protocol).not.toMatch(/^https?:$/);
        expect(link.href).not.toMatch(/payment|sso|invoice|redirect|\?/i);
      }
      expect(bankAppHref(app, 'other')).toBe(bankAppHref(app, 'ios'));
      const intent = bankAppHref(app, 'android');
      expect(intent).toContain(`scheme=${app.scheme};`);
      expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(app.website)};end`);
      expect(intent).not.toMatch(/sum=|qr\.nspk\.ru|payment|redirect_uri|category=/);
    }
  });
  it.each([
    ['Сбер', 'Сбербанк'],
    ['Тинькофф', 'Т-Банк'],
    ['Alfa Bank', 'Альфа-Банк'],
    ['Яндекс Пэй', 'Яндекс Банк'],
    ['Вайлдберриз', 'WB Банк'],
  ])('поддерживает сохранённое имя %s', (alias, name) => {
    expect(getBankApp(alias)?.name).toBe(name);
  });
  it('не строит ссылки из неизвестного текста пользователя и не путает два АТБ', () => {
    expect(getBankApp('javascript:alert(1)')).toBeUndefined();
    expect(getBankApp('Сбер будущего')).toBeUndefined();
    expect(getBankApp('Мой банк')).toBeUndefined();
    expect(getBankApp('ООО «АТБ» Банк')).toBeUndefined();
    expect(getBankApp('Азиатско-Тихоокеанский Банк')?.registrationNumber).toBe('1810');
  });
  it('прикрепляет известный Android-пакет и не выдумывает отсутствующий', () => {
    expect(bankAppHref(getBankApp('Сбер')!, 'android')).toContain('package=ru.sberbankmobile;');
    expect(bankAppHref(getBankApp('Ozon Банк')!, 'android')).not.toContain('package=');
    expect(bankAppHref(getBankApp('ВТБ')!, 'android')).toContain('scheme=bank110000000005;');
    expect(bankAppHref(getBankApp('Сбер')!, 'other')).toBe('sberbankonline://');
  });
  it.each([
    ['Сбер', 'sberbankonline://'],
    ['Тинькофф', 'tinkoffbank://Main'],
    ['Альфа-Банк', 'kluch://'],
    ['Alfa Bank', 'kluch://'],
    ['ОТП Банк', 'otp://ru.otpbank.mobile/toMain'],
    ['ВТБ', 'sirius://siriusapp.com/i/welcomes'],
    ['Озон Банк', 'https://bank-ozon.onelink.me/JbZg/'],
  ])('использует отдельный iPhone-адрес для %s', (bank, href) => {
    expect(bankAppHref(getBankApp(bank)!, 'ios')).toBe(href);
  });
  it('запоминает выпуск на устройстве и не меняет ссылку другого банка или Android', () => {
    const sber = getBankApp('Сбер')!;
    rememberIosBankAppLink(sber, 'sbolonline');
    expect(bankAppHref(getBankApp('Sberbank')!, 'ios')).toBe('sbolonline://');
    expect(bankAppHref(getBankApp('Альфа')!, 'ios')).toBe('kluch://');
    expect(bankAppHref(sber, 'android')).toContain('scheme=bank100000000111;');
    expect(JSON.parse(localStorage.getItem(BANK_APP_PREFERENCES_KEY)!)).toEqual({
      version: 1,
      links: { '1481': 'sbolonline' },
    });
  });
  it('игнорирует повреждённый выбор, посторонний URL и неизвестную версию хранилища', () => {
    const app = getBankApp('Альфа')!;
    for (const value of [
      '{bad',
      JSON.stringify({ version: 2, links: { '1326': 'alfabank' } }),
      JSON.stringify({ version: 1, links: { '1326': 'https://example.com' } }),
    ]) {
      localStorage.setItem(BANK_APP_PREFERENCES_KEY, value);
      expect(bankAppHref(app, 'ios')).toBe('kluch://');
    }
    rememberIosBankAppLink(app, 'https://example.com');
    expect(bankAppHref(app, 'ios')).toBe('kluch://');
  });
  it('открывает прямую ссылку даже при запрете хранилища', () => {
    const app = getBankApp('Альфа')!;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => rememberIosBankAppLink(app, 'alfabank')).not.toThrow();
    expect(bankAppHref(app, 'ios')).toBe('kluch://');
  });
  it('определяет iPhone и iPad при сокращённом user-agent', () => {
    expect(mobilePlatform('Safari', 5, 'iPhone')).toBe('ios');
    expect(mobilePlatform('Safari', 5, 'MacIntel')).toBe('ios');
  });
  it.each(['ВТБ', 'Ozon Банк'])(
    'возвращает новую ссылку %s даже при старом сохранённом выборе СБП',
    (bank) => {
      const app = getBankApp(bank)!;
      localStorage.setItem(
        BANK_APP_PREFERENCES_KEY,
        JSON.stringify({
          version: 1,
          links: { [app.registrationNumber]: app.scheme },
        }),
      );
      expect(iosBankAppLinks(app)).toHaveLength(1);
      expect(bankAppHref(app, 'ios')).toBe(iosBankAppLinks(app)[0].href);
      expect(bankAppHref(app, 'ios')).not.toBe(`${app.scheme}://`);
      expect(bankAppHref(app, 'ios')).not.toBe(app.website);
      expect(bankAppHref(app, 'other')).toBe(bankAppHref(app, 'ios'));
      expect(bankAppHref(app, 'android')).toContain(`scheme=${app.scheme};`);
    },
  );
  it.each(['Совкомбанк', 'Халва', 'Sovcombank'])(
    'направляет %s в официальный веб-банк на iPhone, сохраняя Android-приложение',
    (bank) => {
      const app = getBankApp(bank)!;
      localStorage.setItem(
        BANK_APP_PREFERENCES_KEY,
        JSON.stringify({ version: 1, links: { '963': 'bank100000000013' } }),
      );
      expect(bankAppHref(app, 'ios')).toBe('https://halvacard.ru/lk');
      expect(iosBankAppLinks(app)[0].webApp).toBe(true);
      expect(bankAppHref(app, 'android')).toContain('scheme=bank100000000013;');
      expect(bankAppHref(app, 'android')).toContain('package=ru.sovcomcard.halva.v1;');
    },
  );
  it('схема Сириуса объявлена в извлечённом Info.plist именно этого выпуска', () => {
    const link = bankAppHref(getBankApp('ВТБ')!, 'ios')!;
    const scheme = new URL(link).protocol.slice(0, -1);
    expect(siriusMetadata.CFBundleDisplayName).toBe('Сириус');
    expect(siriusMetadata.CFBundleURLTypes.flatMap((entry) => entry.CFBundleURLSchemes)).toContain(
      scheme,
    );
    expect(scheme).not.toMatch(/^bank/);
  });
  it('передаёт полный встроенный маршрут Сириуса вместо зависающего пустого корня', () => {
    const app = getBankApp('ВТБ')!;
    // Existing users may have selected this ID before its URI was corrected.
    rememberIosBankAppLink(app, 'sirius');
    const href = bankAppHref(app, 'ios')!;
    const url = new URL(href);
    expect(href).toBe(siriusMetadata.routeEvidence.urlString.value);
    expect(url.hostname).toBe(siriusMetadata.routeEvidence.adjacentDecoderConstants.at(-1));
    expect(url.pathname).toBe(`/i/${siriusMetadata.routeEvidence.adjacentScreenId}`);
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
    expect(href).not.toBe('sirius://');
  });
  it('передаёт маршрут главного экрана ОТП вместо пустого корня или сайта', () => {
    const href = bankAppHref(getBankApp('ОТП Банк')!, 'ios')!;
    const url = new URL(href);
    const evidence = otpHomeRoute.nativeRouteEvidence;
    expect(url.protocol).toBe('otp:');
    expect(url.hostname).toBe(new URL(evidence.nativeBaseConstant).hostname);
    expect(url.pathname).toBe(evidence.route);
    expect(evidence.processorName).toBe('MainDeeplinkProcessor');
    expect(href).not.toBe(otpHomeRoute.nativeBaseOnly);
    expect(href).not.toMatch(/^https?:/);
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });
  it('путь Ozon Universal Link принадлежит только банковскому iOS-приложению в AASA', () => {
    const url = new URL(bankAppHref(getBankApp('Ozon Банк')!, 'ios')!);
    const owners = ozonAssociation.applinks.details
      .filter((app) =>
        app.paths.some((path) =>
          path.endsWith('*') ? url.pathname.startsWith(path.slice(0, -1)) : url.pathname === path,
        ),
      )
      .map((app) => app.appID);
    expect(url.origin).toBe('https://bank-ozon.onelink.me');
    expect(owners).toEqual(['29PJ6W9657.ru.ozon.fintech.finance']);
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });
  it.each(['bank100000000018', 'otp-mobile', 'otp-universal'])(
    'заменяет старый выбор ОТП %s входной ссылкой банка',
    (oldId) => {
      const app = getBankApp('ОТП Банк')!;
      localStorage.setItem(
        BANK_APP_PREFERENCES_KEY,
        JSON.stringify({
          version: 1,
          links: { '2766': oldId },
        }),
      );
      expect(bankAppHref(app, 'ios')).toBe('otp://ru.otpbank.mobile/toMain');
      expect(bankAppHref(app, 'ios')).not.toBe(otpHomeRoute.nativeBaseOnly);
      expect(bankAppHref(app, 'android')).toContain('scheme=bank100000000018;');
    },
  );
  it.each([
    ['Mozilla/5.0 (Linux; Android 14)', 5, 'android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 5, 'ios'],
    ['Mozilla/5.0 (iPad; CPU OS 18_0)', 5, 'ios'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5, 'ios'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0, 'other'],
    ['Mozilla/5.0 (Windows NT 10.0)', 0, 'other'],
  ] as const)('определяет платформу %s', (agent, touch, expected) => {
    expect(mobilePlatform(agent, touch)).toBe(expected);
  });
});
