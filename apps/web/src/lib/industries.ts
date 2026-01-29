/**
 * Industry Definitions for Quebec Businesses
 * 
 * Pre-configured templates with KPIs, drivers, and financing options
 * for 10 major Quebec industries
 */

import { type Driver, type DriverGroup, generateModelId } from './financialModel';

export interface IndustryTemplate {
  id: string;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  icon: string;
  popular: boolean; // Popular in Quebec
  drivers: DriverTemplate[];
  kpis: KPIDefinition[];
  financingOptions: FinancingOption[];
}

export interface DriverTemplate {
  name: { en: string; fr: string };
  nameEn?: string;
  dataSource: 'manual' | 'account' | 'formula';
  format: 'currency' | 'number' | 'percentage' | 'text';
  decimals?: number;
  formula?: string;
  accountId?: string;
  description?: { en: string; fr: string };
  group: string;
}

export interface KPIDefinition {
  id: string;
  name: { en: string; fr: string };
  formula: string;
  format: 'currency' | 'number' | 'percentage';
  decimals?: number;
  benchmark?: { min: number; max: number; unit: string };
  description?: { en: string; fr: string };
}

export interface FinancingOption {
  id: string;
  type: 'debt' | 'equity' | 'grant';
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  typicalAmount?: { min: number; max: number };
  interestRate?: { min: number; max: number };
  term?: { min: number; max: number }; // months
  eligibility?: string[];
}

