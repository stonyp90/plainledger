/**
 * Tax Credit Definitions
 *
 * Comprehensive database of Canadian federal and provincial tax credits
 * with eligibility criteria and industry relevance.
 */

import { IndustryId } from "./industry-account-mapping";

export type CanadianProvince =
  | "AB" // Alberta
  | "BC" // British Columbia
  | "MB" // Manitoba
  | "NB" // New Brunswick
  | "NL" // Newfoundland and Labrador
  | "NS" // Nova Scotia
  | "NT" // Northwest Territories
  | "NU" // Nunavut
  | "ON" // Ontario
  | "PE" // Prince Edward Island
  | "QC" // Quebec
  | "SK" // Saskatchewan
  | "YT"; // Yukon

export type TaxCreditId = string;
export type EligibilityStatus =
  | "likely"
  | "possible"
  | "unlikely"
  | "needs_review";

export interface EligibilityCriterion {
  id: string;
  metricKey: string; // from FactMonthlyMetrics or account categories
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "between" | "exists";
  value: number | [number, number] | boolean;
  weight: number; // for scoring likelihood (0-100)
  description: { en: string; fr: string };
  isRequired?: boolean; // if true, failing this makes credit ineligible
}

export interface TaxCredit {
  id: TaxCreditId;
  name: { en: string; fr: string };
  shortName: { en: string; fr: string };
  jurisdiction: "federal" | "provincial";
  province?: CanadianProvince; // null for federal
  creditType: "refundable" | "non-refundable" | "both";
  industries: IndustryId[] | "all";
  maxBenefit: {
    type: "percentage" | "fixed" | "formula";
    value: number | string;
    description: { en: string; fr: string };
  };
  eligibilityCriteria: EligibilityCriterion[];
  requiredMetrics: string[]; // metrics needed from gold layer
  documentationUrl: string;
  partnerReferralEnabled: boolean;
  lastUpdated: string; // ISO date string
  description: { en: string; fr: string };
}

// =============================================================================
// FEDERAL TAX CREDITS
// =============================================================================

export const SRED_CREDIT: TaxCredit = {
  id: "sred",
  name: {
    en: "Scientific Research and Experimental Development Tax Credit",
    fr: "Crédit d'impôt pour la recherche scientifique et le développement expérimental",
  },
  shortName: { en: "SR&ED", fr: "RSDE" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: [
    "technology",
    "manufacturing",
    "professional_services",
    "healthcare",
    "agriculture",
    "construction",
  ],
  maxBenefit: {
    type: "percentage",
    value: 35,
    description: {
      en: "Up to 35% refundable credit on eligible R&D expenditures (15% for CCPCs, 35% for other corporations)",
      fr: "Jusqu'à 35% de crédit remboursable sur les dépenses admissibles en R-D (15% pour les CCPC, 35% pour les autres sociétés)",
    },
  },
  eligibilityCriteria: [
    {
      id: "sred_rd_expenditures",
      metricKey: "development_costs",
      operator: "gt",
      value: 0,
      weight: 30,
      isRequired: true,
      description: {
        en: "Company has R&D expenditures (development costs, research salaries)",
        fr: "L'entreprise a des dépenses en R-D (coûts de développement, salaires de recherche)",
      },
    },
    {
      id: "sred_technical_employees",
      metricKey: "technical_employee_count",
      operator: "gte",
      value: 1,
      weight: 20,
      description: {
        en: "Has technical employees (engineers, developers, researchers)",
        fr: "A des employés techniques (ingénieurs, développeurs, chercheurs)",
      },
    },
    {
      id: "sred_revenue_growth",
      metricKey: "yoy_revenue_change_pct",
      operator: "gt",
      value: -20,
      weight: 15,
      description: {
        en: "Company is actively developing new products/services",
        fr: "L'entreprise développe activement de nouveaux produits/services",
      },
    },
  ],
  requiredMetrics: [
    "development_costs",
    "technical_employee_count",
    "yoy_revenue_change_pct",
  ],
  documentationUrl:
    "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Canada's largest R&D tax credit program, providing refundable credits for scientific research and experimental development activities.",
    fr: "Le plus grand programme de crédit d'impôt R-D du Canada, offrant des crédits remboursables pour les activités de recherche scientifique et de développement expérimental.",
  },
};

