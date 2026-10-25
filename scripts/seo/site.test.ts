import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applicationSchema, DEFAULT_SITE_URL, searchAssets, siteOrigin, siteSchema } from './site';

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
  it('разрешает обход ресурсов приложения и объединяет адреса с метками переходов', () => {
    const robots = searchAssets(DEFAULT_SITE_URL)['robots.txt'];
    const forbidden = robots
      .split('\n')
      .filter((line) => line.startsWith('Disallow:'))
      .map((line) => line.slice('Disallow:'.length).trim());
    for (const resource of [
      '/',
      '/assets/index.js',
      '/assets/index.css',
      '/fonts/onest-variable.ttf',
      '/favicon.svg',
      '/social-card.png',
      '/yandex_4c648a8c695f9bba.html',
    ])
      expect(
        forbidden.some((prefix) => resource.startsWith(prefix)),
        resource,
      ).toBe(false);
    expect(robots).toMatch(/^Clean-param: .*utm_source.*yclid.* \/$/m);
  });
  it('указывает один домен для приложения и его структурированных данных', () => {
    const schema = applicationSchema('https://example.org');
    expect(schema.url).toBe('https://example.org/');
    expect(schema['@id']).toBe('https://example.org/#app');
    expect(schema.image).toBe('https://example.org/social-card.png');
    expect(schema['@type']).toBe('WebApplication');
    expect(schema.isAccessibleForFree).toBe(true);
    expect(schema.offers.price).toBe('0');
  });
  it.each([DEFAULT_SITE_URL, 'https://example.org'])(
    'связывает название сайта и приложение с основным адресом %s',
    (origin) => {
      const schema = siteSchema(origin);
      const website = schema['@graph'].find((node) => node['@type'] === 'WebSite');
      const application = schema['@graph'].find((node) => node['@type'] === 'WebApplication');
      expect(website).toMatchObject({
        '@id': `${origin}/#website`,
        name: 'Percenta',
        url: `${origin}/`,
        mainEntity: { '@id': `${origin}/#app` },
      });
      expect(application).toMatchObject({
        '@id': `${origin}/#app`,
        url: website?.url,
        isPartOf: { '@id': website?.['@id'] },
      });
      // No fictional rating or SearchAction for a private, local-only category search.
      expect(JSON.stringify(schema)).not.toMatch(/aggregateRating|ratingCount|SearchAction/);
    },
  );
  it('оставляет описание сервиса вне заменяемого React-корня, доступным без JavaScript', () => {
    const html = readFileSync('index.html', 'utf8');
    const document = new DOMParser().parseFromString(html, 'text/html');
    const root = document.getElementById('root');
    const information = document.querySelector('footer.site-info');
    expect(information).not.toBeNull();
    expect(root?.contains(information)).toBe(false);
    expect(information?.textContent).toContain('приложение для учёта кэшбэка');
    expect(information?.querySelector('details > summary')?.textContent).toContain(
      'Как сравнивать',
    );
    expect(information?.querySelectorAll('h3')).toHaveLength(4);
    expect(document.title).toContain('Категории кэшбэка банков');
  });
  it('не подменяет неизвестные страницы главной с успешным HTTP-ответом', () => {
    const { hosting } = JSON.parse(readFileSync('firebase.json', 'utf8'));
    expect(hosting.rewrites ?? []).toEqual([]);
    expect(hosting.redirects).toContainEqual({
      source: '/index.html',
      destination: '/',
      type: 301,
    });
    const html = readFileSync('public/404.html', 'utf8');
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex',
    );
    expect(document.querySelector('a')?.getAttribute('href')).toBe('/');
  });
});
