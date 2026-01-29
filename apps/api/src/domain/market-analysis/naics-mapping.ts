/**
 * NAICS Code Mapping for PlainLedger Industries
 *
 * Maps PlainLedger industry IDs to North American Industry Classification System (NAICS) codes.
 * NAICS codes are used to fetch benchmark data from ISED and Statistics Canada.
 *
 * NAICS 2022 Reference: https://www.statcan.gc.ca/en/subjects/standard/naics/2022/v1/index
 */

export interface NAICSMapping {
  /** PlainLedger industry ID */
  industryId: string;
  /** Primary NAICS code */
  naicsCode: string;
  /** Alternative NAICS codes for broader matching */
  alternativeNaicsCodes: string[];
  /** NAICS description */
  naicsDescription: string;
  /** ISED industry category (may differ from NAICS) */
  isedCategory?: string;
  /** Statistics Canada table coordinates for quarterly data */
  statsCanCoordinates?: string;
}

/**
 * Complete NAICS mapping for all 15 PlainLedger industries
 */
export const NAICS_MAPPINGS: NAICSMapping[] = [
  {
    industryId: "real_estate",
    naicsCode: "531",
    alternativeNaicsCodes: ["5311", "5312", "5313"],
    naicsDescription: "Real Estate",
    isedCategory: "Real estate and rental and leasing",
    statsCanCoordinates: "1.13.0.0.0.0", // Finance, insurance, real estate
  },
  {
    industryId: "construction",
    naicsCode: "23",
    alternativeNaicsCodes: ["236", "237", "238"],
    naicsDescription: "Construction",
    isedCategory: "Construction",
    statsCanCoordinates: "1.4.0.0.0.0", // Construction
  },
  {
    industryId: "hospitality",
    naicsCode: "721",
    alternativeNaicsCodes: ["7211", "7212", "7213"],
    naicsDescription: "Accommodation Services",
    isedCategory: "Accommodation and food services",
    statsCanCoordinates: "1.17.0.0.0.0", // Accommodation and food services
  },
  {
    industryId: "restaurant",
    naicsCode: "7225",
    alternativeNaicsCodes: ["722", "7223", "7224"],
    naicsDescription: "Restaurants and Other Eating Places",
    isedCategory: "Accommodation and food services",
    statsCanCoordinates: "1.17.0.0.0.0", // Accommodation and food services
  },
  {
    industryId: "retail",
    naicsCode: "44-45",
    alternativeNaicsCodes: [
      "441",
      "442",
      "443",
      "444",
      "445",
      "446",
      "447",
      "448",
      "451",
      "452",
      "453",
      "454",
    ],
    naicsDescription: "Retail Trade",
    isedCategory: "Retail trade",
    statsCanCoordinates: "1.8.0.0.0.0", // Retail trade
  },
  {
    industryId: "professional_services",
    naicsCode: "5412",
    alternativeNaicsCodes: [
      "541",
      "5411",
      "5413",
      "5414",
      "5415",
      "5416",
      "5417",
      "5418",
      "5419",
    ],
    naicsDescription: "Professional, Scientific and Technical Services",
    isedCategory: "Professional, scientific and technical services",
    statsCanCoordinates: "1.14.0.0.0.0", // Professional services
  },
  {
    industryId: "manufacturing",
    naicsCode: "31-33",
    alternativeNaicsCodes: [
      "311",
      "312",
      "313",
      "314",
      "315",
      "316",
      "321",
      "322",
      "323",
      "324",
      "325",
      "326",
      "327",
      "331",
      "332",
      "333",
      "334",
      "335",
      "336",
      "337",
      "339",
    ],
    naicsDescription: "Manufacturing",
    isedCategory: "Manufacturing",
    statsCanCoordinates: "1.5.0.0.0.0", // Manufacturing
  },
  {
    industryId: "agriculture",
    naicsCode: "111-112",
    alternativeNaicsCodes: ["111", "112", "113", "114", "115"],
    naicsDescription: "Agriculture, Forestry, Fishing and Hunting",
    isedCategory: "Agriculture, forestry, fishing and hunting",
    statsCanCoordinates: "1.1.0.0.0.0", // Agriculture
  },
  {
    industryId: "transport",
    naicsCode: "484",
    alternativeNaicsCodes: [
      "48-49",
      "481",
      "482",
      "483",
      "485",
      "486",
      "487",
      "488",
      "491",
      "492",
      "493",
    ],
    naicsDescription: "Truck Transportation",
    isedCategory: "Transportation and warehousing",
    statsCanCoordinates: "1.9.0.0.0.0", // Transportation and warehousing
  },
  {
    industryId: "healthcare",
    naicsCode: "6211",
    alternativeNaicsCodes: [
      "621",
      "6212",
      "6213",
      "6214",
      "6215",
      "6216",
      "6219",
    ],
    naicsDescription: "Offices of Physicians",
    isedCategory: "Health care and social assistance",
    statsCanCoordinates: "1.16.0.0.0.0", // Health care
  },
  {
    industryId: "education",
    naicsCode: "6116",
    alternativeNaicsCodes: [
      "611",
      "6111",
      "6112",
      "6113",
      "6114",
      "6115",
      "6117",
    ],
    naicsDescription: "Other Schools and Instruction",
    isedCategory: "Educational services",
    statsCanCoordinates: "1.15.0.0.0.0", // Educational services
  },
  {
    industryId: "wholesale",
    naicsCode: "41",
    alternativeNaicsCodes: [
      "411",
      "412",
      "413",
      "414",
      "415",
      "416",
      "417",
      "418",
      "419",
    ],
    naicsDescription: "Wholesale Trade",
    isedCategory: "Wholesale trade",
    statsCanCoordinates: "1.7.0.0.0.0", // Wholesale trade
  },
  {
    industryId: "automotive",
    naicsCode: "4411",
    alternativeNaicsCodes: ["441", "4412", "4413"],
    naicsDescription: "Automobile Dealers",
    isedCategory: "Retail trade",
    statsCanCoordinates: "1.8.0.0.0.0", // Retail trade (automotive is a subset)
  },
  {
    industryId: "beauty_wellness",
    naicsCode: "8121",
    alternativeNaicsCodes: ["812", "8111", "8129"],
    naicsDescription: "Personal Care Services",
    isedCategory: "Other services (except public administration)",
    statsCanCoordinates: "1.19.0.0.0.0", // Other services
  },
  {
    industryId: "technology",
    naicsCode: "5415",
    alternativeNaicsCodes: ["541", "5112", "5182", "5191"],
    naicsDescription: "Computer Systems Design and Related Services",
    isedCategory: "Professional, scientific and technical services",
    statsCanCoordinates: "1.14.0.0.0.0", // Professional services
  },
];