export const CLEAN_TECH_CREDIT: TaxCredit = {
  id: "clean_tech",
  name: {
    en: "Clean Technology Investment Tax Credit",
    fr: "Crédit d'impôt à l'investissement en technologies propres",
  },
  shortName: { en: "Clean Tech ITC", fr: "CIIP" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["manufacturing", "technology", "agriculture", "transport"],
  maxBenefit: {
    type: "percentage",
    value: 30,
    description: {
      en: "30% refundable credit on eligible clean technology equipment and property",
      fr: "30% de crédit remboursable sur l'équipement et les biens admissibles en technologies propres",
    },
  },
  eligibilityCriteria: [
    {
      id: "clean_tech_equipment",
      metricKey: "clean_tech_investments",
      operator: "gt",
      value: 0,
      weight: 40,
      isRequired: true,
      description: {
        en: "Investments in clean technology equipment (solar, wind, electric vehicles, etc.)",
        fr: "Investissements dans l'équipement de technologies propres (solaire, éolien, véhicules électriques, etc.)",
      },
    },
    {
      id: "clean_tech_revenue",
      metricKey: "total_revenue",
      operator: "gt",
      value: 0,
      weight: 20,
      description: {
        en: "Company is operational",
        fr: "L'entreprise est opérationnelle",
      },
    },
  ],
  requiredMetrics: ["clean_tech_investments", "total_revenue"],
  documentationUrl:
    "https://www.canada.ca/en/department-finance/services/publications/clean-technology-investment-tax-credit",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for investments in clean technology equipment and property to support Canada's net-zero goals.",
    fr: "Crédit d'impôt remboursable pour les investissements dans l'équipement et les biens de technologies propres pour soutenir les objectifs de carboneutralité du Canada.",
  },
};

export const APPRENTICESHIP_CREDIT: TaxCredit = {
  id: "apprenticeship",
  name: {
    en: "Apprenticeship Job Creation Tax Credit",
    fr: "Crédit d'impôt pour la création d'emplois d'apprentis",
  },
  shortName: { en: "Apprenticeship Credit", fr: "Crédit apprentissage" },
  jurisdiction: "federal",
  creditType: "non-refundable",
  industries: ["construction", "manufacturing", "automotive", "transport"],
  maxBenefit: {
    type: "fixed",
    value: 2000,
    description: {
      en: "$2,000 per eligible apprentice per year",
      fr: "2 000 $ par apprenti admissible par année",
    },
  },
  eligibilityCriteria: [
    {
      id: "apprentice_count",
      metricKey: "apprentice_count",
      operator: "gte",
      value: 1,
      weight: 50,
      isRequired: true,
      description: {
        en: "Company employs registered apprentices",
        fr: "L'entreprise emploie des apprentis inscrits",
      },
    },
    {
      id: "apprentice_wages",
      metricKey: "apprentice_wages",
      operator: "gt",
      value: 0,
      weight: 30,
      description: {
        en: "Pays wages to apprentices",
        fr: "Paie des salaires aux apprentis",
      },
    },
  ],
  requiredMetrics: ["apprentice_count", "apprentice_wages"],
  documentationUrl:
    "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/apprenticeship-job-creation-tax-credit",
  partnerReferralEnabled: false,
  lastUpdated: "2025-01-01",
  description: {
    en: "Non-refundable tax credit for employers who hire eligible apprentices in designated Red Seal trades.",
    fr: "Crédit d'impôt non remboursable pour les employeurs qui embauchent des apprentis admissibles dans des métiers désignés Sceau rouge.",
  },
};

