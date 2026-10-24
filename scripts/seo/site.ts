import type { Plugin } from 'vite';

export const DEFAULT_SITE_URL = 'https://percenta.ru';

/** A single public origin prevents duplicate Firebase/custom-domain search results. */
export function siteOrigin(value = DEFAULT_SITE_URL): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  ) {
    throw new Error('SITE_URL должен быть публичным HTTPS-адресом без пути и параметров.');
  }
  return url.origin;
}

export function searchAssets(origin: string) {
  const home = `${origin}/`;
  return {
    'robots.txt': [
      'User-agent: *',
      'Allow: /',
      'Disallow: /assets/',
      'Disallow: /ocr/',
      'Disallow: /banks/',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n'),
    'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${home}</loc></url></urlset>\n`,
  };
}

export function seoPlugin(value?: string): Plugin {
  const origin = siteOrigin(value || DEFAULT_SITE_URL);
  return {
    name: 'percenta-seo',
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: `${origin}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: `${origin}/` }, injectTo: 'head' },
        ...['og:image', 'twitter:image'].map((name) => ({
          tag: 'meta',
          attrs: {
            [name.startsWith('og:') ? 'property' : 'name']: name,
            content: `${origin}/social-card.png`,
          },
          injectTo: 'head' as const,
        })),
      ];
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(searchAssets(origin))) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const assets = searchAssets(origin);
        const asset = request.url?.split('?')[0].slice(1);
        if (!asset || !(asset in assets)) return next();
        response.setHeader(
          'Content-Type',
          asset.endsWith('.xml') ? 'application/xml' : 'text/plain; charset=utf-8',
        );
        response.end(assets[asset as keyof typeof assets]);
      });
    },
  };
}