// Industry Templates
export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'real_estate',
    name: { en: 'Real Estate', fr: 'Immobilier' },
    description: {
      en: 'Property management, development, and investment',
      fr: 'Gestion immobilière, développement et investissement',
    },
    icon: '🏢',
    popular: true,
    drivers: [
      {
        name: { en: 'Occupancy Rate', fr: 'Taux d\'occupation' },
        nameEn: 'Occupancy Rate',
        dataSource: 'manual',
        format: 'percentage',
        decimals: 1,
        group: 'Revenue',
        description: { en: 'Percentage of units occupied', fr: 'Pourcentage d\'unités occupées' },
      },
      {
        name: { en: 'Rent per Square Foot', fr: 'Loyer par pied carré' },
        nameEn: 'Rent per Square Foot',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Total Square Feet', fr: 'Superficie totale' },
        nameEn: 'Total Square Feet',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Property Taxes', fr: 'Taxes foncières' },
        nameEn: 'Property Taxes',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'property-taxes',
        group: 'Expenses',
      },
      {
        name: { en: 'Maintenance & Repairs', fr: 'Entretien et réparations' },
        nameEn: 'Maintenance & Repairs',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'maintenance',
        group: 'Expenses',
      },
      {
        name: { en: 'Gross Rental Income', fr: 'Revenus locatifs bruts' },
        nameEn: 'Gross Rental Income',
        formula: '=Occupancy Rate * Rent per Square Foot * Total Square Feet',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Net Operating Income', fr: 'Résultat d\'exploitation net' },
        nameEn: 'Net Operating Income',
        formula: '=Gross Rental Income - Property Taxes - Maintenance & Repairs',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'KPIs',
      },
    ],
    kpis: [
      {
        id: 'occupancy_rate',
        name: { en: 'Occupancy Rate', fr: 'Taux d\'occupation' },
        formula: '=Occupancy Rate',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 85, max: 95, unit: '%' },
      },
      {
        id: 'cap_rate',
        name: { en: 'Cap Rate', fr: 'Taux de capitalisation' },
        formula: '=Net Operating Income / Property Value',
        format: 'percentage',
        decimals: 2,
        benchmark: { min: 4, max: 8, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'mortgage',
        type: 'debt',
        name: { en: 'Commercial Mortgage', fr: 'Prêt hypothécaire commercial' },
        description: { en: 'Long-term property financing', fr: 'Financement immobilier à long terme' },
        typicalAmount: { min: 50000, max: 5000000 },
        interestRate: { min: 3.5, max: 6.5 },
        term: { min: 60, max: 300 },
      },
      {
        id: 'investissement_quebec',
        type: 'grant',
        name: { en: 'Investissement Québec', fr: 'Investissement Québec' },
        description: { en: 'Quebec government financing programs', fr: 'Programmes de financement gouvernemental québécois' },
        typicalAmount: { min: 25000, max: 500000 },
      },
    ],
  },
  {
    id: 'construction',
    name: { en: 'Construction', fr: 'Construction' },
    description: {
      en: 'Residential and commercial construction',
      fr: 'Construction résidentielle et commerciale',
    },
    icon: '🏗️',
    popular: true,
    drivers: [
      {
        name: { en: 'Project Revenue', fr: 'Revenus projets' },
        nameEn: 'Project Revenue',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'revenue',
        group: 'Revenue',
      },
      {
        name: { en: 'Direct Costs', fr: 'Coûts directs' },
        nameEn: 'Direct Costs',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'cogs',
        group: 'Expenses',
      },
      {
        name: { en: 'Backlog Value', fr: 'Valeur du carnet de commandes' },
        nameEn: 'Backlog Value',
        dataSource: 'manual',
        format: 'currency',
        decimals: 0,
        group: 'KPIs',
      },
      {
        name: { en: 'Gross Margin', fr: 'Marge brute' },
        nameEn: 'Gross Margin',
        formula: '=(Project Revenue - Direct Costs) / Project Revenue',
        dataSource: 'formula',
        format: 'percentage',
        decimals: 1,
        group: 'KPIs',
      },
    ],
    kpis: [
      {
        id: 'gross_margin',
        name: { en: 'Gross Margin', fr: 'Marge brute' },
        formula: '=Gross Margin',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 15, max: 30, unit: '%' },
      },
      {
        id: 'backlog_months',
        name: { en: 'Backlog (Months)', fr: 'Carnet de commandes (mois)' },
        formula: '=Backlog Value / Average Monthly Revenue',
        format: 'number',
        decimals: 1,
        benchmark: { min: 3, max: 12, unit: 'months' },
      },
    ],
    financingOptions: [
      {
        id: 'bdc_loan',
        type: 'debt',
        name: { en: 'BDC Loan', fr: 'Prêt BDC' },
        description: { en: 'Business Development Bank of Canada financing', fr: 'Financement de la Banque de développement du Canada' },
        typicalAmount: { min: 10000, max: 1000000 },
        interestRate: { min: 4, max: 8 },
        term: { min: 12, max: 120 },
      },
      {
        id: 'line_of_credit',
        type: 'debt',
        name: { en: 'Line of Credit', fr: 'Marge de crédit' },
        description: { en: 'Working capital financing', fr: 'Financement du fonds de roulement' },
        typicalAmount: { min: 25000, max: 500000 },
        interestRate: { min: 5, max: 10 },
      },
    ],
  },
  {
    id: 'hospitality',
    name: { en: 'Hospitality', fr: 'Hôtellerie' },
    description: {
      en: 'Hotels, motels, and accommodation services',
      fr: 'Hôtels, motels et services d\'hébergement',
    },
    icon: '🏨',
    popular: true,
    drivers: [
      {
        name: { en: 'Number of Rooms', fr: 'Nombre de chambres' },
        nameEn: 'Number of Rooms',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Occupancy Rate', fr: 'Taux d\'occupation' },
        nameEn: 'Occupancy Rate',
        dataSource: 'manual',
        format: 'percentage',
        decimals: 1,
        group: 'Revenue',
      },
      {
        name: { en: 'Average Daily Rate', fr: 'Tarif journalier moyen' },
        nameEn: 'Average Daily Rate',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Revenue per Available Room', fr: 'Revenu par chambre disponible' },
        nameEn: 'Revenue per Available Room',
        formula: '=Occupancy Rate * Average Daily Rate',
        dataSource: 'formula',
        format: 'currency',
        decimals: 2,
        group: 'KPIs',
      },
    ],
    kpis: [
      {
        id: 'revpar',
        name: { en: 'RevPAR', fr: 'RevPAR' },
        formula: '=Revenue per Available Room',
        format: 'currency',
        decimals: 2,
        benchmark: { min: 80, max: 150, unit: 'CAD' },
      },
      {
        id: 'occupancy_rate',
        name: { en: 'Occupancy Rate', fr: 'Taux d\'occupation' },
        formula: '=Occupancy Rate',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 60, max: 85, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'hotel_financing',
        type: 'debt',
        name: { en: 'Hotel Financing', fr: 'Financement hôtelier' },
        description: { en: 'Specialized hospitality financing', fr: 'Financement spécialisé en hôtellerie' },
        typicalAmount: { min: 100000, max: 10000000 },
        interestRate: { min: 4, max: 7 },
        term: { min: 60, max: 300 },
      },
    ],
  },
  {
    id: 'restaurant',
    name: { en: 'Restaurant', fr: 'Restauration' },
    description: {
      en: 'Restaurants, cafes, and food service',
      fr: 'Restaurants, cafés et services alimentaires',
    },
    icon: '🍽️',
    popular: true,
    drivers: [
      {
        name: { en: 'Food Sales', fr: 'Ventes alimentaires' },
        nameEn: 'Food Sales',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'food-revenue',
        group: 'Revenue',
      },
      {
        name: { en: 'Beverage Sales', fr: 'Ventes de boissons' },
        nameEn: 'Beverage Sales',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'beverage-revenue',
        group: 'Revenue',
      },
      {
        name: { en: 'Food Cost', fr: 'Coût des aliments' },
        nameEn: 'Food Cost',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'food-cost',
        group: 'Expenses',
      },
      {
        name: { en: 'Labor Cost', fr: 'Coût de la main-d\'oeuvre' },
        nameEn: 'Labor Cost',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'labor-cost',
        group: 'Expenses',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Food Sales + Beverage Sales',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Food Cost %', fr: 'Coût nourriture %' },
        nameEn: 'Food Cost %',
        formula: '=Food Cost / Food Sales',
        dataSource: 'formula',
        format: 'percentage',
        decimals: 1,
        group: 'KPIs',
      },
      {
        name: { en: 'Labor Cost %', fr: 'Coût main-d\'oeuvre %' },
        nameEn: 'Labor Cost %',
        formula: '=Labor Cost / Total Revenue',
        dataSource: 'formula',
        format: 'percentage',
        decimals: 1,
        group: 'KPIs',
      },
      {
        name: { en: 'Prime Cost', fr: 'Coût principal' },
        nameEn: 'Prime Cost',
        formula: '=(Food Cost + Labor Cost) / Total Revenue',
        dataSource: 'formula',
        format: 'percentage',
        decimals: 1,
        group: 'KPIs',
      },
    ],
    kpis: [
      {
        id: 'food_cost_pct',
        name: { en: 'Food Cost %', fr: 'Coût nourriture %' },
        formula: '=Food Cost %',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 28, max: 35, unit: '%' },
      },
      {
        id: 'labor_cost_pct',
        name: { en: 'Labor Cost %', fr: 'Coût main-d\'oeuvre %' },
        formula: '=Labor Cost %',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 25, max: 35, unit: '%' },
      },
      {
        id: 'prime_cost',
        name: { en: 'Prime Cost', fr: 'Coût principal' },
        formula: '=Prime Cost',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 55, max: 65, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'restaurant_financing',
        type: 'debt',
        name: { en: 'Restaurant Financing', fr: 'Financement restaurant' },
        description: { en: 'Equipment and working capital for restaurants', fr: 'Équipement et fonds de roulement pour restaurants' },
        typicalAmount: { min: 50000, max: 500000 },
        interestRate: { min: 5, max: 9 },
        term: { min: 24, max: 84 },
      },
    ],
  },
  {
    id: 'retail',
    name: { en: 'Retail', fr: 'Commerce de détail' },
    description: {
      en: 'Retail stores and e-commerce',
      fr: 'Magasins de détail et commerce électronique',
    },
    icon: '🛍️',
    popular: false,
    drivers: [
      {
        name: { en: 'Sales per Square Foot', fr: 'Ventes par pied carré' },
        nameEn: 'Sales per Square Foot',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Square Feet', fr: 'Pieds carrés' },
        nameEn: 'Square Feet',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Cost of Goods Sold', fr: 'Coût des marchandises vendues' },
        nameEn: 'Cost of Goods Sold',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'cogs',
        group: 'Expenses',
      },
      {
        name: { en: 'Total Sales', fr: 'Ventes totales' },
        nameEn: 'Total Sales',
        formula: '=Sales per Square Foot * Square Feet',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Gross Margin', fr: 'Marge brute' },
        nameEn: 'Gross Margin',
        formula: '=(Total Sales - Cost of Goods Sold) / Total Sales',
        dataSource: 'formula',
        format: 'percentage',
        decimals: 1,
        group: 'KPIs',
      },
    ],
    kpis: [
      {
        id: 'sales_per_sqft',
        name: { en: 'Sales per Square Foot', fr: 'Ventes par pied carré' },
        formula: '=Sales per Square Foot',
        format: 'currency',
        decimals: 2,
        benchmark: { min: 200, max: 500, unit: 'CAD/sqft' },
      },
    ],
    financingOptions: [
      {
        id: 'retail_financing',
        type: 'debt',
        name: { en: 'Retail Financing', fr: 'Financement commerce de détail' },
        description: { en: 'Inventory and store financing', fr: 'Financement d\'inventaire et de magasin' },
        typicalAmount: { min: 25000, max: 500000 },
      },
    ],
  },
  {
    id: 'professional_services',
    name: { en: 'Professional Services', fr: 'Services professionnels' },
    description: {
      en: 'Consulting, legal, accounting, and other professional services',
      fr: 'Conseil, juridique, comptabilité et autres services professionnels',
    },
    icon: '💼',
    popular: false,
    drivers: [
      {
        name: { en: 'Billable Hours', fr: 'Heures facturables' },
        nameEn: 'Billable Hours',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Hourly Rate', fr: 'Taux horaire' },
        nameEn: 'Hourly Rate',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Utilization Rate', fr: 'Taux d\'utilisation' },
        nameEn: 'Utilization Rate',
        dataSource: 'manual',
        format: 'percentage',
        decimals: 1,
        group: 'KPIs',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Billable Hours * Hourly Rate',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'utilization_rate',
        name: { en: 'Utilization Rate', fr: 'Taux d\'utilisation' },
        formula: '=Utilization Rate',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 70, max: 85, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'professional_financing',
        type: 'debt',
        name: { en: 'Professional Services Financing', fr: 'Financement services professionnels' },
        description: { en: 'Working capital for professional firms', fr: 'Fonds de roulement pour cabinets professionnels' },
        typicalAmount: { min: 25000, max: 250000 },
      },
    ],
  },
  {
    id: 'manufacturing',
    name: { en: 'Manufacturing', fr: 'Manufacturier' },
    description: {
      en: 'Production and manufacturing',
      fr: 'Production et fabrication',
    },
    icon: '🏭',
    popular: false,
    drivers: [
      {
        name: { en: 'Units Produced', fr: 'Unités produites' },
        nameEn: 'Units Produced',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Unit Price', fr: 'Prix unitaire' },
        nameEn: 'Unit Price',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Cost per Unit', fr: 'Coût par unité' },
        nameEn: 'Cost per Unit',
        dataSource: 'account',
        format: 'currency',
        decimals: 2,
        accountId: 'unit-cost',
        group: 'Expenses',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Units Produced * Unit Price',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'unit_margin',
        name: { en: 'Unit Margin', fr: 'Marge unitaire' },
        formula: '=(Unit Price - Cost per Unit) / Unit Price',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 20, max: 40, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'manufacturing_financing',
        type: 'debt',
        name: { en: 'Manufacturing Financing', fr: 'Financement manufacturier' },
        description: { en: 'Equipment and working capital for manufacturers', fr: 'Équipement et fonds de roulement pour manufacturiers' },
        typicalAmount: { min: 50000, max: 2000000 },
      },
    ],
  },
  {
    id: 'agriculture',
    name: { en: 'Agriculture', fr: 'Agroalimentaire' },
    description: {
      en: 'Farming, food production, and agribusiness',
      fr: 'Agriculture, production alimentaire et agroalimentaire',
    },
    icon: '🌾',
    popular: false,
    drivers: [
      {
        name: { en: 'Yield per Hectare', fr: 'Rendement par hectare' },
        nameEn: 'Yield per Hectare',
        dataSource: 'manual',
        format: 'number',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Price per Unit', fr: 'Prix par unité' },
        nameEn: 'Price per Unit',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Total Hectares', fr: 'Total hectares' },
        nameEn: 'Total Hectares',
        dataSource: 'manual',
        format: 'number',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Yield per Hectare * Price per Unit * Total Hectares',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'yield_per_hectare',
        name: { en: 'Yield per Hectare', fr: 'Rendement par hectare' },
        formula: '=Yield per Hectare',
        format: 'number',
        decimals: 2,
      },
    ],
    financingOptions: [
      {
        id: 'mapaq_funding',
        type: 'grant',
        name: { en: 'MAPAQ Programs', fr: 'Programmes MAPAQ' },
        description: { en: 'Quebec agriculture ministry funding', fr: 'Financement du ministère de l\'agriculture du Québec' },
        typicalAmount: { min: 10000, max: 200000 },
      },
    ],
  },
  {
    id: 'transport',
    name: { en: 'Transport & Logistics', fr: 'Transport et logistique' },
    description: {
      en: 'Trucking, delivery, and logistics services',
      fr: 'Transport routier, livraison et services logistiques',
    },
    icon: '🚚',
    popular: false,
    drivers: [
      {
        name: { en: 'Cost per Kilometer', fr: 'Coût par kilomètre' },
        nameEn: 'Cost per Kilometer',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Expenses',
      },
      {
        name: { en: 'Revenue per Kilometer', fr: 'Revenu par kilomètre' },
        nameEn: 'Revenue per Kilometer',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Total Kilometers', fr: 'Total kilomètres' },
        nameEn: 'Total Kilometers',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Revenue per Kilometer * Total Kilometers',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'margin_per_km',
        name: { en: 'Margin per Kilometer', fr: 'Marge par kilomètre' },
        formula: '=(Revenue per Kilometer - Cost per Kilometer) / Revenue per Kilometer',
        format: 'percentage',
        decimals: 1,
      },
    ],
    financingOptions: [
      {
        id: 'truck_financing',
        type: 'debt',
        name: { en: 'Truck Financing', fr: 'Financement camion' },
        description: { en: 'Vehicle financing for transport companies', fr: 'Financement de véhicules pour entreprises de transport' },
        typicalAmount: { min: 50000, max: 300000 },
        interestRate: { min: 4, max: 8 },
        term: { min: 36, max: 84 },
      },
    ],
  },
  {
    id: 'healthcare',
    name: { en: 'Healthcare', fr: 'Santé' },
    description: {
      en: 'Medical clinics, dental practices, and healthcare services',
      fr: 'Cliniques médicales, cabinets dentaires et services de santé',
    },
    icon: '🏥',
    popular: false,
    drivers: [
      {
        name: { en: 'Patient Visits', fr: 'Visites patients' },
        nameEn: 'Patient Visits',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Average Revenue per Visit', fr: 'Revenu moyen par visite' },
        nameEn: 'Average Revenue per Visit',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Patient Visits * Average Revenue per Visit',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'revenue_per_patient',
        name: { en: 'Revenue per Patient', fr: 'Revenu par patient' },
        formula: '=Average Revenue per Visit',
        format: 'currency',
        decimals: 2,
        benchmark: { min: 150, max: 400, unit: 'CAD' },
      },
    ],
    financingOptions: [
      {
        id: 'medical_equipment_financing',
        type: 'debt',
        name: { en: 'Medical Equipment Financing', fr: 'Financement équipement médical' },
        description: { en: 'Equipment financing for healthcare facilities', fr: 'Financement d\'équipement pour établissements de santé' },
        typicalAmount: { min: 50000, max: 500000 },
        interestRate: { min: 4, max: 7 },
        term: { min: 36, max: 84 },
      },
    ],
  },
  {
    id: 'education',
    name: { en: 'Education', fr: 'Éducation' },
    description: {
      en: 'Private schools, training centers, and educational services',
      fr: 'Écoles privées, centres de formation et services éducatifs',
    },
    icon: '🎓',
    popular: false,
    drivers: [
      {
        name: { en: 'Number of Students', fr: 'Nombre d\'étudiants' },
        nameEn: 'Number of Students',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Tuition per Student', fr: 'Frais de scolarité par étudiant' },
        nameEn: 'Tuition per Student',
        dataSource: 'manual',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Number of Students * Tuition per Student',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'student_retention_rate',
        name: { en: 'Student Retention Rate', fr: 'Taux de rétention étudiants' },
        formula: '=Returning Students / Total Students',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 75, max: 95, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'education_financing',
        type: 'debt',
        name: { en: 'Education Facility Financing', fr: 'Financement établissement éducatif' },
        description: { en: 'Financing for educational institutions', fr: 'Financement pour établissements d\'enseignement' },
        typicalAmount: { min: 100000, max: 2000000 },
        interestRate: { min: 3.5, max: 6 },
        term: { min: 60, max: 180 },
      },
    ],
  },
  {
    id: 'wholesale',
    name: { en: 'Wholesale & Distribution', fr: 'Commerce de gros et distribution' },
    description: {
      en: 'Wholesale distribution and B2B sales',
      fr: 'Distribution en gros et ventes B2B',
    },
    icon: '📦',
    popular: false,
    drivers: [
      {
        name: { en: 'Units Sold', fr: 'Unités vendues' },
        nameEn: 'Units Sold',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Average Unit Price', fr: 'Prix unitaire moyen' },
        nameEn: 'Average Unit Price',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Cost per Unit', fr: 'Coût par unité' },
        nameEn: 'Cost per Unit',
        dataSource: 'account',
        format: 'currency',
        decimals: 2,
        accountId: 'unit-cost',
        group: 'Expenses',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=Units Sold * Average Unit Price',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'gross_margin',
        name: { en: 'Gross Margin', fr: 'Marge brute' },
        formula: '=(Average Unit Price - Cost per Unit) / Average Unit Price',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 15, max: 30, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'inventory_financing',
        type: 'debt',
        name: { en: 'Inventory Financing', fr: 'Financement inventaire' },
        description: { en: 'Working capital for inventory management', fr: 'Fonds de roulement pour gestion d\'inventaire' },
        typicalAmount: { min: 50000, max: 1000000 },
        interestRate: { min: 5, max: 9 },
      },
    ],
  },
  {
    id: 'automotive',
    name: { en: 'Automotive', fr: 'Automobile' },
    description: {
      en: 'Car dealerships, repair shops, and automotive services',
      fr: 'Concessionnaires automobiles, garages et services automobiles',
    },
    icon: '🚗',
    popular: false,
    drivers: [
      {
        name: { en: 'Vehicles Sold', fr: 'Véhicules vendus' },
        nameEn: 'Vehicles Sold',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Average Sale Price', fr: 'Prix de vente moyen' },
        nameEn: 'Average Sale Price',
        dataSource: 'manual',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Service Revenue', fr: 'Revenus services' },
        nameEn: 'Service Revenue',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'service-revenue',
        group: 'Revenue',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=(Vehicles Sold * Average Sale Price) + Service Revenue',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'service_revenue_pct',
        name: { en: 'Service Revenue %', fr: 'Revenus services %' },
        formula: '=Service Revenue / Total Revenue',
        format: 'percentage',
        decimals: 1,
        benchmark: { min: 20, max: 40, unit: '%' },
      },
    ],
    financingOptions: [
      {
        id: 'automotive_financing',
        type: 'debt',
        name: { en: 'Automotive Business Financing', fr: 'Financement entreprise automobile' },
        description: { en: 'Financing for dealerships and repair shops', fr: 'Financement pour concessionnaires et garages' },
        typicalAmount: { min: 100000, max: 2000000 },
        interestRate: { min: 4.5, max: 8 },
        term: { min: 36, max: 120 },
      },
    ],
  },
  {
    id: 'beauty_wellness',
    name: { en: 'Beauty & Wellness', fr: 'Beauté et bien-être' },
    description: {
      en: 'Salons, spas, fitness centers, and wellness services',
      fr: 'Salons, spas, centres de conditionnement et services de bien-être',
    },
    icon: '💆',
    popular: false,
    drivers: [
      {
        name: { en: 'Client Visits', fr: 'Visites clients' },
        nameEn: 'Client Visits',
        dataSource: 'manual',
        format: 'number',
        decimals: 0,
        group: 'Revenue',
      },
      {
        name: { en: 'Average Service Price', fr: 'Prix service moyen' },
        nameEn: 'Average Service Price',
        dataSource: 'manual',
        format: 'currency',
        decimals: 2,
        group: 'Revenue',
      },
      {
        name: { en: 'Product Sales', fr: 'Ventes produits' },
        nameEn: 'Product Sales',
        dataSource: 'account',
        format: 'currency',
        decimals: 0,
        accountId: 'product-sales',
        group: 'Revenue',
      },
      {
        name: { en: 'Total Revenue', fr: 'Revenus totaux' },
        nameEn: 'Total Revenue',
        formula: '=(Client Visits * Average Service Price) + Product Sales',
        dataSource: 'formula',
        format: 'currency',
        decimals: 0,
        group: 'Revenue',
      },
    ],
    kpis: [
      {
        id: 'revenue_per_client',
        name: { en: 'Revenue per Client', fr: 'Revenu par client' },
        formula: '=Total Revenue / Client Visits',
        format: 'currency',
        decimals: 2,
        benchmark: { min: 80, max: 200, unit: 'CAD' },
      },
    ],
    financingOptions: [
      {
        id: 'beauty_financing',
        type: 'debt',
        name: { en: 'Beauty & Wellness Financing', fr: 'Financement beauté et bien-être' },
        description: { en: 'Equipment and working capital for salons and spas', fr: 'Équipement et fonds de roulement pour salons et spas' },
        typicalAmount: { min: 25000, max: 250000 },
        interestRate: { min: 5, max: 9 },
        term: { min: 24, max: 60 },
      },
    ],
  },
];

