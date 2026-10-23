import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, searchAssets, siteOrigin } from './site';

describe('публичный адрес и индексирование', () => {
  it('использует текущий адрес и позволяет заменить его собственным доменом', () => {
    expect(siteOrigin()).toBe(DEFAULT_SITE_URL);
    expect(siteOrigin('https://карточки.рф/')).toMatch(/^https:\/\/xn--/);
    expect(siteOrigin('https://example.org/')).toBe('https://example.org');
  });
  it.each([
    'http://example.org',
    'https://example.org/app',
    'https://example.org/?q=x',
    'https://example.org/#x',
    'https://user:password@example.org',
    'https://localhost',
    'invalid',
  ])('отклоняет неверный адрес %s', (value) => {
    expect(() => siteOrigin(value)).toThrow();
  });
  it('включает только публичную главную и согласованный адрес sitemap', () => {
    const assets = searchAssets('https://example.org');
    expect(assets['robots.txt']).toContain('Sitemap: https://example.org/sitemap.xml');
    const xml = new DOMParser().parseFromString(assets['sitemap.xml'], 'application/xml');
    expect(xml.querySelector('parsererror')).toBeNull();
    expect([...xml.querySelectorAll('loc')].map((node) => node.textContent)).toEqual([
      'https://example.org/',
    ]);
    expect(assets['sitemap.xml']).not.toContain('cashback.offers');
  });
});
