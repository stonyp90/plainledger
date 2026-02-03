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
    en: 'PlainLedger | FP&A Intelligence for Canadian Entrepreneurs | Tax Credits & KPIs',
    fr: 'PlainLedger | Intelligence FP&A pour entrepreneurs canadiens | Crédits d\'impôt & KPIs',
  },
  description: {
    en: 'Bridge the gap between accounting and business decisions. Discover tax credits you\'re missing (SR&ED, CDAE, CRIC). IBCS-compliant reports. 75,000+ Canadian business benchmarks.',
    fr: 'Comblez l\'écart entre comptabilité et décisions d\'affaires. Découvrez les crédits d\'impôt que vous manquez (RSDE, CDAE, CRIC). Rapports certifiés IBCS. Benchmarks de 75 000+ entreprises.',
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
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', isEn ? finalDescription.en : finalDescription.fr);
    }
    
    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', `${BASE_DOMAIN}${currentPath}`);
    }
    
    // Update og:url
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', `${BASE_DOMAIN}${currentPath}`);
    }
    
    // Update og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', isEn ? finalTitle.en : finalTitle.fr);
    }
    
    // Update og:description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', isEn ? finalDescription.en : finalDescription.fr);
    }
    
    // Update og:locale
    let ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) {
      ogLocale.setAttribute('content', isEn ? 'en_CA' : 'fr_CA');
    }
    
    // Update twitter:title
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', isEn ? finalTitle.en : finalTitle.fr);
    }
    
    // Update twitter:description
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', isEn ? finalDescription.en : finalDescription.fr);
    }
    
    // Update html lang attribute
    document.documentElement.lang = isEn ? 'en-CA' : 'fr-CA';
    
    // Handle noindex
    let robotsMeta = document.querySelector('meta[name="robots"]');
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
              ? 'PlainLedger is FP&A software that bridges the gap between accounting data and business decisions. It transforms raw financial data into industry-specific KPIs, discovers tax credits (SR&ED, CDAE, CRIC), and provides IBCS-compliant reports for Canadian entrepreneurs.'
              : 'PlainLedger est un logiciel FP&A qui comble l\'écart entre les données comptables et les décisions d\'affaires. Il transforme les données financières brutes en KPIs sectoriels, découvre les crédits d\'impôt (RSDE, CDAE, CRIC) et fournit des rapports certifiés IBCS pour les entrepreneurs canadiens.'
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
          'name': isEn ? 'How does PlainLedger bridge the gap between accounting and business decisions?' : 'Comment PlainLedger comble-t-il l\'écart entre comptabilité et décisions d\'affaires?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': isEn
              ? 'PlainLedger transforms accounting jargon (balance sheets, EBITDA, working capital) into plain business language (Can I hire? Am I profitable? When will I run out of money?). It uses FP&A methodology and IBCS-compliant reporting to translate financial data into actionable insights with clear ROI.'
              : 'PlainLedger transforme le jargon comptable (bilans, EBITDA, fonds de roulement) en langage d\'affaires simple (Puis-je embaucher? Suis-je rentable? Quand vais-je manquer d\'argent?). Il utilise la méthodologie FP&A et des rapports certifiés IBCS pour traduire les données financières en insights actionnables avec un ROI clair.'
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
      ? 'FP&A software that bridges the gap between accounting and business decisions. Transform financial data into industry KPIs with clear ROI. Discover tax credits. IBCS-compliant reports.'
      : 'Logiciel FP&A qui comble l\'écart entre comptabilité et décisions d\'affaires. Transformez les données financières en KPIs sectoriels avec ROI clair. Découvrez les crédits d\'impôt. Rapports certifiés IBCS.'
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
