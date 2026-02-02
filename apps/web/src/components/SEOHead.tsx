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
    en: 'PlainLedger | AI-Powered Financial Dashboards for Canadian Businesses',
    fr: 'PlainLedger | Tableaux de bord financiers propulsés par l\'IA pour les entreprises canadiennes',
  },
  description: {
    en: 'Know your numbers. Grow your business. AI-powered dashboards with industry-specific KPIs for Canadian SMBs. Connect QuickBooks in 5 minutes. Data stored in Canada.',
    fr: 'Connaissez vos chiffres. Faites croître votre entreprise. Tableaux de bord IA avec KPIs sectoriels pour PME canadiennes. Connectez QuickBooks en 5 minutes. Données au Canada.',
  },
};

// Page-specific SEO content
const PAGE_SEO: Record<string, { title: { en: string; fr: string }; description: { en: string; fr: string } }> = {
  '/quebec': {
    title: {
      en: 'PlainLedger Quebec | CDAE & CRIC Tax Credits | Quebec Business Software',
      fr: 'PlainLedger Québec | Crédits d\'impôt CDAE & CRIC | Logiciel pour entreprises québécoises',
    },
    description: {
      en: 'Quebec business software with CDAE, CRIC, and SR&ED tax credit tracking. Investissement Québec program guidance. Data stored in Canada. Bilingual EN/FR.',
      fr: 'Logiciel pour entreprises québécoises avec suivi des crédits CDAE, CRIC et RSDE. Guide des programmes d\'Investissement Québec. Données au Canada. Bilingue EN/FR.',
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
    
  }, [language, location.pathname, title, description, canonicalPath, noIndex, isEn]);
  
  return null;
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