export const CANADA_TRAINING_CREDIT: TaxCredit = {
  id: "training_credit",
  name: {
    en: "Canada Training Credit",
    fr: "Crédit d'impôt pour la formation du Canada",
  },
  shortName: { en: "Training Credit", fr: "Crédit formation" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: "all",
  maxBenefit: {
    type: "percentage",
    value: 50,
    description: {
      en: "50% of eligible training costs, up to $250 per employee per year",
      fr: "50% des coûts de formation admissibles, jusqu'à 250 $ par employé par année",
    },
  },
  eligibilityCriteria: [
    {
      id: "training_expenses",
      metricKey: "training_expenses",
      operator: "gt",
      value: 0,
      weight: 40,
      isRequired: true,
      description: {
        en: "Company has training/education expenses",
        fr: "L'entreprise a des dépenses de formation/éducation",
      },
    },
    {
      id: "employee_count",
      metricKey: "employee_count",
      operator: "gte",
      value: 1,
      weight: 20,
      description: {
        en: "Has employees",
        fr: "A des employés",
      },
    },
  ],
  requiredMetrics: ["training_expenses", "employee_count"],
  documentationUrl:
    "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-45300-canada-training-credit",
  partnerReferralEnabled: false,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable credit to help cover the cost of eligible training fees for employees.",
    fr: "Crédit remboursable pour aider à couvrir le coût des frais de formation admissibles pour les employés.",
  },
};

// =============================================================================
// QUEBEC TAX CREDITS
// =============================================================================

export const CRIC_CREDIT: TaxCredit = {
  id: "cric",
  name: {
    en: "Tax Credit for Research, Innovation and Commercialization",
    fr: "Crédit d'impôt pour la recherche, l'innovation et la commercialisation",
  },
  shortName: { en: "CRIC", fr: "CRIC" },
  jurisdiction: "provincial",
  province: "QC",
  creditType: "refundable",
  industries: [
    "technology",
    "manufacturing",
    "professional_services",
    "healthcare",
    "construction",
  ],
  maxBenefit: {
    type: "percentage",
    value: 30,
    description: {
      en: "20% base rate, 30% enhanced rate for up to $1M in eligible expenditures",
      fr: "Taux de base de 20%, taux majoré de 30% pour jusqu'à 1 M$ de dépenses admissibles",
    },
  },
  eligibilityCriteria: [
    {
      id: "cric_rd_expenditures",
      metricKey: "development_costs",
      operator: "gt",
      value: 0,
      weight: 35,
      isRequired: true,
      description: {
        en: "R&D or pre-commercialization expenditures in Quebec",
        fr: "Dépenses en R-D ou précommercialisation au Québec",
      },
    },
    {
      id: "cric_quebec_operations",
      metricKey: "quebec_operations",
      operator: "eq",
      value: true,
      weight: 25,
      isRequired: true,
      description: {
        en: "Company operates in Quebec",
        fr: "L'entreprise opère au Québec",
      },
    },
    {
      id: "cric_technical_staff",
      metricKey: "technical_employee_count",
      operator: "gte",
      value: 1,
      weight: 20,
      description: {
        en: "Has technical staff in Quebec",
        fr: "A du personnel technique au Québec",
      },
    },
  ],
  requiredMetrics: [
    "development_costs",
    "quebec_operations",
    "technical_employee_count",
  ],
  documentationUrl:
    "https://www.revenuquebec.ca/en/businesses/support-programs-for-businesses/tax-credit-for-research-innovation-and-commercialization/",
  partnerReferralEnabled: true,
  lastUpdated: "2025-03-25",
  description: {
    en: "Quebec's flagship R&D tax credit, replacing previous RSDE and IDCI programs. Provides refundable credits for research, innovation, and commercialization activities.",
    fr: "Le crédit d'impôt R-D phare du Québec, remplaçant les programmes RSDE et IDCI précédents. Offre des crédits remboursables pour les activités de recherche, d'innovation et de commercialisation.",
  },
};

