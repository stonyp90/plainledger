/**
 * Demo Data Provider
 * Provides realistic sample financial data for demo/test mode
 */

export interface DemoAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  balance: number;
  priorBalance?: number;
}

export interface DemoTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountId: string;
  accountName: string;
  type: 'debit' | 'credit';
  category?: string;
}

export interface DemoAnomaly {
  id: string;
  type: 'duplicate' | 'fraud' | 'spike' | 'timing';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  amount: number;
  date: string;
  confidence: number;
  accountId?: string;
  transactionIds?: string[];
}

export interface DemoKPI {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

// Sample Chart of Accounts
export const DEMO_ACCOUNTS: DemoAccount[] = [
  // Assets
  { id: 'acc-001', code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', category: 'Current Assets', balance: 234500, priorBalance: 198200 },
  { id: 'acc-002', code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'Current Assets', balance: 156200, priorBalance: 142800 },
  { id: 'acc-003', code: '1200', name: 'Inventory', type: 'asset', category: 'Current Assets', balance: 89300, priorBalance: 78500 },
  { id: 'acc-004', code: '1500', name: 'Property, Plant & Equipment', type: 'asset', category: 'Fixed Assets', balance: 765000, priorBalance: 683000 },
  { id: 'acc-005', code: '1600', name: 'Accumulated Depreciation', type: 'asset', category: 'Fixed Assets', balance: -125000, priorBalance: -98000 },
  
  // Liabilities
  { id: 'acc-006', code: '2000', name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities', balance: 87500, priorBalance: 92000 },
  { id: 'acc-007', code: '2100', name: 'Accrued Expenses', type: 'liability', category: 'Current Liabilities', balance: 45200, priorBalance: 38000 },
  { id: 'acc-008', code: '2500', name: 'Long-term Debt', type: 'liability', category: 'Long-term Liabilities', balance: 320000, priorBalance: 350000 },
  
  // Equity
  { id: 'acc-009', code: '3000', name: 'Common Stock', type: 'equity', category: 'Equity', balance: 500000, priorBalance: 500000 },
  { id: 'acc-010', code: '3100', name: 'Retained Earnings', type: 'equity', category: 'Equity', balance: 234300, priorBalance: 189500 },
  
  // Revenue
  { id: 'acc-011', code: '4000', name: 'Product Sales', type: 'revenue', category: 'Revenue', balance: 1245000, priorBalance: 1120000 },
  { id: 'acc-012', code: '4100', name: 'Service Revenue', type: 'revenue', category: 'Revenue', balance: 456000, priorBalance: 420000 },
  
  // Expenses
  { id: 'acc-013', code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'Cost of Sales', balance: 680000, priorBalance: 610000 },
  { id: 'acc-014', code: '6000', name: 'Salaries and Wages', type: 'expense', category: 'Operating Expenses', balance: 124500, priorBalance: 120000 },
  { id: 'acc-015', code: '6100', name: 'Marketing', type: 'expense', category: 'Operating Expenses', balance: 45200, priorBalance: 35000 },
  { id: 'acc-016', code: '6200', name: 'Rent', type: 'expense', category: 'Operating Expenses', balance: 36000, priorBalance: 36000 },
  { id: 'acc-017', code: '6300', name: 'Software & Subscriptions', type: 'expense', category: 'Operating Expenses', balance: 18500, priorBalance: 20000 },
];

// Sample Transactions
export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { id: 'txn-001', date: '2026-01-15', description: 'Invoice #4521 - Acme Corp', amount: 12500, accountId: 'acc-011', accountName: 'Product Sales', type: 'credit', category: 'Revenue' },
  { id: 'txn-002', date: '2026-01-15', description: 'Payment received - Invoice #4521', amount: 12500, accountId: 'acc-001', accountName: 'Cash', type: 'debit', category: 'Payment' },
  { id: 'txn-003', date: '2026-01-14', description: 'Vendor Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-006', accountName: 'Accounts Payable', type: 'debit', category: 'Payment' },
  { id: 'txn-004', date: '2026-01-14', description: 'Vendor Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Payment' },
  { id: 'txn-005', date: '2026-01-13', description: 'Duplicate Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-006', accountName: 'Accounts Payable', type: 'debit', category: 'Payment' },
  { id: 'txn-006', date: '2026-01-13', description: 'Duplicate Payment - Office Supplies Inc', amount: 4500, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Payment' },
  { id: 'txn-007', date: '2026-01-12', description: 'Payroll - January 2026', amount: 124500, accountId: 'acc-014', accountName: 'Salaries', type: 'debit', category: 'Payroll' },
  { id: 'txn-008', date: '2026-01-12', description: 'Payroll - January 2026', amount: 124500, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Payroll' },
  { id: 'txn-009', date: '2026-01-10', description: 'Marketing Campaign - Q1 2026', amount: 45200, accountId: 'acc-015', accountName: 'Marketing', type: 'debit', category: 'Marketing' },
  { id: 'txn-010', date: '2026-01-10', description: 'Marketing Campaign - Q1 2026', amount: 45200, accountId: 'acc-001', accountName: 'Cash', type: 'credit', category: 'Marketing' },
];

// Sample Generic Anomalies (fallback)
export const DEMO_ANOMALIES: DemoAnomaly[] = [
  {
    id: 'anom-001',
    type: 'duplicate',
    severity: 'critical',
    title: 'Duplicate Payment Detected',
    titleFr: 'Paiement en double détecté',
    description: 'Invoice #4521 paid twice - AI flagged',
    descriptionFr: 'Facture #4521 payée deux fois - signalé par l\'IA',
    amount: 12450,
    date: '2026-01-15',
    confidence: 99,
    accountId: 'acc-006',
    transactionIds: ['txn-003', 'txn-005'],
  },
  {
    id: 'anom-002',
    type: 'fraud',
    severity: 'critical',
    title: 'Fraudulent Transaction Pattern',
    titleFr: 'Schéma de transaction frauduleux',
    description: 'Unusual vendor payment sequence detected',
    descriptionFr: 'Séquence de paiement fournisseur inhabituelle détectée',
    amount: 45230,
    date: '2026-01-14',
    confidence: 96,
    accountId: 'acc-006',
    transactionIds: ['txn-003', 'txn-004'],
  },
  {
    id: 'anom-003',
    type: 'spike',
    severity: 'warning',
    title: 'Expense Spike Anomaly',
    titleFr: 'Pic de dépenses anormal',
    description: 'Marketing 340% above historical average',
    descriptionFr: 'Marketing 340% au-dessus de la moyenne historique',
    amount: 28500,
    date: '2026-01-10',
    confidence: 94,
    accountId: 'acc-015',
    transactionIds: ['txn-009'],
  },
  {
    id: 'anom-004',
    type: 'timing',
    severity: 'warning',
    title: 'Revenue Recognition Issue',
    titleFr: 'Problème de reconnaissance des revenus',
    description: 'Timing variance detected in Q4',
    descriptionFr: 'Écart de timing détecté au T4',
    amount: 67000,
    date: '2026-01-12',
    confidence: 91,
    accountId: 'acc-011',
    transactionIds: ['txn-001'],
  },
];

// Industry-Specific Anomalies
export const DEMO_ANOMALIES_BY_INDUSTRY: Record<string, DemoAnomaly[]> = {
  // Real Estate
  real_estate: [
    {
      id: 'anom-re-001',
      type: 'spike',
      severity: 'critical',
      title: 'Vacancy Rate Spike',
      titleFr: 'Hausse du taux de vacance',
      description: 'Occupancy dropped 18% vs last month - 5 units vacant',
      descriptionFr: 'Taux d\'occupation en baisse de 18% vs mois dernier - 5 unités vacantes',
      amount: 45000,
      date: '2026-01-15',
      confidence: 98,
      accountId: 'acc-rent-receivable',
    },
    {
      id: 'anom-re-002',
      type: 'timing',
      severity: 'warning',
      title: 'Late Rent Collection Pattern',
      titleFr: 'Retards de perception des loyers',
      description: '12 tenants paid after the 15th, up from 4 last month',
      descriptionFr: '12 locataires ont payé après le 15, contre 4 le mois dernier',
      amount: 78500,
      date: '2026-01-18',
      confidence: 95,
      accountId: 'acc-rent-receivable',
    },
    {
      id: 'anom-re-003',
      type: 'spike',
      severity: 'critical',
      title: 'Property Maintenance Spike',
      titleFr: 'Pic des coûts d\'entretien',
      description: 'Maintenance costs 250% above 12-month average',
      descriptionFr: 'Coûts d\'entretien 250% au-dessus de la moyenne sur 12 mois',
      amount: 32000,
      date: '2026-01-12',
      confidence: 97,
      accountId: 'acc-maintenance',
    },
    {
      id: 'anom-re-004',
      type: 'fraud',
      severity: 'warning',
      title: 'Duplicate Property Tax Payment',
      titleFr: 'Paiement de taxes foncières en double',
      description: 'Same municipal tax invoice paid twice - Unit 5A',
      descriptionFr: 'Même facture de taxes municipales payée deux fois - Unité 5A',
      amount: 8450,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-property-tax',
    },
    {
      id: 'anom-re-005',
      type: 'timing',
      severity: 'info',
      title: 'CAM Reconciliation Due',
      titleFr: 'Réconciliation des frais communs en retard',
      description: 'Common Area Maintenance reconciliation 30 days overdue',
      descriptionFr: 'Réconciliation des frais communs en retard de 30 jours',
      amount: 15000,
      date: '2026-01-05',
      confidence: 100,
      accountId: 'acc-cam',
    },
  ],

  // Restaurant
  restaurant: [
    {
      id: 'anom-rest-001',
      type: 'spike',
      severity: 'critical',
      title: 'Food Cost Spike',
      titleFr: 'Pic des coûts alimentaires',
      description: 'Food cost at 38% vs target 28% - supplier pricing issue',
      descriptionFr: 'Coût nourriture à 38% vs cible 28% - problème de tarification fournisseur',
      amount: 18500,
      date: '2026-01-14',
      confidence: 98,
      accountId: 'acc-food-cost',
    },
    {
      id: 'anom-rest-002',
      type: 'spike',
      severity: 'critical',
      title: 'Labor Cost Exceeds Budget',
      titleFr: 'Coûts de main-d\'œuvre dépassent le budget',
      description: 'Labor at 42% of revenue vs 32% target - overtime spike',
      descriptionFr: 'Main-d\'œuvre à 42% des revenus vs cible 32% - pic d\'heures supplémentaires',
      amount: 24000,
      date: '2026-01-15',
      confidence: 96,
      accountId: 'acc-labor',
    },
    {
      id: 'anom-rest-003',
      type: 'timing',
      severity: 'warning',
      title: 'Weekend Revenue Drop',
      titleFr: 'Baisse des revenus du week-end',
      description: 'Saturday revenue down 35% vs 4-week average',
      descriptionFr: 'Revenus du samedi en baisse de 35% vs moyenne sur 4 semaines',
      amount: 8500,
      date: '2026-01-11',
      confidence: 94,
      accountId: 'acc-revenue',
    },
    {
      id: 'anom-rest-004',
      type: 'fraud',
      severity: 'warning',
      title: 'Unusual Void Pattern',
      titleFr: 'Schéma d\'annulations inhabituel',
      description: '23 voids on single server terminal - potential issue',
      descriptionFr: '23 annulations sur un seul terminal de serveur - problème potentiel',
      amount: 1250,
      date: '2026-01-13',
      confidence: 92,
      accountId: 'acc-revenue',
    },
    {
      id: 'anom-rest-005',
      type: 'spike',
      severity: 'info',
      title: 'Beverage Cost Trending Up',
      titleFr: 'Coûts des boissons en hausse',
      description: 'Bar pour cost at 24% vs 18% target for 3 consecutive weeks',
      descriptionFr: 'Coût de service bar à 24% vs cible 18% depuis 3 semaines consécutives',
      amount: 3200,
      date: '2026-01-10',
      confidence: 89,
      accountId: 'acc-beverage-cost',
    },
  ],

  // Hospitality
  hospitality: [
    {
      id: 'anom-hosp-001',
      type: 'spike',
      severity: 'critical',
      title: 'RevPAR Below Threshold',
      titleFr: 'RevPAR sous le seuil',
      description: 'RevPAR at $72 vs $95 market average - 24% gap',
      descriptionFr: 'RevPAR à 72$ vs moyenne du marché 95$ - écart de 24%',
      amount: 45000,
      date: '2026-01-15',
      confidence: 97,
      accountId: 'acc-room-revenue',
    },
    {
      id: 'anom-hosp-002',
      type: 'timing',
      severity: 'warning',
      title: 'No-Show Rate Spike',
      titleFr: 'Hausse du taux de non-présentation',
      description: 'No-shows at 12% vs 3% historical - deposit policy needed',
      descriptionFr: 'Non-présentations à 12% vs 3% historique - politique de dépôt requise',
      amount: 18500,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-room-revenue',
    },
    {
      id: 'anom-hosp-003',
      type: 'spike',
      severity: 'warning',
      title: 'Housekeeping Cost Spike',
      titleFr: 'Pic des coûts d\'entretien ménager',
      description: 'Cost per occupied room up 40% - supply costs increased',
      descriptionFr: 'Coût par chambre occupée en hausse de 40% - coûts des fournitures accrus',
      amount: 8200,
      date: '2026-01-12',
      confidence: 93,
      accountId: 'acc-housekeeping',
    },
    {
      id: 'anom-hosp-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Double Booking Refund Pattern',
      titleFr: 'Schéma de remboursements de double réservation',
      description: '8 double-booking refunds this week vs 1 monthly average',
      descriptionFr: '8 remboursements pour double réservation cette semaine vs 1 en moyenne mensuelle',
      amount: 6400,
      date: '2026-01-10',
      confidence: 98,
      accountId: 'acc-refunds',
    },
    {
      id: 'anom-hosp-005',
      type: 'timing',
      severity: 'info',
      title: 'Late Check-out Revenue',
      titleFr: 'Revenus des départs tardifs',
      description: 'Late check-out fees down 60% - policy enforcement issue',
      descriptionFr: 'Frais de départ tardif en baisse de 60% - problème d\'application de la politique',
      amount: 2100,
      date: '2026-01-08',
      confidence: 88,
      accountId: 'acc-ancillary',
    },
  ],

  // Retail
  retail: [
    {
      id: 'anom-ret-001',
      type: 'spike',
      severity: 'critical',
      title: 'Inventory Shrinkage Alert',
      titleFr: 'Alerte de perte de stock',
      description: 'Shrinkage at 3.8% vs 1.5% target - potential theft',
      descriptionFr: 'Perte de stock à 3.8% vs cible 1.5% - vol potentiel',
      amount: 28500,
      date: '2026-01-15',
      confidence: 97,
      accountId: 'acc-inventory',
    },
    {
      id: 'anom-ret-002',
      type: 'spike',
      severity: 'warning',
      title: 'Sales per Sq Ft Decline',
      titleFr: 'Baisse des ventes par pi²',
      description: '$285/sqft vs $420 benchmark - 32% below target',
      descriptionFr: '285$/pi² vs référence 420$ - 32% sous la cible',
      amount: 45000,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-sales',
    },
    {
      id: 'anom-ret-003',
      type: 'timing',
      severity: 'critical',
      title: 'GMROI Below Threshold',
      titleFr: 'GMROI sous le seuil',
      description: 'Gross Margin ROI at 1.8 vs 3.0 target - overstocking issue',
      descriptionFr: 'Retour sur marge brute à 1.8 vs cible 3.0 - problème de surstockage',
      amount: 62000,
      date: '2026-01-12',
      confidence: 96,
      accountId: 'acc-inventory',
    },
    {
      id: 'anom-ret-004',
      type: 'fraud',
      severity: 'warning',
      title: 'Return Rate Anomaly',
      titleFr: 'Anomalie du taux de retour',
      description: 'Returns at 18% vs 8% average - possible return fraud',
      descriptionFr: 'Retours à 18% vs moyenne 8% - fraude potentielle aux retours',
      amount: 12500,
      date: '2026-01-10',
      confidence: 91,
      accountId: 'acc-returns',
    },
    {
      id: 'anom-ret-005',
      type: 'duplicate',
      severity: 'info',
      title: 'Duplicate Supplier Invoice',
      titleFr: 'Facture fournisseur en double',
      description: 'Invoice #INV-2024-847 submitted twice by vendor',
      descriptionFr: 'Facture #INV-2024-847 soumise deux fois par le fournisseur',
      amount: 4500,
      date: '2026-01-08',
      confidence: 99,
      accountId: 'acc-payables',
    },
  ],

  // Construction
  construction: [
    {
      id: 'anom-con-001',
      type: 'spike',
      severity: 'critical',
      title: 'Project Cost Overrun',
      titleFr: 'Dépassement de coûts du projet',
      description: 'Project #2024-15 at 145% of budget - material costs',
      descriptionFr: 'Projet #2024-15 à 145% du budget - coûts des matériaux',
      amount: 125000,
      date: '2026-01-15',
      confidence: 98,
      accountId: 'acc-project-costs',
    },
    {
      id: 'anom-con-002',
      type: 'timing',
      severity: 'critical',
      title: 'Subcontractor Payment Delay',
      titleFr: 'Retard de paiement sous-traitants',
      description: '4 subcontractors past 60-day payment terms',
      descriptionFr: '4 sous-traitants au-delà des termes de paiement de 60 jours',
      amount: 89000,
      date: '2026-01-14',
      confidence: 96,
      accountId: 'acc-subcontractor',
    },
    {
      id: 'anom-con-003',
      type: 'spike',
      severity: 'warning',
      title: 'Material Price Variance',
      titleFr: 'Variance des prix des matériaux',
      description: 'Lumber costs 35% above estimate - supplier change needed',
      descriptionFr: 'Coûts du bois 35% au-dessus de l\'estimation - changement de fournisseur requis',
      amount: 28500,
      date: '2026-01-12',
      confidence: 94,
      accountId: 'acc-materials',
    },
    {
      id: 'anom-con-004',
      type: 'fraud',
      severity: 'warning',
      title: 'Duplicate Equipment Rental',
      titleFr: 'Location d\'équipement en double',
      description: 'Same excavator billed twice in January',
      descriptionFr: 'Même excavatrice facturée deux fois en janvier',
      amount: 4800,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-equipment',
    },
    {
      id: 'anom-con-005',
      type: 'timing',
      severity: 'info',
      title: 'Backlog Months Declining',
      titleFr: 'Carnet de commandes en déclin',
      description: 'Project backlog at 2.5 months vs 6 month target',
      descriptionFr: 'Carnet de commandes à 2.5 mois vs cible de 6 mois',
      amount: 450000,
      date: '2026-01-08',
      confidence: 92,
      accountId: 'acc-backlog',
    },
  ],

  // Professional Services
  professional_services: [
    {
      id: 'anom-ps-001',
      type: 'spike',
      severity: 'critical',
      title: 'Utilization Rate Drop',
      titleFr: 'Baisse du taux d\'utilisation',
      description: 'Billable utilization at 58% vs 75% target',
      descriptionFr: 'Utilisation facturable à 58% vs cible 75%',
      amount: 85000,
      date: '2026-01-15',
      confidence: 97,
      accountId: 'acc-revenue',
    },
    {
      id: 'anom-ps-002',
      type: 'timing',
      severity: 'warning',
      title: 'AR Aging Concern',
      titleFr: 'Préoccupation sur le vieillissement des créances',
      description: '45% of AR over 60 days vs 15% target',
      descriptionFr: '45% des créances dépassent 60 jours vs cible 15%',
      amount: 125000,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-receivables',
    },
    {
      id: 'anom-ps-003',
      type: 'spike',
      severity: 'warning',
      title: 'Realization Rate Below Target',
      titleFr: 'Taux de réalisation sous la cible',
      description: 'Billing realization at 72% vs 90% target',
      descriptionFr: 'Réalisation de facturation à 72% vs cible 90%',
      amount: 45000,
      date: '2026-01-12',
      confidence: 93,
      accountId: 'acc-wip',
    },
    {
      id: 'anom-ps-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Duplicate Client Invoice',
      titleFr: 'Facture client en double',
      description: 'Client ABC Corp billed twice for same engagement',
      descriptionFr: 'Client ABC Corp facturé deux fois pour le même mandat',
      amount: 18500,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-receivables',
    },
    {
      id: 'anom-ps-005',
      type: 'timing',
      severity: 'info',
      title: 'WIP Buildup Alert',
      titleFr: 'Alerte d\'accumulation des travaux en cours',
      description: 'Unbilled WIP 40% above 90-day average',
      descriptionFr: 'Travaux en cours non facturés 40% au-dessus de la moyenne sur 90 jours',
      amount: 78000,
      date: '2026-01-08',
      confidence: 91,
      accountId: 'acc-wip',
    },
  ],

  // Manufacturing
  manufacturing: [
    {
      id: 'anom-man-001',
      type: 'spike',
      severity: 'critical',
      title: 'Production Cost Variance',
      titleFr: 'Variance des coûts de production',
      description: 'Unit cost at $45 vs $32 standard - 40% variance',
      descriptionFr: 'Coût unitaire à 45$ vs standard 32$ - variance de 40%',
      amount: 156000,
      date: '2026-01-15',
      confidence: 98,
      accountId: 'acc-production',
    },
    {
      id: 'anom-man-002',
      type: 'spike',
      severity: 'critical',
      title: 'Raw Material Waste',
      titleFr: 'Gaspillage de matières premières',
      description: 'Scrap rate at 8.5% vs 3% target - quality issue',
      descriptionFr: 'Taux de rebuts à 8.5% vs cible 3% - problème de qualité',
      amount: 42000,
      date: '2026-01-14',
      confidence: 96,
      accountId: 'acc-materials',
    },
    {
      id: 'anom-man-003',
      type: 'timing',
      severity: 'warning',
      title: 'Inventory Days Increasing',
      titleFr: 'Jours d\'inventaire en hausse',
      description: 'Inventory days at 95 vs 60 target - demand slowdown',
      descriptionFr: 'Jours d\'inventaire à 95 vs cible 60 - ralentissement de la demande',
      amount: 285000,
      date: '2026-01-12',
      confidence: 94,
      accountId: 'acc-inventory',
    },
    {
      id: 'anom-man-004',
      type: 'fraud',
      severity: 'warning',
      title: 'Duplicate Supplier Payment',
      titleFr: 'Paiement fournisseur en double',
      description: 'Steel supplier Invoice #2024-1847 paid twice',
      descriptionFr: 'Facture #2024-1847 du fournisseur d\'acier payée deux fois',
      amount: 28500,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-payables',
    },
    {
      id: 'anom-man-005',
      type: 'spike',
      severity: 'info',
      title: 'Energy Cost Spike',
      titleFr: 'Pic des coûts énergétiques',
      description: 'Utility costs up 25% - equipment efficiency issue',
      descriptionFr: 'Coûts des services publics en hausse de 25% - problème d\'efficacité des équipements',
      amount: 18000,
      date: '2026-01-08',
      confidence: 90,
      accountId: 'acc-utilities',
    },
  ],

  // Agriculture
  agriculture: [
    {
      id: 'anom-agr-001',
      type: 'spike',
      severity: 'critical',
      title: 'Yield Below Projection',
      titleFr: 'Rendement sous les projections',
      description: 'Harvest yield 35% below seasonal average',
      descriptionFr: 'Rendement de récolte 35% sous la moyenne saisonnière',
      amount: 125000,
      date: '2026-01-15',
      confidence: 97,
      accountId: 'acc-crop-revenue',
    },
    {
      id: 'anom-agr-002',
      type: 'spike',
      severity: 'warning',
      title: 'Input Cost Spike',
      titleFr: 'Pic des coûts des intrants',
      description: 'Fertilizer costs 45% above budget',
      descriptionFr: 'Coûts d\'engrais 45% au-dessus du budget',
      amount: 32000,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-inputs',
    },
    {
      id: 'anom-agr-003',
      type: 'timing',
      severity: 'warning',
      title: 'Seasonal Cash Flow Gap',
      titleFr: 'Écart de trésorerie saisonnier',
      description: 'Cash position 60% below seasonal average',
      descriptionFr: 'Position de trésorerie 60% sous la moyenne saisonnière',
      amount: 85000,
      date: '2026-01-12',
      confidence: 93,
      accountId: 'acc-cash',
    },
    {
      id: 'anom-agr-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Duplicate Equipment Lease',
      titleFr: 'Location d\'équipement en double',
      description: 'Same tractor lease charged twice in Q1',
      descriptionFr: 'Même location de tracteur facturée deux fois au T1',
      amount: 12500,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-equipment',
    },
    {
      id: 'anom-agr-005',
      type: 'timing',
      severity: 'info',
      title: 'Grant Payment Delayed',
      titleFr: 'Paiement de subvention en retard',
      description: 'MAPAQ grant 45 days overdue - follow up required',
      descriptionFr: 'Subvention MAPAQ en retard de 45 jours - suivi requis',
      amount: 45000,
      date: '2026-01-08',
      confidence: 100,
      accountId: 'acc-grants',
    },
  ],

  // Transport & Logistics
  transport: [
    {
      id: 'anom-tra-001',
      type: 'spike',
      severity: 'critical',
      title: 'Fuel Cost Spike',
      titleFr: 'Pic des coûts de carburant',
      description: 'Cost per km at $0.85 vs $0.62 target - 37% variance',
      descriptionFr: 'Coût par km à 0.85$ vs cible 0.62$ - variance de 37%',
      amount: 42000,
      date: '2026-01-15',
      confidence: 98,
      accountId: 'acc-fuel',
    },
    {
      id: 'anom-tra-002',
      type: 'spike',
      severity: 'warning',
      title: 'Vehicle Maintenance Spike',
      titleFr: 'Pic des coûts d\'entretien des véhicules',
      description: 'Repair costs 180% of monthly average - fleet aging',
      descriptionFr: 'Coûts de réparation à 180% de la moyenne mensuelle - vieillissement de la flotte',
      amount: 28500,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-maintenance',
    },
    {
      id: 'anom-tra-003',
      type: 'timing',
      severity: 'warning',
      title: 'Empty Mile Ratio High',
      titleFr: 'Ratio de kilomètres à vide élevé',
      description: 'Deadhead miles at 28% vs 15% target',
      descriptionFr: 'Kilomètres à vide à 28% vs cible 15%',
      amount: 18000,
      date: '2026-01-12',
      confidence: 93,
      accountId: 'acc-operations',
    },
    {
      id: 'anom-tra-004',
      type: 'fraud',
      severity: 'critical',
      title: 'Fuel Card Anomaly',
      titleFr: 'Anomalie de carte carburant',
      description: 'Unusual fuel purchases on weekend - potential misuse',
      descriptionFr: 'Achats de carburant inhabituels la fin de semaine - utilisation abusive potentielle',
      amount: 2800,
      date: '2026-01-10',
      confidence: 92,
      accountId: 'acc-fuel',
    },
    {
      id: 'anom-tra-005',
      type: 'duplicate',
      severity: 'info',
      title: 'Toll Payment Duplicate',
      titleFr: 'Paiement de péage en double',
      description: 'Highway toll invoice duplicated for Route 401',
      descriptionFr: 'Facture de péage d\'autoroute dupliquée pour la Route 401',
      amount: 450,
      date: '2026-01-08',
      confidence: 99,
      accountId: 'acc-tolls',
    },
  ],

  // Healthcare
  healthcare: [
    {
      id: 'anom-hea-001',
      type: 'spike',
      severity: 'critical',
      title: 'Claim Denial Rate Spike',
      titleFr: 'Pic du taux de refus de réclamations',
      description: 'Insurance denials at 18% vs 5% target',
      descriptionFr: 'Refus d\'assurance à 18% vs cible 5%',
      amount: 85000,
      date: '2026-01-15',
      confidence: 97,
      accountId: 'acc-receivables',
    },
    {
      id: 'anom-hea-002',
      type: 'timing',
      severity: 'warning',
      title: 'Patient AR Aging',
      titleFr: 'Vieillissement des créances patients',
      description: '40% of patient AR over 90 days - collections needed',
      descriptionFr: '40% des créances patients dépassent 90 jours - recouvrement requis',
      amount: 125000,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-patient-ar',
    },
    {
      id: 'anom-hea-003',
      type: 'spike',
      severity: 'warning',
      title: 'Medical Supply Cost Spike',
      titleFr: 'Pic des coûts de fournitures médicales',
      description: 'Supply costs 28% above budget - vendor review needed',
      descriptionFr: 'Coûts des fournitures 28% au-dessus du budget - révision des fournisseurs requise',
      amount: 18500,
      date: '2026-01-12',
      confidence: 94,
      accountId: 'acc-supplies',
    },
    {
      id: 'anom-hea-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Duplicate Patient Billing',
      titleFr: 'Facturation patient en double',
      description: 'Patient #P-2024-847 billed twice for same procedure',
      descriptionFr: 'Patient #P-2024-847 facturé deux fois pour la même procédure',
      amount: 4500,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-revenue',
    },
    {
      id: 'anom-hea-005',
      type: 'timing',
      severity: 'info',
      title: 'Revenue per Visit Declining',
      titleFr: 'Revenus par visite en déclin',
      description: 'Avg revenue per patient down 15% vs Q4',
      descriptionFr: 'Revenu moyen par patient en baisse de 15% vs T4',
      amount: 32000,
      date: '2026-01-08',
      confidence: 91,
      accountId: 'acc-revenue',
    },
  ],

  // Education
  education: [
    {
      id: 'anom-edu-001',
      type: 'timing',
      severity: 'critical',
      title: 'Tuition Collection Delay',
      titleFr: 'Retard de perception des frais de scolarité',
      description: '25% of tuition unpaid 30 days past due date',
      descriptionFr: '25% des frais de scolarité impayés 30 jours après l\'échéance',
      amount: 185000,
      date: '2026-01-15',
      confidence: 98,
      accountId: 'acc-tuition',
    },
    {
      id: 'anom-edu-002',
      type: 'spike',
      severity: 'warning',
      title: 'Student Retention Drop',
      titleFr: 'Baisse de la rétention des étudiants',
      description: 'Re-enrollment at 72% vs 85% target',
      descriptionFr: 'Réinscription à 72% vs cible 85%',
      amount: 450000,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-tuition',
    },
    {
      id: 'anom-edu-003',
      type: 'spike',
      severity: 'warning',
      title: 'Faculty Overtime Spike',
      titleFr: 'Pic des heures supplémentaires du personnel',
      description: 'Overtime costs 45% above budget',
      descriptionFr: 'Coûts des heures supplémentaires 45% au-dessus du budget',
      amount: 28500,
      date: '2026-01-12',
      confidence: 93,
      accountId: 'acc-salaries',
    },
    {
      id: 'anom-edu-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Scholarship Double-Posted',
      titleFr: 'Bourse créditée en double',
      description: 'Same scholarship credited twice to student account',
      descriptionFr: 'Même bourse créditée deux fois au compte étudiant',
      amount: 8500,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-scholarships',
    },
    {
      id: 'anom-edu-005',
      type: 'timing',
      severity: 'info',
      title: 'Facility Rental Revenue Down',
      titleFr: 'Revenus de location d\'installations en baisse',
      description: 'Facility rentals 35% below projection',
      descriptionFr: 'Locations d\'installations 35% sous les projections',
      amount: 12000,
      date: '2026-01-08',
      confidence: 90,
      accountId: 'acc-rentals',
    },
  ],

  // Wholesale & Distribution
  wholesale: [
    {
      id: 'anom-who-001',
      type: 'spike',
      severity: 'critical',
      title: 'Gross Margin Compression',
      titleFr: 'Compression de la marge brute',
      description: 'Margin at 12% vs 22% target - pricing pressure',
      descriptionFr: 'Marge à 12% vs cible 22% - pression sur les prix',
      amount: 185000,
      date: '2026-01-15',
      confidence: 98,
      accountId: 'acc-sales',
    },
    {
      id: 'anom-who-002',
      type: 'timing',
      severity: 'warning',
      title: 'Inventory Turns Slowing',
      titleFr: 'Ralentissement de la rotation des stocks',
      description: 'Turns at 4.2x vs 8x target - slow-moving stock',
      descriptionFr: 'Rotation à 4.2x vs cible 8x - stock à rotation lente',
      amount: 320000,
      date: '2026-01-14',
      confidence: 96,
      accountId: 'acc-inventory',
    },
    {
      id: 'anom-who-003',
      type: 'spike',
      severity: 'warning',
      title: 'Warehouse Cost Spike',
      titleFr: 'Pic des coûts d\'entreposage',
      description: 'Storage costs up 35% - space optimization needed',
      descriptionFr: 'Coûts d\'entreposage en hausse de 35% - optimisation de l\'espace requise',
      amount: 18500,
      date: '2026-01-12',
      confidence: 94,
      accountId: 'acc-warehouse',
    },
    {
      id: 'anom-who-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Duplicate Purchase Order',
      titleFr: 'Bon de commande en double',
      description: 'PO #2024-1523 processed twice with vendor',
      descriptionFr: 'BC #2024-1523 traité deux fois avec le fournisseur',
      amount: 45000,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-inventory',
    },
    {
      id: 'anom-who-005',
      type: 'fraud',
      severity: 'info',
      title: 'Shipping Cost Variance',
      titleFr: 'Variance des coûts d\'expédition',
      description: 'Freight costs 20% above quoted rates',
      descriptionFr: 'Coûts de transport 20% au-dessus des tarifs cotés',
      amount: 8500,
      date: '2026-01-08',
      confidence: 91,
      accountId: 'acc-freight',
    },
  ],

  // Automotive
  automotive: [
    {
      id: 'anom-auto-001',
      type: 'spike',
      severity: 'critical',
      title: 'Vehicle Margin Decline',
      titleFr: 'Baisse de la marge sur véhicules',
      description: 'Per-unit margin at $1,200 vs $2,800 target',
      descriptionFr: 'Marge par unité à 1 200$ vs cible 2 800$',
      amount: 128000,
      date: '2026-01-15',
      confidence: 97,
      accountId: 'acc-vehicle-sales',
    },
    {
      id: 'anom-auto-002',
      type: 'timing',
      severity: 'warning',
      title: 'Floor Plan Interest Spike',
      titleFr: 'Pic des intérêts sur financement d\'inventaire',
      description: 'Interest costs up 45% - inventory aging',
      descriptionFr: 'Coûts d\'intérêts en hausse de 45% - vieillissement de l\'inventaire',
      amount: 32000,
      date: '2026-01-14',
      confidence: 95,
      accountId: 'acc-floorplan',
    },
    {
      id: 'anom-auto-003',
      type: 'spike',
      severity: 'warning',
      title: 'Service Revenue Below Target',
      titleFr: 'Revenus de service sous la cible',
      description: 'Service dept at 18% of revenue vs 30% target',
      descriptionFr: 'Département service à 18% des revenus vs cible 30%',
      amount: 85000,
      date: '2026-01-12',
      confidence: 93,
      accountId: 'acc-service',
    },
    {
      id: 'anom-auto-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Duplicate Parts Invoice',
      titleFr: 'Facture de pièces en double',
      description: 'Parts vendor invoice #P-4521 processed twice',
      descriptionFr: 'Facture fournisseur de pièces #P-4521 traitée deux fois',
      amount: 12500,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-parts',
    },
    {
      id: 'anom-auto-005',
      type: 'fraud',
      severity: 'info',
      title: 'Warranty Claim Pattern',
      titleFr: 'Schéma de réclamations de garantie',
      description: 'Unusual warranty claim frequency - audit recommended',
      descriptionFr: 'Fréquence de réclamations de garantie inhabituelle - audit recommandé',
      amount: 18000,
      date: '2026-01-08',
      confidence: 88,
      accountId: 'acc-warranty',
    },
  ],

  // Beauty & Wellness
  beauty_wellness: [
    {
      id: 'anom-bw-001',
      type: 'timing',
      severity: 'critical',
      title: 'Client No-Show Spike',
      titleFr: 'Hausse des absences clients',
      description: 'No-shows at 22% vs 8% average - deposit policy needed',
      descriptionFr: 'Absences à 22% vs moyenne 8% - politique de dépôt requise',
      amount: 12500,
      date: '2026-01-15',
      confidence: 96,
      accountId: 'acc-service-revenue',
    },
    {
      id: 'anom-bw-002',
      type: 'spike',
      severity: 'warning',
      title: 'Product Revenue Decline',
      titleFr: 'Baisse des revenus produits',
      description: 'Retail product sales down 35% vs last quarter',
      descriptionFr: 'Ventes de produits au détail en baisse de 35% vs trimestre dernier',
      amount: 8500,
      date: '2026-01-14',
      confidence: 94,
      accountId: 'acc-product-sales',
    },
    {
      id: 'anom-bw-003',
      type: 'spike',
      severity: 'warning',
      title: 'Supply Cost Spike',
      titleFr: 'Pic des coûts de fournitures',
      description: 'Professional supplies 40% over budget',
      descriptionFr: 'Fournitures professionnelles 40% au-dessus du budget',
      amount: 4200,
      date: '2026-01-12',
      confidence: 92,
      accountId: 'acc-supplies',
    },
    {
      id: 'anom-bw-004',
      type: 'duplicate',
      severity: 'critical',
      title: 'Gift Card Double Redemption',
      titleFr: 'Double utilisation de carte-cadeau',
      description: 'Gift card #GC-2024-847 redeemed twice',
      descriptionFr: 'Carte-cadeau #GC-2024-847 utilisée deux fois',
      amount: 250,
      date: '2026-01-10',
      confidence: 99,
      accountId: 'acc-gift-cards',
    },
    {
      id: 'anom-bw-005',
      type: 'timing',
      severity: 'info',
      title: 'Revenue per Client Declining',
      titleFr: 'Revenus par client en déclin',
      description: 'Average ticket down 18% vs Q4 average',
      descriptionFr: 'Ticket moyen en baisse de 18% vs moyenne T4',
      amount: 6500,
      date: '2026-01-08',
      confidence: 90,
      accountId: 'acc-service-revenue',
    },
  ],
};

// Sample KPIs by Industry
export const DEMO_KPIS: Record<string, DemoKPI[]> = {
  // Real Estate
  realEstate: [
    { id: 'kpi-re-001', name: 'Occupancy Rate', value: 85, target: 90, unit: '%', trend: 'up', changePercent: 2.5 },
    { id: 'kpi-re-002', name: 'Cap Rate', value: 7.2, target: 7.5, unit: '%', trend: 'stable', changePercent: 0.3 },
    { id: 'kpi-re-003', name: 'NOI', value: 1200000, target: 1250000, unit: 'CAD', trend: 'up', changePercent: 5.2 },
    { id: 'kpi-re-004', name: 'Cash-on-Cash Return', value: 9.4, target: 10, unit: '%', trend: 'up', changePercent: 1.1 },
  ],
  // Restaurant
  restaurant: [
    { id: 'kpi-rest-001', name: 'Food Cost %', value: 28, target: 30, unit: '%', trend: 'down', changePercent: -2.1 },
    { id: 'kpi-rest-002', name: 'Labor Cost %', value: 32, target: 35, unit: '%', trend: 'down', changePercent: -1.8 },
    { id: 'kpi-rest-003', name: 'Prime Cost', value: 60, target: 65, unit: '%', trend: 'down', changePercent: -3.2 },
    { id: 'kpi-rest-004', name: 'Average Check', value: 45, target: 48, unit: 'CAD', trend: 'up', changePercent: 2.3 },
  ],
  // Retail
  retail: [
    { id: 'kpi-ret-001', name: 'GMROI', value: 2.8, target: 3.0, unit: 'x', trend: 'up', changePercent: 5.6 },
    { id: 'kpi-ret-002', name: 'Inventory Turnover', value: 6.2, target: 6.5, unit: 'x', trend: 'stable', changePercent: 0.5 },
    { id: 'kpi-ret-003', name: 'Shrinkage %', value: 1.2, target: 1.5, unit: '%', trend: 'down', changePercent: -0.3 },
    { id: 'kpi-ret-004', name: 'Sales per Sq Ft', value: 450, target: 500, unit: 'CAD', trend: 'up', changePercent: 8.2 },
  ],
  // General/Default
  default: [
    { id: 'kpi-gen-001', name: 'Current Ratio', value: 2.4, target: 2.0, unit: 'x', trend: 'up', changePercent: 8.5 },
    { id: 'kpi-gen-002', name: 'Quick Ratio', value: 1.8, target: 1.5, unit: 'x', trend: 'up', changePercent: 12.3 },
    { id: 'kpi-gen-003', name: 'Debt-to-Equity', value: 0.6, target: 1.0, unit: 'x', trend: 'down', changePercent: -5.2 },
    { id: 'kpi-gen-004', name: 'DSO', value: 38, target: 45, unit: 'days', trend: 'down', changePercent: -8.1 },
    { id: 'kpi-gen-005', name: 'Net Margin', value: 18.5, target: 20, unit: '%', trend: 'down', changePercent: -2.1 },
  ],
};

// Sample Balance Sheet Data
export const DEMO_BALANCE_SHEET = {
  assets: {
    current: DEMO_ACCOUNTS.filter(a => a.type === 'asset' && a.category === 'Current Assets'),
    fixed: DEMO_ACCOUNTS.filter(a => a.type === 'asset' && a.category === 'Fixed Assets'),
    total: DEMO_ACCOUNTS.filter(a => a.type === 'asset').reduce((sum, acc) => sum + acc.balance, 0),
  },
  liabilities: {
    current: DEMO_ACCOUNTS.filter(a => a.type === 'liability' && a.category === 'Current Liabilities'),
    longTerm: DEMO_ACCOUNTS.filter(a => a.type === 'liability' && a.category === 'Long-term Liabilities'),
    total: DEMO_ACCOUNTS.filter(a => a.type === 'liability').reduce((sum, acc) => sum + acc.balance, 0),
  },
  equity: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'equity').reduce((sum, acc) => sum + acc.balance, 0),
  },
};

// Sample Income Statement Data
export const DEMO_INCOME_STATEMENT = {
  revenue: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'revenue').reduce((sum, acc) => sum + acc.balance, 0),
    items: DEMO_ACCOUNTS.filter(a => a.type === 'revenue'),
  },
  cogs: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Cost of Sales').reduce((sum, acc) => sum + acc.balance, 0),
    items: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Cost of Sales'),
  },
  operatingExpenses: {
    total: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Operating Expenses').reduce((sum, acc) => sum + acc.balance, 0),
    items: DEMO_ACCOUNTS.filter(a => a.type === 'expense' && a.category === 'Operating Expenses'),
  },
  netIncome: 0, // Calculated: revenue - cogs - operatingExpenses
};

