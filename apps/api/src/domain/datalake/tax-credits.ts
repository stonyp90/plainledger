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
// ADDITIONAL FEDERAL TAX CREDITS
// =============================================================================

export const HYDROGEN_ITC_CREDIT: TaxCredit = {
  id: "hydrogen_itc",
  name: {
    en: "Clean Hydrogen Investment Tax Credit",
    fr: "Crédit d'impôt à l'investissement pour l'hydrogène propre",
  },
  shortName: { en: "Hydrogen ITC", fr: "CII hydrogène" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["manufacturing", "transport", "technology", "agriculture"],
  maxBenefit: {
    type: "percentage",
    value: 40,
    description: {
      en: "15-40% refundable credit based on hydrogen carbon intensity",
      fr: "15-40% de crédit remboursable selon l'intensité carbone de l'hydrogène",
    },
  },
  eligibilityCriteria: [
    {
      id: "hydrogen_equipment",
      metricKey: "hydrogen_equipment_investments",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Investments in clean hydrogen production equipment",
        fr: "Investissements dans l'équipement de production d'hydrogène propre",
      },
    },
    {
      id: "hydrogen_operations",
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
  requiredMetrics: ["hydrogen_equipment_investments", "total_revenue"],
  documentationUrl:
    "https://www.canada.ca/en/department-finance/news/2023/03/clean-hydrogen-investment-tax-credit.html",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for investments in clean hydrogen production, supporting Canada's transition to a low-carbon economy.",
    fr: "Crédit d'impôt remboursable pour les investissements dans la production d'hydrogène propre, soutenant la transition du Canada vers une économie sobre en carbone.",
  },
};

export const CARBON_CAPTURE_CREDIT: TaxCredit = {
  id: "carbon_capture",
  name: {
    en: "Carbon Capture, Utilization, and Storage Tax Credit",
    fr: "Crédit d'impôt pour le captage, l'utilisation et le stockage du carbone",
  },
  shortName: { en: "CCUS Credit", fr: "Crédit CUSC" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["manufacturing", "agriculture", "technology"],
  maxBenefit: {
    type: "percentage",
    value: 60,
    description: {
      en: "37.5-60% refundable credit on eligible CCUS expenditures",
      fr: "37,5-60% de crédit remboursable sur les dépenses CUSC admissibles",
    },
  },
  eligibilityCriteria: [
    {
      id: "ccus_investments",
      metricKey: "ccus_investments",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Investments in carbon capture equipment and storage",
        fr: "Investissements dans l'équipement de captage et stockage du carbone",
      },
    },
  ],
  requiredMetrics: ["ccus_investments"],
  documentationUrl:
    "https://www.canada.ca/en/department-finance/programs/consultations/2021/carbon-capture-utilization-storage-investment-tax-credit.html",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for investments in carbon capture, utilization, and storage projects.",
    fr: "Crédit d'impôt remboursable pour les investissements dans les projets de captage, d'utilisation et de stockage du carbone.",
  },
};

export const DISABILITY_TAX_CREDIT: TaxCredit = {
  id: "disability_tax",
  name: {
    en: "Disability Tax Credit (Employer)",
    fr: "Crédit d'impôt pour personnes handicapées (employeur)",
  },
  shortName: { en: "DTC", fr: "CIPH" },
  jurisdiction: "federal",
  creditType: "non-refundable",
  industries: "all",
  maxBenefit: {
    type: "fixed",
    value: 8870,
    description: {
      en: "Up to $8,870 per eligible employee with disability",
      fr: "Jusqu'à 8 870 $ par employé admissible avec handicap",
    },
  },
  eligibilityCriteria: [
    {
      id: "disability_employees",
      metricKey: "disability_employee_count",
      operator: "gte",
      value: 1,
      weight: 60,
      isRequired: true,
      description: {
        en: "Employs persons with qualifying disabilities",
        fr: "Emploie des personnes avec des handicaps admissibles",
      },
    },
    {
      id: "employee_wages",
      metricKey: "total_wages",
      operator: "gt",
      value: 0,
      weight: 20,
      description: {
        en: "Pays wages to employees",
        fr: "Paie des salaires aux employés",
      },
    },
  ],
  requiredMetrics: ["disability_employee_count", "total_wages"],
  documentationUrl:
    "https://www.canada.ca/en/revenue-agency/services/tax/individuals/segments/tax-credits-deductions-persons-disabilities/disability-tax-credit.html",
  partnerReferralEnabled: false,
  lastUpdated: "2025-01-01",
  description: {
    en: "Non-refundable tax credit for employers who hire and accommodate employees with disabilities.",
    fr: "Crédit d'impôt non remboursable pour les employeurs qui embauchent et accommodent des employés handicapés.",
  },
};