export const CDAE_CREDIT: TaxCredit = {
  id: "cdae",
  name: {
    en: "Tax Credit for E-Business Development",
    fr: "Crédit d'impôt pour le développement du commerce électronique",
  },
  shortName: { en: "CDAE", fr: "CDAE" },
  jurisdiction: "provincial",
  province: "QC",
  creditType: "refundable",
  industries: ["technology"],
  maxBenefit: {
    type: "percentage",
    value: 30,
    description: {
      en: "30% of eligible salaries (24% refundable + 6% non-refundable), max $25,000 per employee",
      fr: "30% des salaires admissibles (24% remboursable + 6% non remboursable), max 25 000 $ par employé",
    },
  },
  eligibilityCriteria: [
    {
      id: "cdae_tech_employees",
      metricKey: "technical_employee_count",
      operator: "gte",
      value: 6,
      weight: 40,
      isRequired: true,
      description: {
        en: "Has at least 6 technical employees in Quebec",
        fr: "A au moins 6 employés techniques au Québec",
      },
    },
    {
      id: "cdae_quebec_operations",
      metricKey: "quebec_operations",
      operator: "eq",
      value: true,
      weight: 30,
      isRequired: true,
      description: {
        en: "Company operates in Quebec",
        fr: "L'entreprise opère au Québec",
      },
    },
    {
      id: "cdae_tech_revenue",
      metricKey: "technology_revenue",
      operator: "gt",
      value: 0,
      weight: 20,
      description: {
        en: "Generates revenue from technology/software activities",
        fr: "Génère des revenus d'activités technologiques/logicielles",
      },
    },
  ],
  requiredMetrics: [
    "technical_employee_count",
    "quebec_operations",
    "technology_revenue",
  ],
  documentationUrl:
    "https://www.investquebec.com/quebec/fr/financement-entreprises/programmes-aide-financiere/credit-impot-developpement-commerce-electronique.html",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for Quebec IT companies with 6+ technical employees in eligible sectors (software development, data processing, e-commerce).",
    fr: "Crédit d'impôt remboursable pour les entreprises TI québécoises avec 6+ employés techniques dans des secteurs admissibles (développement logiciel, traitement de données, commerce électronique).",
  },
};

// =============================================================================
// ONTARIO TAX CREDITS
// =============================================================================

export const OIDMTC_CREDIT: TaxCredit = {
  id: "oidmtc",
  name: {
    en: "Ontario Interactive Digital Media Tax Credit",
    fr: "Crédit d'impôt ontarien pour les médias numériques interactifs",
  },
  shortName: { en: "OIDMTC", fr: "OIDMTC" },
  jurisdiction: "provincial",
  province: "ON",
  creditType: "refundable",
  industries: ["technology"],
  maxBenefit: {
    type: "percentage",
    value: 40,
    description: {
      en: "40% on eligible Ontario labour (35% for fee-for-service), no annual cap",
      fr: "40% sur la main-d'œuvre ontarienne admissible (35% pour les services à forfait), aucun plafond annuel",
    },
  },
  eligibilityCriteria: [
    {
      id: "oidmtc_ontario_operations",
      metricKey: "ontario_operations",
      operator: "eq",
      value: true,
      weight: 35,
      isRequired: true,
      description: {
        en: "Company operates in Ontario",
        fr: "L'entreprise opère en Ontario",
      },
    },
    {
      id: "oidmtc_digital_media",
      metricKey: "digital_media_revenue",
      operator: "gt",
      value: 0,
      weight: 40,
      isRequired: true,
      description: {
        en: "Develops interactive digital media products (games, VR/AR, e-learning)",
        fr: "Développe des produits de médias numériques interactifs (jeux, VR/AR, e-learning)",
      },
    },
    {
      id: "oidmtc_ontario_labour",
      metricKey: "ontario_labour_expenditures",
      operator: "gt",
      value: 0,
      weight: 25,
      description: {
        en: "Has Ontario labour expenditures for digital media development",
        fr: "A des dépenses de main-d'œuvre ontarienne pour le développement de médias numériques",
      },
    },
  ],
  requiredMetrics: [
    "ontario_operations",
    "digital_media_revenue",
    "ontario_labour_expenditures",
  ],
  documentationUrl: "https://www.ontariocreates.ca/tax-incentives/oidmtc",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for qualifying corporations developing interactive digital media products in Ontario.",
    fr: "Crédit d'impôt remboursable pour les sociétés admissibles développant des produits de médias numériques interactifs en Ontario.",
  },
};

