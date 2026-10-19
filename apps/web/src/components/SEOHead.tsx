/** Public metadata shares its content with the static HTML export. */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import pages from '../lib/public-pages.json';

interface SEOHeadProps {
  title?: { en: string; fr: string };
  description?: { en: string; fr: string };
  canonicalPath?: string;
  noIndex?: boolean;
}
const ORIGIN = 'https://plainledger.ca';
const ALIASES: Record<string, string> = {
  '/qc': '/quebec', '/quebec/montréal': '/quebec/montreal',
  '/quebec/montr%C3%A9al': '/quebec/montreal',
  '/calculateur-rsde': '/tools/sred-calculator', '/store': '/', '/landing': '/',
};
const PUBLIC_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

function setMeta(name: string, value: string, property = false) {
  const attribute = property ? 'property' : 'name';
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = value;
}

export default function SEOHead({ title, description, canonicalPath, noIndex = false }: SEOHeadProps) {
  const { language } = useI18n();
  const { pathname } = useLocation();
  useEffect(() => {
    const requestedPath = (canonicalPath || pathname).replace(/\/+$/, '') || '/';
    const path = ALIASES[requestedPath] || requestedPath;
    const page = pages.find(candidate => candidate.path === path);
    const privatePage = noIndex || !page;
    const locale = language === 'en' ? 'en' : 'fr';
    const finalTitle = title?.[locale] || page?.title[locale] || 'PlainLedger';
    const finalDescription = description?.[locale] || page?.description[locale] || '';
    document.title = finalTitle;
    document.documentElement.lang = `${locale}-CA`;
    setMeta('title', finalTitle);
    setMeta('description', finalDescription);
    // Reset in both directions on public/account navigation.
    setMeta('robots', privatePage ? 'noindex, nofollow' : PUBLIC_ROBOTS);
    for (const [name, value] of Object.entries({ 'og:title': finalTitle, 'og:description': finalDescription, 'og:url': `${ORIGIN}${path}`, 'og:locale': `${locale}_CA` })) setMeta(name, value, true);
    setMeta('twitter:title', finalTitle);
    setMeta('twitter:description', finalDescription);
    setMeta('twitter:url', `${ORIGIN}${path}`);
    // The language selector uses client state, not separate crawlable language URLs.
    document.querySelectorAll('link[hreflang], meta[name="googlebot"]').forEach(node => node.remove());
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${ORIGIN}${path}`;
    document.querySelectorAll('script[data-plainledger-schema]').forEach(node => node.remove());
    if (page && !privatePage) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.plainledgerSchema = 'page';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebPage',
        '@id': `${ORIGIN}${path}#webpage`, url: `${ORIGIN}${path}`,
        name: finalTitle, description: finalDescription, inLanguage: `${locale}-CA`,
        isPartOf: { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: 'PlainLedger' },
      });
      document.head.appendChild(script);
    }
  }, [language, pathname, title, description, canonicalPath, noIndex]);
  return null;
}

export function useSEO(seo: SEOHeadProps) {
  const { language } = useI18n();
  useEffect(() => {
    const locale = language === 'en' ? 'en' : 'fr';
    if (seo.title) document.title = seo.title[locale];
    if (seo.description) setMeta('description', seo.description[locale]);
  }, [seo, language]);
}
