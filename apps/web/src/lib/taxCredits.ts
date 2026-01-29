/**
 * Tax Credits Frontend Library
 *
 * Frontend-ready tax credit data and helper functions.
 */

export type TaxCreditId =
  | 'sred'
  | 'clean_tech'
  | 'apprenticeship'
  | 'training_credit'
  | 'cric'
  | 'cdae'
  | 'oidmtc'
  | 'ommitc';

export type EligibilityStatus = 'likely' | 'possible' | 'unlikely' | 'needs_review';

export interface TaxCredit {
  id: TaxCreditId;
  name: { en: string; fr: string };
  shortName: { en: string; fr: string };
  jurisdiction: 'federal' | 'provincial';
  province?: string;
  creditType: 'refundable' | 'non-refundable' | 'both';
  industries: string[] | 'all';
  maxBenefit: {
    type: 'percentage' | 'fixed' | 'formula';
    value: number | string;
    description: { en: string; fr: string };
  };
  documentationUrl: string;
  partnerReferralEnabled: boolean;
  description: { en: string; fr: string };
}

export interface TaxCreditEligibility {
  taxCredit: TaxCredit;
  eligibilityStatus: EligibilityStatus;
  eligibilityScore: number;
  criteriaMet: string[];
  criteriaNotMet: string[];
  estimatedBenefitMin: number;
  estimatedBenefitMax: number;
  calculationTimestamp: string;
}