/**
 * Get NAICS mapping for a PlainLedger industry
 */
export function getNAICSMapping(industryId: string): NAICSMapping | undefined {
  return NAICS_MAPPINGS.find((m) => m.industryId === industryId);
}

/**
 * Get PlainLedger industry ID from NAICS code
 */
export function getIndustryFromNAICS(naicsCode: string): string | undefined {
  // Try exact match first
  const exactMatch = NAICS_MAPPINGS.find((m) => m.naicsCode === naicsCode);
  if (exactMatch) return exactMatch.industryId;

  // Try alternative codes
  const altMatch = NAICS_MAPPINGS.find((m) =>
    m.alternativeNaicsCodes.includes(naicsCode),
  );
  if (altMatch) return altMatch.industryId;

  // Try prefix match (e.g., "7225" matches "722")
  const prefixMatch = NAICS_MAPPINGS.find(
    (m) =>
      naicsCode.startsWith(m.naicsCode.replace("-", "")) ||
      m.alternativeNaicsCodes.some((alt) => naicsCode.startsWith(alt)),
  );
  return prefixMatch?.industryId;
}

/**
 * Get all NAICS codes for an industry (primary + alternatives)
 */
export function getAllNAICSCodes(industryId: string): string[] {
  const mapping = getNAICSMapping(industryId);
  if (!mapping) return [];
  return [mapping.naicsCode, ...mapping.alternativeNaicsCodes];
}

/**
 * Get all industry IDs
 */
export function getAllIndustryIds(): string[] {
  return NAICS_MAPPINGS.map((m) => m.industryId);
}