// =============================================================================
// REAL ESTATE SPECIFIC CREDITS
// =============================================================================

export const CCA_RENTAL_CREDIT: TaxCredit = {
  id: "cca_rental",
  name: {
    en: "Capital Cost Allowance - Rental Buildings",
    fr: "Déduction pour amortissement - Immeubles locatifs",
  },
  shortName: { en: "CCA Class 1", fr: "DPA Catégorie 1" },
  jurisdiction: "federal",
  creditType: "non-refundable",
  industries: ["real_estate"],
  maxBenefit: {
    type: "percentage",
    value: 4,
    description: {
      en: "4% declining balance CCA on eligible rental buildings (6% for new buildings acquired after 2023)",
      fr: "4% DPA sur solde dégressif pour immeubles locatifs admissibles (6% pour nouveaux immeubles acquis après 2023)",
    },
  },
  eligibilityCriteria: [
    {
      id: "rental_properties",
      metricKey: "property_value",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Owns rental real estate properties",
        fr: "Possède des propriétés immobilières locatives",
      },
    },
    {
      id: "rental_income",
      metricKey: "rental_income",
      operator: "gt",
      value: 0,
      weight: 30,
      description: {
        en: "Generates rental income",
        fr: "Génère des revenus locatifs",
      },
    },
  ],
  requiredMetrics: ["property_value", "rental_income"],
  documentationUrl:
    "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/rental-income/capital-cost-allowance-rental-property.html",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Capital Cost Allowance deduction for rental buildings, reducing taxable rental income.",
    fr: "Déduction pour amortissement pour immeubles locatifs, réduisant le revenu locatif imposable.",
  },
};

export const GREEN_BUILDING_CREDIT: TaxCredit = {
  id: "green_building",
  name: {
    en: "Clean Economy Investment Tax Credit - Buildings",
    fr: "Crédit d'impôt à l'investissement économie propre - Bâtiments",
  },
  shortName: { en: "Green Building ITC", fr: "CII bâtiments verts" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["real_estate", "construction"],
  maxBenefit: {
    type: "percentage",
    value: 30,
    description: {
      en: "Up to 30% refundable credit on eligible clean building retrofits",
      fr: "Jusqu'à 30% de crédit remboursable sur les rénovations vertes admissibles",
    },
  },
  eligibilityCriteria: [
    {
      id: "green_retrofits",
      metricKey: "green_retrofit_investments",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Investments in energy-efficient building upgrades",
        fr: "Investissements dans des améliorations écoénergétiques",
      },
    },
    {
      id: "property_ownership",
      metricKey: "property_value",
      operator: "gt",
      value: 0,
      weight: 25,
      description: {
        en: "Owns commercial or residential buildings",
        fr: "Possède des bâtiments commerciaux ou résidentiels",
      },
    },
  ],
  requiredMetrics: ["green_retrofit_investments", "property_value"],
  documentationUrl:
    "https://www.canada.ca/en/department-finance/news/2024/04/budget-2024-clean-economy-investment-tax-credits.html",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for investments in green building improvements and energy-efficient retrofits.",
    fr: "Crédit d'impôt remboursable pour les investissements dans les améliorations de bâtiments verts et les rénovations écoénergétiques.",
  },
};

// =============================================================================
// AGRICULTURE SPECIFIC CREDITS
// =============================================================================