// Simplified tax credit data for frontend display
export const TAX_CREDITS: TaxCredit[] = [
  {
    id: 'sred',
    name: {
      en: 'Scientific Research and Experimental Development Tax Credit',
      fr: 'Crédit d\'impôt pour la recherche scientifique et le développement expérimental',
    },
    shortName: { en: 'SR&ED', fr: 'RSDE' },
    jurisdiction: 'federal',
    creditType: 'refundable',
    industries: ['technology', 'manufacturing', 'professional_services', 'healthcare'],
    maxBenefit: {
      type: 'percentage',
      value: 35,
      description: {
        en: 'Up to 35% refundable credit on eligible R&D expenditures',
        fr: 'Jusqu\'à 35% de crédit remboursable sur les dépenses admissibles en R-D',
      },
    },
    documentationUrl: 'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program',
    partnerReferralEnabled: true,
    description: {
      en: 'Canada\'s largest R&D tax credit program, providing refundable credits for scientific research and experimental development activities.',
      fr: 'Le plus grand programme de crédit d\'impôt R-D du Canada, offrant des crédits remboursables pour les activités de recherche scientifique et de développement expérimental.',
    },
  },
  {
    id: 'cric',
    name: {
      en: 'Tax Credit for Research, Innovation and Commercialization',
      fr: 'Crédit d\'impôt pour la recherche, l\'innovation et la commercialisation',
    },
    shortName: { en: 'CRIC', fr: 'CRIC' },
    jurisdiction: 'provincial',
    province: 'QC',
    creditType: 'refundable',
    industries: ['technology', 'manufacturing', 'professional_services'],
    maxBenefit: {
      type: 'percentage',
      value: 30,
      description: {
        en: '20% base rate, 30% enhanced rate for up to $1M in eligible expenditures',
        fr: 'Taux de base de 20%, taux majoré de 30% pour jusqu\'à 1 M$ de dépenses admissibles',
      },
    },
    documentationUrl: 'https://www.revenuquebec.ca/en/businesses/support-programs-for-businesses/tax-credit-for-research-innovation-and-commercialization/',
    partnerReferralEnabled: true,
    description: {
      en: 'Quebec\'s flagship R&D tax credit, replacing previous RSDE and IDCI programs.',
      fr: 'Le crédit d\'impôt R-D phare du Québec, remplaçant les programmes RSDE et IDCI précédents.',
    },
  },
  {
    id: 'cdae',
    name: {
      en: 'Tax Credit for E-Business Development',
      fr: 'Crédit d\'impôt pour le développement du commerce électronique',
    },
    shortName: { en: 'CDAE', fr: 'CDAE' },
    jurisdiction: 'provincial',
    province: 'QC',
    creditType: 'refundable',
    industries: ['technology'],
    maxBenefit: {
      type: 'percentage',
      value: 30,
      description: {
        en: '30% of eligible salaries, max $25,000 per employee',
        fr: '30% des salaires admissibles, max 25 000 $ par employé',
      },
    },
    documentationUrl: 'https://www.investquebec.com/quebec/fr/financement-entreprises/programmes-aide-financiere/credit-impot-developpement-commerce-electronique.html',
    partnerReferralEnabled: true,
    description: {
      en: 'Refundable tax credit for Quebec IT companies with 6+ technical employees.',
      fr: 'Crédit d\'impôt remboursable pour les entreprises TI québécoises avec 6+ employés techniques.',
    },
  },
  {
    id: 'oidmtc',
    name: {
      en: 'Ontario Interactive Digital Media Tax Credit',
      fr: 'Crédit d\'impôt ontarien pour les médias numériques interactifs',
    },
    shortName: { en: 'OIDMTC', fr: 'OIDMTC' },
    jurisdiction: 'provincial',
    province: 'ON',
    creditType: 'refundable',
    industries: ['technology'],
    maxBenefit: {
      type: 'percentage',
      value: 40,
      description: {
        en: '40% on eligible Ontario labour, no annual cap',
        fr: '40% sur la main-d\'œuvre ontarienne admissible, aucun plafond annuel',
      },
    },
    documentationUrl: 'https://www.ontariocreates.ca/tax-incentives/oidmtc',
    partnerReferralEnabled: true,
    description: {
      en: 'Refundable tax credit for qualifying corporations developing interactive digital media products in Ontario.',
      fr: 'Crédit d\'impôt remboursable pour les sociétés admissibles développant des produits de médias numériques interactifs en Ontario.',
    },
  },
  {
    id: 'ommitc',
    name: {
      en: 'Ontario Made Manufacturing Investment Tax Credit',
      fr: 'Crédit d\'impôt ontarien pour l\'investissement manufacturier',
    },
    shortName: { en: 'OMMITC', fr: 'OMMITC' },
    jurisdiction: 'provincial',
    province: 'ON',
    creditType: 'refundable',
    industries: ['manufacturing'],
    maxBenefit: {
      type: 'percentage',
      value: 15,
      description: {
        en: '15% refundable credit on eligible manufacturing investments, max $3M per year',
        fr: '15% de crédit remboursable sur les investissements manufacturiers admissibles, max 3 M$ par année',
      },
    },
    documentationUrl: 'https://www.ontario.ca/page/ontario-made-manufacturing-investment-tax-credit',
    partnerReferralEnabled: true,
    description: {
      en: 'Refundable tax credit for Canadian-controlled private corporations investing in manufacturing equipment and facilities in Ontario.',
      fr: 'Crédit d\'impôt remboursable pour les sociétés privées sous contrôle canadien investissant dans l\'équipement et les installations manufacturières en Ontario.',
    },
  },
  {
    id: 'apprenticeship',
    name: {
      en: 'Apprenticeship Job Creation Tax Credit',
      fr: 'Crédit d\'impôt pour la création d\'emplois d\'apprentis',
    },
    shortName: { en: 'Apprenticeship Credit', fr: 'Crédit apprentissage' },
    jurisdiction: 'federal',
    creditType: 'non-refundable',
    industries: ['construction', 'manufacturing', 'automotive'],
    maxBenefit: {
      type: 'fixed',
      value: 2000,
      description: {
        en: '$2,000 per eligible apprentice per year',
        fr: '2 000 $ par apprenti admissible par année',
      },
    },
    documentationUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/apprenticeship-job-creation-tax-credit',
    partnerReferralEnabled: false,
    description: {
      en: 'Non-refundable tax credit for employers who hire eligible apprentices in designated Red Seal trades.',
      fr: 'Crédit d\'impôt non remboursable pour les employeurs qui embauchent des apprentis admissibles dans des métiers désignés Sceau rouge.',
    },
  },
  {
    id: 'training_credit',
    name: {
      en: 'Canada Training Credit',
      fr: 'Crédit d\'impôt pour la formation du Canada',
    },
    shortName: { en: 'Training Credit', fr: 'Crédit formation' },
    jurisdiction: 'federal',
    creditType: 'refundable',
    industries: 'all',
    maxBenefit: {
      type: 'percentage',
      value: 50,
      description: {
        en: '50% of eligible training costs, up to $250 per employee per year',
        fr: '50% des coûts de formation admissibles, jusqu\'à 250 $ par employé par année',
      },
    },
    documentationUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-45300-canada-training-credit',
    partnerReferralEnabled: false,
    description: {
      en: 'Refundable credit to help cover the cost of eligible training fees for employees.',
      fr: 'Crédit remboursable pour aider à couvrir le coût des frais de formation admissibles pour les employés.',
    },
  },
  {
    id: 'clean_tech',
    name: {
      en: 'Clean Technology Investment Tax Credit',
      fr: 'Crédit d\'impôt à l\'investissement en technologies propres',
    },
    shortName: { en: 'Clean Tech ITC', fr: 'CIIP' },
    jurisdiction: 'federal',
    creditType: 'refundable',
    industries: ['manufacturing', 'technology', 'agriculture', 'transport'],
    maxBenefit: {
      type: 'percentage',
      value: 30,
      description: {
        en: '30% refundable credit on eligible clean technology equipment',
        fr: '30% de crédit remboursable sur l\'équipement de technologies propres admissible',
      },
    },
    documentationUrl: 'https://www.canada.ca/en/department-finance/services/publications/clean-technology-investment-tax-credit',
    partnerReferralEnabled: true,
    description: {
      en: 'Refundable tax credit for investments in clean technology equipment and property to support Canada\'s net-zero goals.',
      fr: 'Crédit d\'impôt remboursable pour les investissements dans l\'équipement et les biens de technologies propres pour soutenir les objectifs de carboneutralité du Canada.',
    },
  },
];

