/**
 * SEO Head Component
 *
 * Dynamically updates document head for SEO:
 * - Title and meta description
 * - hreflang tags for bilingual support
 * - Canonical URLs
 * - Open Graph and Twitter cards
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

interface SEOHeadProps {
  title?: { en: string; fr: string };
  description?: { en: string; fr: string };
  canonicalPath?: string;
  noIndex?: boolean;
}

// Base domain for SEO
const BASE_DOMAIN = 'https://plainledger.ca';

// Default SEO content
const DEFAULT_SEO = {
  title: {
    en: 'PlainLedger | Industry Intelligence for Canadian Entrepreneurs | AI-Powered Insights',
    fr: 'PlainLedger | Intelligence sectorielle pour entrepreneurs canadiens | Insights propulsés par l\'IA',
  },
  description: {
    en: 'The Context Intelligence Platform for Canadian SMBs. AI recommendations that compound in accuracy from 75,000+ business decisions. Industry-specific KPIs, tax credits, and benchmarks.',
    fr: 'La plateforme d\'intelligence contextuelle pour PME canadiennes. Recommandations IA qui s\'améliorent grâce à 75 000+ décisions d\'affaires. KPIs sectoriels, crédits d\'impôt et benchmarks.',
  },
};

// Page-specific SEO content
const PAGE_SEO: Record<string, { title: { en: string; fr: string }; description: { en: string; fr: string } }> = {
  '/quebec': {
    title: {
      en: 'PlainLedger Québec | Crédits d\'impôt CDAE, CRIC, RSDE | FP&A pour entrepreneurs',
      fr: 'PlainLedger Québec | Crédits d\'impôt CDAE, CRIC, RSDE | FP&A pour entrepreneurs',
    },
    description: {
      en: 'Quebec entrepreneurs: discover tax credits you\'re missing. FP&A intelligence in French. Data in Canada. Benchmarks from 75,000+ businesses.',
      fr: 'Entrepreneurs québécois: découvrez les crédits d\'impôt que vous manquez. Intelligence FP&A en français. Données au Canada. Benchmarks de 75 000+ entreprises.',
    },
  },
  '/canada': {
    title: {
      en: 'PlainLedger Canada | SR&ED Tax Credits | Canadian Business Intelligence',
      fr: 'PlainLedger Canada | Crédits d\'impôt RSDE | Intelligence d\'affaires canadienne',
    },
    description: {
      en: 'FP&A built for Canadian business. SR&ED tax credits, BDC programs, data stored in Canada. Bilingual EN/FR support. Connect QuickBooks, Xero, Sage.',
      fr: 'FP&A conçu pour les entreprises canadiennes. Crédits RSDE, programmes BDC, données au Canada. Support bilingue EN/FR. Connectez QuickBooks, Xero, Sage.',
    },
  },
  '/privacy': {
    title: {
      en: 'Privacy Policy | PlainLedger Canada',
      fr: 'Politique de confidentialité | PlainLedger Canada',
    },
    description: {
      en: 'PlainLedger privacy policy. PIPEDA compliant. Data stored in Canadian data centers. Bank-level encryption.',
      fr: 'Politique de confidentialité PlainLedger. Conforme PIPEDA. Données stockées dans des centres de données canadiens. Chiffrement bancaire.',
    },
  },
  '/terms': {
    title: {
      en: 'Terms of Service | PlainLedger Canada',
      fr: 'Conditions d\'utilisation | PlainLedger Canada',
    },
    description: {
      en: 'PlainLedger terms of service. Canadian business software platform terms and conditions.',
      fr: 'Conditions d\'utilisation PlainLedger. Termes et conditions de la plateforme logicielle canadienne.',
    },
  },
};

export default function SEOHead({ title, description, canonicalPath, noIndex = false }: SEOHeadProps) {
  const { language } = useI18n();
  const location = useLocation();
  const isEn = language === 'en';
  
  useEffect(() => {
    // Get current path without query params
    const currentPath = canonicalPath || location.pathname;
    
    // Get page-specific or default SEO
    const pageSeo = PAGE_SEO[currentPath] || DEFAULT_SEO;
    const finalTitle = title || pageSeo.title;
    const finalDescription = description || pageSeo.description;
    
    // Update document title
    document.title = isEn ? finalTitle.en : finalTitle.fr;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', isEn ? finalDescription.en : finalDescription.fr);
    }
    
    // Update canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', `${BASE_DOMAIN}${currentPath}`);
    }
    
    // Update og:url
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', `${BASE_DOMAIN}${currentPath}`);
    }
    
    // Update og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', isEn ? finalTitle.en : finalTitle.fr);
    }
    
    // Update og:description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', isEn ? finalDescription.en : finalDescription.fr);
    }
    
    // Update og:locale
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) {
      ogLocale.setAttribute('content', isEn ? 'en_CA' : 'fr_CA');
    }
    
    // Update twitter:title
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', isEn ? finalTitle.en : finalTitle.fr);
    }
    
    // Update twitter:description
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', isEn ? finalDescription.en : finalDescription.fr);
    }
    
    // Update html lang attribute
    document.documentElement.lang = isEn ? 'en-CA' : 'fr-CA';
    
    // Handle noindex
    const robotsMeta = document.querySelector('meta[name="robots"]');
    if (robotsMeta && noIndex) {
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    }
    
    // Dynamically update hreflang links
    updateHreflangLinks(currentPath);
    
    // Inject JSON-LD schemas for LLM optimization
    injectJSONLDSchemas(currentPath, isEn);
    
  }, [language, location.pathname, title, description, canonicalPath, noIndex, isEn]);
  
  return null;
}

/**
 * Inject JSON-LD schemas for LLM/AI search optimization
 */