export const AGRI_INVEST_CREDIT: TaxCredit = {
  id: "agri_invest",
  name: {
    en: "AgriInvest - Farm Investment Account",
    fr: "AgriInvestissement - Compte d'investissement agricole",
  },
  shortName: { en: "AgriInvest", fr: "AgriInvestissement" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["agriculture"],
  maxBenefit: {
    type: "percentage",
    value: 100,
    description: {
      en: "Government matches up to 1% of allowable net sales (max $10,000/year)",
      fr: "Le gouvernement égale jusqu'à 1% des ventes nettes admissibles (max 10 000$/an)",
    },
  },
  eligibilityCriteria: [
    {
      id: "farm_sales",
      metricKey: "crop_sales",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Has agricultural sales (crops, livestock)",
        fr: "A des ventes agricoles (cultures, bétail)",
      },
    },
    {
      id: "farm_income",
      metricKey: "total_revenue",
      operator: "gte",
      value: 10000,
      weight: 25,
      description: {
        en: "Minimum $10,000 in farm income",
        fr: "Minimum 10 000$ en revenus agricoles",
      },
    },
  ],
  requiredMetrics: ["crop_sales", "total_revenue"],
  documentationUrl: "https://agriculture.canada.ca/en/programs/agriinvest",
  partnerReferralEnabled: false,
  lastUpdated: "2025-01-01",
  description: {
    en: "Self-managed savings account where government matches producer deposits to help manage income declines.",
    fr: "Compte d'épargne autogéré où le gouvernement égale les dépôts des producteurs pour aider à gérer les baisses de revenus.",
  },
};

export const AGRI_STABILITY_CREDIT: TaxCredit = {
  id: "agri_stability",
  name: {
    en: "AgriStability - Margin Protection Program",
    fr: "Agri-stabilité - Programme de protection des marges",
  },
  shortName: { en: "AgriStability", fr: "Agri-stabilité" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["agriculture"],
  maxBenefit: {
    type: "percentage",
    value: 70,
    description: {
      en: "Covers 70% of margin decline below reference margin",
      fr: "Couvre 70% de la baisse de marge sous la marge de référence",
    },
  },
  eligibilityCriteria: [
    {
      id: "farm_operations",
      metricKey: "crop_sales",
      operator: "gt",
      value: 0,
      weight: 40,
      isRequired: true,
      description: {
        en: "Active farming operations",
        fr: "Opérations agricoles actives",
      },
    },
    {
      id: "historical_data",
      metricKey: "yoy_revenue_change_pct",
      operator: "exists",
      value: true,
      weight: 30,
      description: {
        en: "Has historical financial data for reference margin calculation",
        fr: "A des données financières historiques pour le calcul de la marge de référence",
      },
    },
  ],
  requiredMetrics: ["crop_sales", "yoy_revenue_change_pct"],
  documentationUrl: "https://agriculture.canada.ca/en/programs/agristability",
  partnerReferralEnabled: false,
  lastUpdated: "2025-01-01",
  description: {
    en: "Income stabilization program protecting farmers against large margin declines.",
    fr: "Programme de stabilisation des revenus protégeant les agriculteurs contre les importantes baisses de marge.",
  },
};

// =============================================================================
// HOSPITALITY & TOURISM CREDITS
// =============================================================================

export const TOURISM_INCENTIVE_CREDIT: TaxCredit = {
  id: "tourism_incentive",
  name: {
    en: "Tourism and Hospitality Recovery Program",
    fr: "Programme de relance du tourisme et de l'hôtellerie",
  },
  shortName: { en: "Tourism Credit", fr: "Crédit tourisme" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["hospitality", "restaurant"],
  maxBenefit: {
    type: "percentage",
    value: 25,
    description: {
      en: "Up to 25% subsidy on eligible payroll and rent costs",
      fr: "Jusqu'à 25% de subvention sur les coûts admissibles de paie et de loyer",
    },
  },
  eligibilityCriteria: [
    {
      id: "tourism_revenue",
      metricKey: "room_revenue",
      operator: "gt",
      value: 0,
      weight: 40,
      description: {
        en: "Revenue from tourism/hospitality activities",
        fr: "Revenus d'activités touristiques/hôtelières",
      },
    },
    {
      id: "hospitality_operations",
      metricKey: "total_revenue",
      operator: "gt",
      value: 0,
      weight: 30,
      isRequired: true,
      description: {
        en: "Operating hospitality business",
        fr: "Entreprise d'hôtellerie en opération",
      },
    },
  ],
  requiredMetrics: ["room_revenue", "total_revenue"],
  documentationUrl:
    "https://www.canada.ca/en/revenue-agency/services/subsidy/tourism-hospitality-recovery-program.html",
  partnerReferralEnabled: false,
  lastUpdated: "2025-01-01",
  description: {
    en: "Support program for tourism and hospitality businesses affected by economic challenges.",
    fr: "Programme de soutien pour les entreprises touristiques et hôtelières touchées par les défis économiques.",
  },
};

// =============================================================================
// FILM & MEDIA CREDITS
// =============================================================================

export const CPTC_CREDIT: TaxCredit = {
  id: "cptc",
  name: {
    en: "Canadian Film or Video Production Tax Credit",
    fr: "Crédit d'impôt pour production cinématographique ou vidéo canadienne",
  },
  shortName: { en: "CPTC", fr: "CIPC" },
  jurisdiction: "federal",
  creditType: "refundable",
  industries: ["technology"],
  maxBenefit: {
    type: "percentage",
    value: 25,
    description: {
      en: "25% refundable credit on eligible Canadian labour expenditures",
      fr: "25% de crédit remboursable sur les dépenses admissibles de main-d'œuvre canadienne",
    },
  },
  eligibilityCriteria: [
    {
      id: "film_production",
      metricKey: "film_production_costs",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Incurs film or video production costs",
        fr: "Engage des coûts de production cinématographique ou vidéo",
      },
    },
    {
      id: "canadian_content",
      metricKey: "canadian_labour_costs",
      operator: "gt",
      value: 0,
      weight: 30,
      description: {
        en: "Has Canadian labour expenditures",
        fr: "A des dépenses de main-d'œuvre canadienne",
      },
    },
  ],
  requiredMetrics: ["film_production_costs", "canadian_labour_costs"],
  documentationUrl:
    "https://www.canada.ca/en/canadian-heritage/services/funding/cavco-tax-credits/canadian-film-video-production.html",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for Canadian-controlled corporations producing Canadian film or video content.",
    fr: "Crédit d'impôt remboursable pour les sociétés sous contrôle canadien produisant du contenu cinématographique ou vidéo canadien.",
  },
};