/**
 * Get tax credit by ID
 */
export function getTaxCreditById(id: TaxCreditId): TaxCredit | undefined {
  return TAX_CREDITS.find((credit) => credit.id === id);
}

/**
 * Get tax credits by industry
 */
export function getTaxCreditsByIndustry(industryId: string): TaxCredit[] {
  return TAX_CREDITS.filter((credit) => {
    if (credit.industries === 'all') return true;
    return credit.industries.includes(industryId);
  });
}

/**
 * Get tax credits by province
 */
export function getTaxCreditsByProvince(province?: string): TaxCredit[] {
  if (!province) {
    return TAX_CREDITS.filter((credit) => credit.jurisdiction === 'federal');
  }
  return TAX_CREDITS.filter(
    (credit) =>
      credit.jurisdiction === 'federal' ||
      (credit.jurisdiction === 'provincial' && credit.province === province)
  );
}

/**
 * Get tax credits by industry and province
 */
export function getTaxCreditsByIndustryAndProvince(
  industryId: string,
  province?: string
): TaxCredit[] {
  const industryCredits = getTaxCreditsByIndustry(industryId);
  return getTaxCreditsByProvince(province).filter((credit) =>
    industryCredits.includes(credit)
  );
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format eligibility status for display
 */
export function formatEligibilityStatus(status: EligibilityStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'likely':
      return {
        label: 'Likely Eligible',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      };
    case 'possible':
      return {
        label: 'Possibly Eligible',
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      };
    case 'needs_review':
      return {
        label: 'Needs Review',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      };
    case 'unlikely':
      return {
        label: 'Unlikely Eligible',
        color: 'text-gray-700 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      };
  }
}