function injectJSONLDSchemas(currentPath: string, isEn: boolean) {
  // Remove existing schemas
  const existingSchemas = document.querySelectorAll('script[type="application/ld+json"][data-plainledger-schema]');
  existingSchemas.forEach(schema => schema.remove());
  
  // FAQ Schema for landing page
  if (currentPath === '/' || currentPath === '') {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': isEn ? 'What is PlainLedger?' : 'Qu\'est-ce que PlainLedger?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': isEn 
              ? 'PlainLedger is the Context Intelligence Platform for Canadian entrepreneurs. It combines real-time financial data with AI that learns from actual business decisions to deliver industry-specific recommendations that compound in accuracy over time. Backed by 75,000+ Canadian business benchmarks.'
              : 'PlainLedger est la plateforme d\'intelligence contextuelle pour les entrepreneurs canadiens. Elle combine des données financières en temps réel avec une IA qui apprend des décisions d\'affaires réelles pour fournir des recommandations sectorielles qui s\'améliorent avec le temps. Basée sur 75 000+ benchmarks d\'entreprises canadiennes.'
          }
        },
        {
          '@type': 'Question',
          'name': isEn ? 'What tax credits can PlainLedger help me find?' : 'Quels crédits d\'impôt PlainLedger peut-il m\'aider à trouver?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': isEn
              ? 'PlainLedger identifies 20+ federal and provincial tax credits including: SR&ED (Scientific Research), CDAE (Quebec E-Business), CRIC (Quebec R&D), Clean Technology ITC, Apprenticeship credits, and industry-specific credits for film, agriculture, and manufacturing.'
              : 'PlainLedger identifie 20+ crédits d\'impôt fédéraux et provinciaux incluant: RSDE (Recherche scientifique), CDAE (Commerce électronique Québec), CRIC (R-D Québec), Crédit d\'impôt technologies propres, Crédits d\'apprentissage, et crédits sectoriels pour le cinéma, l\'agriculture et la fabrication.'
          }
        },
        {
          '@type': 'Question',
          'name': isEn ? 'How does PlainLedger\'s compounding intelligence work?' : 'Comment fonctionne l\'intelligence cumulative de PlainLedger?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': isEn
              ? 'Every business decision captured on PlainLedger makes our AI smarter for everyone in that industry. When you make a decision and see results, we track the outcome. This creates a feedback loop where recommendations become more accurate over time. Our accuracy has grown from 72% to 92% through this compounding effect.'
              : 'Chaque décision d\'affaires capturée sur PlainLedger rend notre IA plus intelligente pour tous dans cette industrie. Quand vous prenez une décision et voyez les résultats, nous suivons l\'issue. Cela crée une boucle de rétroaction où les recommandations deviennent plus précises au fil du temps. Notre précision est passée de 72% à 92% grâce à cet effet cumulatif.'
          }
        }
      ]
    };
    
    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.setAttribute('data-plainledger-schema', 'faq');
    faqScript.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(faqScript);
  }
  
  // SoftwareApplication Schema
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'PlainLedger',
    'applicationCategory': 'FinanceApplication',
    'operatingSystem': 'Web',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'CAD'
    },
    'areaServed': [
      { '@type': 'Country', 'name': 'Canada' },
      { '@type': 'State', 'name': 'Quebec' },
      { '@type': 'City', 'name': 'Montreal' }
    ],
    'availableLanguage': ['en-CA', 'fr-CA'],
    'description': isEn
      ? 'Context Intelligence Platform for Canadian entrepreneurs. AI recommendations that compound in accuracy from 75,000+ business decisions. Industry-specific KPIs, tax credits, and benchmarks.'
      : 'Plateforme d\'intelligence contextuelle pour entrepreneurs canadiens. Recommandations IA qui s\'améliorent grâce à 75 000+ décisions d\'affaires. KPIs sectoriels, crédits d\'impôt et benchmarks.'
  };
  
  const softwareScript = document.createElement('script');
  softwareScript.type = 'application/ld+json';
  softwareScript.setAttribute('data-plainledger-schema', 'software');
  softwareScript.textContent = JSON.stringify(softwareSchema);
  document.head.appendChild(softwareScript);
}

/**
 * Update hreflang links dynamically
 */
function updateHreflangLinks(currentPath: string) {
  // Remove existing dynamic hreflang links
  const existingHreflang = document.querySelectorAll('link[data-dynamic-hreflang]');
  existingHreflang.forEach(link => link.remove());
  
  // Add new hreflang links
  const hreflangLinks = [
    { hreflang: 'en-CA', href: `${BASE_DOMAIN}${currentPath}` },
    { hreflang: 'fr-CA', href: `${BASE_DOMAIN}${currentPath}?lang=fr` },
    { hreflang: 'x-default', href: `${BASE_DOMAIN}${currentPath}` },
  ];
  
  hreflangLinks.forEach(({ hreflang, href }) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    link.setAttribute('data-dynamic-hreflang', 'true');
    document.head.appendChild(link);
  });
}

/**
 * Hook to set SEO on page mount
 */
export function useSEO(seo: SEOHeadProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  useEffect(() => {
    if (seo.title) {
      document.title = isEn ? seo.title.en : seo.title.fr;
    }
    if (seo.description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', isEn ? seo.description.en : seo.description.fr);
      }
    }
  }, [seo, language, isEn]);
}