// =============================================================================
// QUEBEC ADDITIONAL CREDITS
// =============================================================================

export const QC_MULTIMEDIA_CREDIT: TaxCredit = {
  id: "qc_multimedia",
  name: {
    en: "Quebec Multimedia Titles Tax Credit",
    fr: "Crédit d'impôt pour les titres multimédia du Québec",
  },
  shortName: { en: "QC Multimedia", fr: "CIM Québec" },
  jurisdiction: "provincial",
  province: "QC",
  creditType: "refundable",
  industries: ["technology"],
  maxBenefit: {
    type: "percentage",
    value: 37.5,
    description: {
      en: "30% base + 7.5% bonus for French content on eligible labour",
      fr: "30% de base + 7,5% de bonification pour contenu français sur main-d'œuvre admissible",
    },
  },
  eligibilityCriteria: [
    {
      id: "multimedia_development",
      metricKey: "multimedia_development_costs",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Develops multimedia titles (games, educational software, e-learning)",
        fr: "Développe des titres multimédia (jeux, logiciels éducatifs, e-learning)",
      },
    },
    {
      id: "quebec_employees",
      metricKey: "quebec_employee_count",
      operator: "gte",
      value: 1,
      weight: 30,
      isRequired: true,
      description: {
        en: "Has employees in Quebec",
        fr: "A des employés au Québec",
      },
    },
  ],
  requiredMetrics: ["multimedia_development_costs", "quebec_employee_count"],
  documentationUrl:
    "https://www.investquebec.com/quebec/en/financial-products/specialized-funds-programs/tax-credit-for-multimedia-titles.html",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Refundable tax credit for Quebec companies developing multimedia titles including video games and educational software.",
    fr: "Crédit d'impôt remboursable pour les entreprises québécoises développant des titres multimédia incluant les jeux vidéo et logiciels éducatifs.",
  },
};