export const OMMITC_CREDIT: TaxCredit = {
  id: "ommitc",
  name: {
    en: "Ontario Made Manufacturing Investment Tax Credit",
    fr: "Crédit d'impôt ontarien pour l'investissement manufacturier",
  },
  shortName: { en: "OMMITC", fr: "OMMITC" },
  jurisdiction: "provincial",
  province: "ON",
  creditType: "refundable",
  industries: ["manufacturing"],
  maxBenefit: {
    type: "percentage",
    value: 15,
    description: {
      en: "15% refundable credit on eligible manufacturing investments, max $3M per year",
      fr: "15% de crédit remboursable sur les investissements manufacturiers admissibles, max 3 M$ par année",
    },
  },
  eligibilityCriteria: [
    {
      id: "ommitc_manufacturing",
      metricKey: "manufacturing_revenue",
      operator: "gt",
      value: 0,
      weight: 40,
      isRequired: true,
      description: {
        en: "Company is engaged in manufacturing or processing",
        fr: "L'entreprise est engagée dans la fabrication ou la transformation",
      },
    },
    {
      id: "ommitc_ontario_operations",
      metricKey: "ontario_operations",
      operator: "eq",
      value: true,
      weight: 30,
      isRequired: true,
      description: {
        en: "Company operates in Ontario",
        fr: "L'entreprise opère en Ontario",
      },
    },
    {
      id: "ommitc_capital_investments",
      metricKey: "capital_expenditures",
      operator: "gt",
      value: 0,
      weight: 30,
      description: {
        en: "Has capital expenditures for manufacturing equipment",
        fr: "A des dépenses en capital pour l'équipement manufacturier",
      },
    },
  ],
  requiredMetrics: [
    "manufacturing_revenue",
    "ontario_operations",
    "capital_expenditures",
  ],
  documentationUrl:
    "https://www.ontario.ca/page/ontario-made-manufacturing-investment-tax-credit",
  partnerReferralEnabled: true,
  lastUpdated: "2025-05-15",
  description: {
    en: "Refundable tax credit for Canadian-controlled private corporations investing in manufacturing equipment and facilities in Ontario.",
    fr: "Crédit d'impôt remboursable pour les sociétés privées sous contrôle canadien investissant dans l'équipement et les installations manufacturières en Ontario.",
  },
};

// =============================================================================
// ALL TAX CREDITS
// =============================================================================

export const ALL_TAX_CREDITS: TaxCredit[] = [
  // Federal
  SRED_CREDIT,
  CLEAN_TECH_CREDIT,
  APPRENTICESHIP_CREDIT,
  CANADA_TRAINING_CREDIT,
  // Quebec
  CRIC_CREDIT,
  CDAE_CREDIT,
  // Ontario
  OIDMTC_CREDIT,
  OMMITC_CREDIT,
];

/**
 * Get tax credit by ID
 */
export function getTaxCreditById(id: TaxCreditId): TaxCredit | undefined {
  return ALL_TAX_CREDITS.find((credit) => credit.id === id);
}

/**
 * Get tax credits by jurisdiction
 */
export function getTaxCreditsByJurisdiction(
  jurisdiction: "federal" | "provincial",
  province?: CanadianProvince,
): TaxCredit[] {
  return ALL_TAX_CREDITS.filter((credit) => {
    if (jurisdiction === "federal") {
      return credit.jurisdiction === "federal";
    }
    return credit.jurisdiction === "provincial" && credit.province === province;
  });
}

/**
 * Get tax credits relevant to an industry
 */
export function getTaxCreditsByIndustry(industryId: IndustryId): TaxCredit[] {
  return ALL_TAX_CREDITS.filter((credit) => {
    if (credit.industries === "all") return true;
    return credit.industries.includes(industryId);
  });
}

/**
 * Get tax credits by industry and province
 */
export function getTaxCreditsByIndustryAndProvince(
  industryId: IndustryId,
  province?: CanadianProvince,
): TaxCredit[] {
  const industryCredits = getTaxCreditsByIndustry(industryId);
  if (!province) {
    return industryCredits.filter(
      (credit) => credit.jurisdiction === "federal",
    );
  }
  return industryCredits.filter(
    (credit) =>
      credit.jurisdiction === "federal" ||
      (credit.jurisdiction === "provincial" && credit.province === province),
  );
}