// Calculate net income
DEMO_INCOME_STATEMENT.netIncome = 
  DEMO_INCOME_STATEMENT.revenue.total - 
  DEMO_INCOME_STATEMENT.cogs.total - 
  DEMO_INCOME_STATEMENT.operatingExpenses.total;

// Sample Cash Flow Data
export const DEMO_CASH_FLOW = {
  operating: {
    netIncome: DEMO_INCOME_STATEMENT.netIncome,
    adjustments: [
      { description: 'Depreciation', amount: 27000 },
      { description: 'Accounts Receivable Change', amount: -13400 },
      { description: 'Inventory Change', amount: -10800 },
      { description: 'Accounts Payable Change', amount: 4500 },
    ],
    total: 0, // Calculated
  },
  investing: {
    items: [
      { description: 'Purchase of Equipment', amount: -82000 },
      { description: 'Sale of Assets', amount: 15000 },
    ],
    total: -67000,
  },
  financing: {
    items: [
      { description: 'Loan Repayment', amount: -30000 },
      { description: 'Dividends Paid', amount: -15000 },
    ],
    total: -45000,
  },
};

// Calculate operating cash flow
DEMO_CASH_FLOW.operating.total = 
  DEMO_CASH_FLOW.operating.netIncome +
  DEMO_CASH_FLOW.operating.adjustments.reduce((sum, adj) => sum + adj.amount, 0);