export const QC_FILM_CREDIT: TaxCredit = {
  id: "qc_film",
  name: {
    en: "Quebec Film and Television Production Tax Credit",
    fr: "Crédit d'impôt pour production cinématographique et télévisuelle du Québec",
  },
  shortName: { en: "QC Film", fr: "CIQ Film" },
  jurisdiction: "provincial",
  province: "QC",
  creditType: "refundable",
  industries: ["technology"],
  maxBenefit: {
    type: "percentage",
    value: 44,
    description: {
      en: "28-44% refundable credit on eligible Quebec labour expenditures",
      fr: "28-44% de crédit remboursable sur les dépenses admissibles de main-d'œuvre québécoise",
    },
  },
  eligibilityCriteria: [
    {
      id: "film_production_qc",
      metricKey: "film_production_costs",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Film or television production costs in Quebec",
        fr: "Coûts de production cinématographique ou télévisuelle au Québec",
      },
    },
    {
      id: "qc_operations",
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
  ],
  requiredMetrics: ["film_production_costs", "quebec_operations"],
  documentationUrl:
    "https://www.sodec.gouv.qc.ca/en/programs/film-and-television-production/tax-credit/",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Quebec's film and television tax credit for productions shot in the province.",
    fr: "Crédit d'impôt cinématographique et télévisuel du Québec pour les productions tournées dans la province.",
  },
};

// =============================================================================
// BRITISH COLUMBIA CREDITS
// =============================================================================

export const BC_FILM_CREDIT: TaxCredit = {
  id: "bc_film",
  name: {
    en: "BC Film and Television Tax Credit",
    fr: "Crédit d'impôt cinématographique et télévisuel de la C.-B.",
  },
  shortName: { en: "BC Film", fr: "CI Film C.-B." },
  jurisdiction: "provincial",
  province: "BC",
  creditType: "refundable",
  industries: ["technology"],
  maxBenefit: {
    type: "percentage",
    value: 35,
    description: {
      en: "28-35% refundable credit on BC labour expenditures",
      fr: "28-35% de crédit remboursable sur les dépenses de main-d'œuvre en C.-B.",
    },
  },
  eligibilityCriteria: [
    {
      id: "bc_film_production",
      metricKey: "film_production_costs",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Film or television production in BC",
        fr: "Production cinématographique ou télévisuelle en C.-B.",
      },
    },
    {
      id: "bc_operations",
      metricKey: "bc_operations",
      operator: "eq",
      value: true,
      weight: 30,
      isRequired: true,
      description: {
        en: "Company operates in British Columbia",
        fr: "L'entreprise opère en Colombie-Britannique",
      },
    },
  ],
  requiredMetrics: ["film_production_costs", "bc_operations"],
  documentationUrl:
    "https://www2.gov.bc.ca/gov/content/taxes/income-taxes/corporate/credits/film-television",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "BC's film and television tax credit program for domestic and foreign productions.",
    fr: "Programme de crédit d'impôt cinématographique et télévisuel de la C.-B. pour les productions nationales et étrangères.",
  },
};

export const BC_SRED_CREDIT: TaxCredit = {
  id: "bc_sred",
  name: {
    en: "BC Scientific Research and Experimental Development Tax Credit",
    fr: "Crédit d'impôt RSDE de la C.-B.",
  },
  shortName: { en: "BC SR&ED", fr: "RSDE C.-B." },
  jurisdiction: "provincial",
  province: "BC",
  creditType: "refundable",
  industries: ["technology", "manufacturing", "healthcare", "agriculture"],
  maxBenefit: {
    type: "percentage",
    value: 10,
    description: {
      en: "10% refundable credit on BC R&D wages (additional to federal SR&ED)",
      fr: "10% de crédit remboursable sur les salaires R-D en C.-B. (en plus du RSDE fédéral)",
    },
  },
  eligibilityCriteria: [
    {
      id: "bc_rd_expenditures",
      metricKey: "development_costs",
      operator: "gt",
      value: 0,
      weight: 40,
      isRequired: true,
      description: {
        en: "R&D expenditures in British Columbia",
        fr: "Dépenses en R-D en Colombie-Britannique",
      },
    },
    {
      id: "bc_operations_sred",
      metricKey: "bc_operations",
      operator: "eq",
      value: true,
      weight: 30,
      isRequired: true,
      description: {
        en: "Company operates in British Columbia",
        fr: "L'entreprise opère en Colombie-Britannique",
      },
    },
  ],
  requiredMetrics: ["development_costs", "bc_operations"],
  documentationUrl:
    "https://www2.gov.bc.ca/gov/content/taxes/income-taxes/corporate/credits/scientific-research-development",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "BC's provincial SR&ED credit, providing additional refundable credit on top of the federal program.",
    fr: "Crédit RSDE provincial de la C.-B., offrant un crédit remboursable additionnel au programme fédéral.",
  },
};

// =============================================================================
// ALBERTA CREDITS
// =============================================================================