/**
 * Get industry template by ID
 */
export function getIndustryTemplate(industryId: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find(t => t.id === industryId);
}

/**
 * Get all industries
 */
export function getAllIndustries(): IndustryTemplate[] {
  return INDUSTRY_TEMPLATES;
}

/**
 * Get popular industries in Quebec
 */
export function getPopularIndustries(): IndustryTemplate[] {
  return INDUSTRY_TEMPLATES.filter(t => t.popular);
}

/**
 * Create financial model from industry template
 */
export function createModelFromTemplate(
  template: IndustryTemplate,
  startDate: Date,
  endDate: Date,
  language: 'en' | 'fr' = 'en'
): { drivers: Record<string, Driver>; groups: DriverGroup[] } {
  const drivers: Record<string, Driver> = {};
  const groupMap = new Map<string, string[]>();
  
  // Create drivers from template
  template.drivers.forEach(driverTemplate => {
    const driverId = generateModelId('driver');
    const driver: Driver = {
      id: driverId,
      name: language === 'fr' ? driverTemplate.name.fr : driverTemplate.name.en,
      nameEn: driverTemplate.nameEn || driverTemplate.name.en,
      values: {},
      dataSource: driverTemplate.dataSource,
      format: driverTemplate.format,
      decimals: driverTemplate.decimals,
      formula: driverTemplate.formula,
      accountId: driverTemplate.accountId,
    };
    
    drivers[driverId] = driver;
    
    // Add to group
    if (!groupMap.has(driverTemplate.group)) {
      groupMap.set(driverTemplate.group, []);
    }
    groupMap.get(driverTemplate.group)!.push(driverId);
  });
  
  // Create groups
  const groups: DriverGroup[] = Array.from(groupMap.entries()).map(([groupName, driverIds], index) => ({
    id: generateModelId('group'),
    name: groupName,
    nameEn: groupName,
    driverIds,
    collapsed: false,
    order: index,
  }));
  
  return { drivers, groups };
}