// Helper function to get KPIs by industry
export function getKPIsByIndustry(industry: string = 'default'): DemoKPI[] {
  return DEMO_KPIS[industry] || DEMO_KPIS.default;
}

// Helper function to get anomalies by industry
export function getAnomaliesByIndustry(industry: string = 'default'): DemoAnomaly[] {
  return DEMO_ANOMALIES_BY_INDUSTRY[industry] || DEMO_ANOMALIES;
}

// Helper function to get demo data summary
export function getDemoDataSummary() {
  return {
    totalAccounts: DEMO_ACCOUNTS.length,
    totalTransactions: DEMO_TRANSACTIONS.length,
    totalAnomalies: DEMO_ANOMALIES.length,
    criticalAnomalies: DEMO_ANOMALIES.filter(a => a.severity === 'critical').length,
    totalRevenue: DEMO_INCOME_STATEMENT.revenue.total,
    netIncome: DEMO_INCOME_STATEMENT.netIncome,
    totalAssets: DEMO_BALANCE_SHEET.assets.total,
    totalLiabilities: DEMO_BALANCE_SHEET.liabilities.total,
    totalEquity: DEMO_BALANCE_SHEET.equity.total,
  };
}

export default {
  accounts: DEMO_ACCOUNTS,
  transactions: DEMO_TRANSACTIONS,
  anomalies: DEMO_ANOMALIES,
  anomaliesByIndustry: DEMO_ANOMALIES_BY_INDUSTRY,
  kpis: DEMO_KPIS,
  balanceSheet: DEMO_BALANCE_SHEET,
  incomeStatement: DEMO_INCOME_STATEMENT,
  cashFlow: DEMO_CASH_FLOW,
  getKPIsByIndustry,
  getAnomaliesByIndustry,
  getDemoDataSummary,
};