export const AB_INNOVATION_CREDIT: TaxCredit = {
  id: "ab_innovation",
  name: {
    en: "Alberta Innovation Employment Grant",
    fr: "Subvention albertaine pour l'emploi en innovation",
  },
  shortName: { en: "AB IEG", fr: "SAI Alberta" },
  jurisdiction: "provincial",
  province: "AB",
  creditType: "refundable",
  industries: ["technology", "manufacturing", "healthcare", "agriculture"],
  maxBenefit: {
    type: "percentage",
    value: 20,
    description: {
      en: "8-20% refundable credit on Alberta R&D wages",
      fr: "8-20% de crédit remboursable sur les salaires R-D en Alberta",
    },
  },
  eligibilityCriteria: [
    {
      id: "ab_rd_expenditures",
      metricKey: "development_costs",
      operator: "gt",
      value: 0,
      weight: 40,
      isRequired: true,
      description: {
        en: "R&D expenditures in Alberta",
        fr: "Dépenses en R-D en Alberta",
      },
    },
    {
      id: "ab_operations",
      metricKey: "alberta_operations",
      operator: "eq",
      value: true,
      weight: 30,
      isRequired: true,
      description: {
        en: "Company operates in Alberta",
        fr: "L'entreprise opère en Alberta",
      },
    },
  ],
  requiredMetrics: ["development_costs", "alberta_operations"],
  documentationUrl: "https://www.alberta.ca/innovation-employment-grant.aspx",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Alberta's R&D tax credit providing refundable credits on eligible innovation expenditures.",
    fr: "Crédit d'impôt R-D de l'Alberta offrant des crédits remboursables sur les dépenses d'innovation admissibles.",
  },
};

export const AB_FILM_CREDIT: TaxCredit = {
  id: "ab_film",
  name: {
    en: "Alberta Film and Television Tax Credit",
    fr: "Crédit d'impôt cinématographique et télévisuel de l'Alberta",
  },
  shortName: { en: "AB Film", fr: "CI Film Alberta" },
  jurisdiction: "provincial",
  province: "AB",
  creditType: "refundable",
  industries: ["technology"],
  maxBenefit: {
    type: "percentage",
    value: 30,
    description: {
      en: "22-30% refundable credit on Alberta production costs",
      fr: "22-30% de crédit remboursable sur les coûts de production en Alberta",
    },
  },
  eligibilityCriteria: [
    {
      id: "ab_film_production",
      metricKey: "film_production_costs",
      operator: "gt",
      value: 0,
      weight: 50,
      isRequired: true,
      description: {
        en: "Film or television production in Alberta",
        fr: "Production cinématographique ou télévisuelle en Alberta",
      },
    },
    {
      id: "ab_operations_film",
      metricKey: "alberta_operations",
      operator: "eq",
      value: true,
      weight: 30,
      isRequired: true,
      description: {
        en: "Company operates in Alberta",
        fr: "L'entreprise opère en Alberta",
      },
    },
  ],
  requiredMetrics: ["film_production_costs", "alberta_operations"],
  documentationUrl:
    "https://www.alberta.ca/film-and-television-tax-credit.aspx",
  partnerReferralEnabled: true,
  lastUpdated: "2025-01-01",
  description: {
    en: "Alberta's film and television tax credit for productions in the province.",
    fr: "Crédit d'impôt cinématographique et télévisuel de l'Alberta pour les productions dans la province.",
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
  HYDROGEN_ITC_CREDIT,
  CARBON_CAPTURE_CREDIT,
  DISABILITY_TAX_CREDIT,
  CCA_RENTAL_CREDIT,
  GREEN_BUILDING_CREDIT,
  AGRI_INVEST_CREDIT,
  AGRI_STABILITY_CREDIT,
  TOURISM_INCENTIVE_CREDIT,
  CPTC_CREDIT,
  // Quebec
  CRIC_CREDIT,
  CDAE_CREDIT,
  QC_MULTIMEDIA_CREDIT,
  QC_FILM_CREDIT,
  // Ontario
  OIDMTC_CREDIT,
  OMMITC_CREDIT,
  // British Columbia
  BC_FILM_CREDIT,
  BC_SRED_CREDIT,
  // Alberta
  AB_INNOVATION_CREDIT,
  AB_FILM_CREDIT,
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
