import { readFileSync } from 'node:fs';

export const pages = JSON.parse(readFileSync(new URL('../src/lib/public-pages.json', import.meta.url), 'utf8'));
const origin = 'https://plainledger.ca';
const escape = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function renderPublicPage(template, page) {
  const title = page.title.fr;
  const description = page.description.fr;
  let html = template.replace(/<title>.*?<\/title>/s, `<title>${escape(title)}</title>`);
  for (const [name, attribute, value] of [
    ['title', 'name', title], ['description', 'name', description],
    ['og:title', 'property', title], ['og:description', 'property', description],
    ['twitter:title', 'name', title], ['twitter:description', 'name', description],
    ['twitter:url', 'name', origin + page.path],
    ['og:url', 'property', origin + page.path], ['og:locale', 'property', 'fr_CA'],
  ]) {
    html = html.replace(new RegExp(`(<meta ${attribute}="${name}" content=")[^"]*("\\s*/>)`), (_, before, after) => before + escape(value) + after);
  }
  html = html.replace(/(<link rel="canonical" href=")[^"]*("\s*\/>)/, (_, before, after) => before + origin + page.path + after);
  const navigation = pages.map(entry => `<li><a href="${entry.path}">${escape(entry.title.fr)}</a></li>`).join('');
  const content = `<div id="root"><main><h1>${escape(title)}</h1><p>${escape(description)}</p><section lang="en-CA"><h2>${escape(page.title.en)}</h2><p>${escape(page.description.en)}</p></section><nav aria-label="Pages publiques"><ul>${navigation}</ul></nav></main></div>`;
  html = html.replace(/<!-- public-content:start -->[\s\S]*?<!-- public-content:end -->/, `<!-- public-content:start -->${content}<!-- public-content:end -->`);
  const schema = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    '@id': origin + page.path + '#webpage', url: origin + page.path,
    name: title, description, inLanguage: ['fr-CA', 'en-CA'],
    isPartOf: { '@type': 'WebSite', '@id': origin + '/#website', name: 'PlainLedger', url: origin + '/' },
  };
  return html.replace('</head>', `<script type="application/ld+json" data-plainledger-schema="page">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>\n  </head>`);
}

/** Emit public HTML before the PWA plugin computes its precache revisions.
 * @returns {import('vite').Plugin}
 */
export function publicPagesPlugin() {
  return {
    name: 'plainledger-public-pages', enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') throw new Error('Public export requires index.html');
      const template = String(index.source);
      for (const page of pages) {
        const source = renderPublicPage(template, page);
        if (page.path === '/') index.source = source;
        else this.emitFile({ type: 'asset', fileName: `${page.path.slice(1)}.html`, source });
      }
    },
  };
}
