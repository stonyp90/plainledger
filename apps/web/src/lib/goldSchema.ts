/**
 * PlainLedger Gold Layer Schema Definition
 * 
 * Static schema definition for the Gold layer star schema.
 * This is consistent across all organizations, providers, and industries.
 * 
 * The Gold schema is normalized from various providers (QuickBooks, Xero, Sage)
 * during the Bronze → Silver → Gold ETL pipeline.
 */

import { DataSource, DataField, TableType, FieldType, AggregationType } from './visualizationTypes';

// =====================================================
// FIELD TYPE HELPERS
// =====================================================

function createField(
  id: string,
  name: string,
  nameEn: string,
  type: FieldType,
  options: Partial<DataField> = {}
): DataField {
  const aggregations: AggregationType[] = 
    type === 'NUMBER' || type === 'CURRENCY' 
      ? ['SUM', 'AVG', 'COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX'] 
      : ['COUNT', 'COUNT_DISTINCT'];

  return {
    id,
    name,
    nameEn,
    technicalName: id,
    type,
    aggregations,
    filterable: true,
    groupable: type === 'STRING' || type === 'DATE' || type === 'BOOLEAN',
    isPrimaryKey: false,
    isForeignKey: false,
    ...options,
  };
}

function createPrimaryKey(id: string, name: string, nameEn: string): DataField {
  return createField(id, name, nameEn, 'STRING', { 
    isPrimaryKey: true, 
    filterable: false,
    groupable: false,
  });
}

function createForeignKey(
  id: string, 
  name: string, 
  nameEn: string, 
  relatedTo: string
): DataField {
  return createField(id, name, nameEn, 'STRING', { 
    isForeignKey: true, 
    relatedTo,
    groupable: true,
  });
}

// =====================================================
// DIMENSION TABLES
// =====================================================

export const DIM_ACCOUNT: DataSource = {
  id: 'dim_account',
  name: 'Comptes',
  nameEn: 'Accounts',
  description: 'Plan comptable et informations des comptes',
  descriptionEn: 'Chart of accounts and account information',
  tableType: 'DIMENSION',
  icon: '📊',
  fields: [
    createPrimaryKey('account_key', 'Clé compte', 'Account Key'),
    createField('source_account_id', 'ID source', 'Source ID', 'STRING'),
    createForeignKey('organization_key', 'Clé organisation', 'Organization Key', 'dim_organization'),
    createField('account_code', 'Code compte', 'Account Code', 'STRING', { 
      sampleValues: ['1000', '2000', '3000', '4000', '5000'] 
    }),
    createField('account_name', 'Nom du compte', 'Account Name', 'STRING', {
      sampleValues: ['Cash', 'Accounts Receivable', 'Sales Revenue', 'Cost of Goods Sold']
    }),
    createField('account_type', 'Type de compte', 'Account Type', 'STRING', {
      sampleValues: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
    }),
    createField('account_subtype', 'Sous-type', 'Subtype', 'STRING'),
    createField('normal_balance', 'Solde normal', 'Normal Balance', 'STRING', {
      sampleValues: ['DEBIT', 'CREDIT']
    }),
    createField('currency_code', 'Devise', 'Currency', 'STRING', {
      sampleValues: ['CAD', 'USD']
    }),
    createField('is_active', 'Actif', 'Is Active', 'BOOLEAN'),
    createField('parent_account_key', 'Compte parent', 'Parent Account', 'STRING'),
    createField('source_system', 'Système source', 'Source System', 'STRING', {
      sampleValues: ['quickbooks', 'xero', 'sage']
    }),
  ],
  joinableWith: [
    {
      targetSource: 'fact_transaction',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'account_key', targetField: 'account_key' }]
    },
    {
      targetSource: 'fact_account_balance',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'account_key', targetField: 'account_key' }]
    },
  ],
};

export const DIM_CONTACT: DataSource = {
  id: 'dim_contact',
  name: 'Contacts',
  nameEn: 'Contacts',
  description: 'Clients, fournisseurs et autres contacts',
  descriptionEn: 'Customers, vendors and other contacts',
  tableType: 'DIMENSION',
  icon: '👥',
  fields: [
    createPrimaryKey('contact_key', 'Clé contact', 'Contact Key'),
    createField('source_contact_id', 'ID source', 'Source ID', 'STRING'),
    createForeignKey('organization_key', 'Clé organisation', 'Organization Key', 'dim_organization'),
    createField('display_name', 'Nom affiché', 'Display Name', 'STRING'),
    createField('company_name', 'Entreprise', 'Company Name', 'STRING'),
    createField('contact_type', 'Type de contact', 'Contact Type', 'STRING', {
      sampleValues: ['CUSTOMER', 'VENDOR', 'EMPLOYEE', 'CUSTOMER_AND_VENDOR']
    }),
    createField('email', 'Courriel', 'Email', 'STRING'),
    createField('phone', 'Téléphone', 'Phone', 'STRING'),
    createField('is_active', 'Actif', 'Is Active', 'BOOLEAN'),
    createField('address_line1', 'Adresse 1', 'Address Line 1', 'STRING'),
    createField('city', 'Ville', 'City', 'STRING'),
    createField('state_province', 'Province', 'State/Province', 'STRING'),
    createField('postal_code', 'Code postal', 'Postal Code', 'STRING'),
    createField('country', 'Pays', 'Country', 'STRING'),
    createField('balance', 'Solde', 'Balance', 'CURRENCY'),
    createField('source_system', 'Système source', 'Source System', 'STRING'),
  ],
  joinableWith: [
    {
      targetSource: 'fact_transaction',
      joinType: 'left',
      suggestedKeys: [{ sourceField: 'contact_key', targetField: 'contact_key' }]
    },
    {
      targetSource: 'fact_invoice',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'contact_key', targetField: 'contact_key' }]
    },
    {
      targetSource: 'fact_bill',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'contact_key', targetField: 'vendor_key' }]
    },
  ],
};

export const DIM_DATE: DataSource = {
  id: 'dim_date',
  name: 'Dates',
  nameEn: 'Dates',
  description: 'Dimension temporelle avec hiérarchies fiscales',
  descriptionEn: 'Time dimension with fiscal hierarchies',
  tableType: 'DIMENSION',
  icon: '📅',
  fields: [
    createPrimaryKey('date_key', 'Clé date', 'Date Key'),
    createField('full_date', 'Date complète', 'Full Date', 'DATE'),
    createField('year', 'Année', 'Year', 'NUMBER'),
    createField('quarter', 'Trimestre', 'Quarter', 'NUMBER', { sampleValues: ['1', '2', '3', '4'] }),
    createField('month', 'Mois', 'Month', 'NUMBER'),
    createField('month_name', 'Nom du mois', 'Month Name', 'STRING', {
      sampleValues: ['January', 'February', 'March']
    }),
    createField('month_name_fr', 'Nom du mois (FR)', 'Month Name (FR)', 'STRING', {
      sampleValues: ['Janvier', 'Février', 'Mars']
    }),
    createField('week_of_year', 'Semaine de l\'année', 'Week of Year', 'NUMBER'),
    createField('day_of_month', 'Jour du mois', 'Day of Month', 'NUMBER'),
    createField('day_of_week', 'Jour de la semaine', 'Day of Week', 'NUMBER'),
    createField('day_name', 'Nom du jour', 'Day Name', 'STRING'),
    createField('is_weekend', 'Fin de semaine', 'Is Weekend', 'BOOLEAN'),
    createField('is_holiday', 'Jour férié', 'Is Holiday', 'BOOLEAN'),
    createField('fiscal_year', 'Année fiscale', 'Fiscal Year', 'NUMBER'),
    createField('fiscal_quarter', 'Trimestre fiscal', 'Fiscal Quarter', 'NUMBER'),
    createField('fiscal_period', 'Période fiscale', 'Fiscal Period', 'NUMBER'),
  ],
  joinableWith: [
    {
      targetSource: 'fact_transaction',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'date_key', targetField: 'transaction_date_key' }]
    },
    {
      targetSource: 'fact_account_balance',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'date_key', targetField: 'as_of_date_key' }]
    },
  ],
};

export const DIM_ORGANIZATION: DataSource = {
  id: 'dim_organization',
  name: 'Organisation',
  nameEn: 'Organization',
  description: 'Informations sur l\'organisation',
  descriptionEn: 'Organization information',
  tableType: 'DIMENSION',
  icon: '🏢',
  fields: [
    createPrimaryKey('organization_key', 'Clé organisation', 'Organization Key'),
    createField('organization_id', 'ID organisation', 'Organization ID', 'STRING'),
    createField('name', 'Nom', 'Name', 'STRING'),
    createField('legal_name', 'Raison sociale', 'Legal Name', 'STRING'),
    createField('industry_id', 'ID industrie', 'Industry ID', 'STRING'),
    createField('industry_name', 'Industrie', 'Industry', 'STRING', {
      sampleValues: ['Restaurant', 'Retail', 'Professional Services', 'Construction']
    }),
    createField('currency_code', 'Devise', 'Currency', 'STRING'),
    createField('fiscal_year_start_month', 'Début année fiscale', 'Fiscal Year Start', 'NUMBER'),
    createField('created_at', 'Créé le', 'Created At', 'DATETIME'),
  ],
  joinableWith: [],
};

// =====================================================
// FACT TABLES
// =====================================================

export const FACT_TRANSACTION: DataSource = {
  id: 'fact_transaction',
  name: 'Transactions',
  nameEn: 'Transactions',
  description: 'Transactions du grand livre',
  descriptionEn: 'General ledger transactions',
  tableType: 'FACT',
  icon: '💰',
  fields: [
    createPrimaryKey('transaction_key', 'Clé transaction', 'Transaction Key'),
    createField('source_transaction_id', 'ID source', 'Source ID', 'STRING'),
    createForeignKey('organization_key', 'Clé organisation', 'Organization Key', 'dim_organization'),
    createForeignKey('account_key', 'Clé compte', 'Account Key', 'dim_account'),
    createForeignKey('contact_key', 'Clé contact', 'Contact Key', 'dim_contact'),
    createForeignKey('transaction_date_key', 'Clé date', 'Date Key', 'dim_date'),
    createField('transaction_type', 'Type', 'Type', 'STRING', {
      sampleValues: ['INVOICE', 'BILL', 'PAYMENT', 'JOURNAL_ENTRY', 'TRANSFER']
    }),
    createField('transaction_date', 'Date', 'Date', 'DATE'),
    createField('posting_date', 'Date de comptabilisation', 'Posting Date', 'DATE'),
    createField('amount', 'Montant', 'Amount', 'CURRENCY', {
      defaultFormat: 'currency',
    }),
    createField('debit_amount', 'Débit', 'Debit', 'CURRENCY'),
    createField('credit_amount', 'Crédit', 'Credit', 'CURRENCY'),
    createField('description', 'Description', 'Description', 'STRING'),
    createField('memo', 'Mémo', 'Memo', 'STRING'),
    createField('reference', 'Référence', 'Reference', 'STRING'),
    createField('is_reconciled', 'Rapproché', 'Is Reconciled', 'BOOLEAN'),
    createField('fiscal_year', 'Année fiscale', 'Fiscal Year', 'NUMBER'),
    createField('fiscal_period', 'Période fiscale', 'Fiscal Period', 'NUMBER'),
    createField('source_system', 'Système source', 'Source System', 'STRING'),
  ],
  joinableWith: [
    {
      targetSource: 'dim_account',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'account_key', targetField: 'account_key' }]
    },
    {
      targetSource: 'dim_contact',
      joinType: 'left',
      suggestedKeys: [{ sourceField: 'contact_key', targetField: 'contact_key' }]
    },
    {
      targetSource: 'dim_date',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'transaction_date_key', targetField: 'date_key' }]
    },
  ],
};

export const FACT_ACCOUNT_BALANCE: DataSource = {
  id: 'fact_account_balance',
  name: 'Soldes des comptes',
  nameEn: 'Account Balances',
  description: 'Soldes des comptes par période',
  descriptionEn: 'Account balances by period',
  tableType: 'FACT',
  icon: '📈',
  fields: [
    createPrimaryKey('balance_key', 'Clé solde', 'Balance Key'),
    createForeignKey('organization_key', 'Clé organisation', 'Organization Key', 'dim_organization'),
    createForeignKey('account_key', 'Clé compte', 'Account Key', 'dim_account'),
    createForeignKey('as_of_date_key', 'Clé date', 'Date Key', 'dim_date'),
    createField('as_of_date', 'En date du', 'As of Date', 'DATE'),
    createField('opening_balance', 'Solde d\'ouverture', 'Opening Balance', 'CURRENCY'),
    createField('period_debit', 'Débits de la période', 'Period Debit', 'CURRENCY'),
    createField('period_credit', 'Crédits de la période', 'Period Credit', 'CURRENCY'),
    createField('closing_balance', 'Solde de clôture', 'Closing Balance', 'CURRENCY', {
      defaultFormat: 'currency',
    }),
    createField('ytd_debit', 'Débits cumulés', 'YTD Debit', 'CURRENCY'),
    createField('ytd_credit', 'Crédits cumulés', 'YTD Credit', 'CURRENCY'),
    createField('fiscal_year', 'Année fiscale', 'Fiscal Year', 'NUMBER'),
    createField('fiscal_period', 'Période fiscale', 'Fiscal Period', 'NUMBER'),
  ],
  joinableWith: [
    {
      targetSource: 'dim_account',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'account_key', targetField: 'account_key' }]
    },
    {
      targetSource: 'dim_date',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'as_of_date_key', targetField: 'date_key' }]
    },
  ],
};

export const FACT_INVOICE: DataSource = {
  id: 'fact_invoice',
  name: 'Factures clients',
  nameEn: 'Customer Invoices',
  description: 'Factures émises aux clients',
  descriptionEn: 'Invoices issued to customers',
  tableType: 'FACT',
  icon: '📄',
  fields: [
    createPrimaryKey('invoice_key', 'Clé facture', 'Invoice Key'),
    createField('source_invoice_id', 'ID source', 'Source ID', 'STRING'),
    createForeignKey('organization_key', 'Clé organisation', 'Organization Key', 'dim_organization'),
    createForeignKey('contact_key', 'Clé client', 'Customer Key', 'dim_contact'),
    createField('invoice_number', 'Numéro de facture', 'Invoice Number', 'STRING'),
    createField('invoice_date', 'Date de facture', 'Invoice Date', 'DATE'),
    createField('due_date', 'Date d\'échéance', 'Due Date', 'DATE'),
    createField('subtotal', 'Sous-total', 'Subtotal', 'CURRENCY'),
    createField('tax_amount', 'Taxes', 'Tax Amount', 'CURRENCY'),
    createField('total_amount', 'Total', 'Total Amount', 'CURRENCY', {
      defaultFormat: 'currency',
    }),
    createField('amount_paid', 'Montant payé', 'Amount Paid', 'CURRENCY'),
    createField('balance_due', 'Solde dû', 'Balance Due', 'CURRENCY'),
    createField('status', 'Statut', 'Status', 'STRING', {
      sampleValues: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID']
    }),
    createField('days_outstanding', 'Jours en souffrance', 'Days Outstanding', 'NUMBER'),
    createField('is_overdue', 'En retard', 'Is Overdue', 'BOOLEAN'),
  ],
  joinableWith: [
    {
      targetSource: 'dim_contact',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'contact_key', targetField: 'contact_key' }]
    },
  ],
};

export const FACT_BILL: DataSource = {
  id: 'fact_bill',
  name: 'Factures fournisseurs',
  nameEn: 'Vendor Bills',
  description: 'Factures reçues des fournisseurs',
  descriptionEn: 'Bills received from vendors',
  tableType: 'FACT',
  icon: '🧾',
  fields: [
    createPrimaryKey('bill_key', 'Clé facture', 'Bill Key'),
    createField('source_bill_id', 'ID source', 'Source ID', 'STRING'),
    createForeignKey('organization_key', 'Clé organisation', 'Organization Key', 'dim_organization'),
    createForeignKey('vendor_key', 'Clé fournisseur', 'Vendor Key', 'dim_contact'),
    createField('bill_number', 'Numéro de facture', 'Bill Number', 'STRING'),
    createField('bill_date', 'Date de facture', 'Bill Date', 'DATE'),
    createField('due_date', 'Date d\'échéance', 'Due Date', 'DATE'),
    createField('subtotal', 'Sous-total', 'Subtotal', 'CURRENCY'),
    createField('tax_amount', 'Taxes', 'Tax Amount', 'CURRENCY'),
    createField('total_amount', 'Total', 'Total Amount', 'CURRENCY', {
      defaultFormat: 'currency',
    }),
    createField('amount_paid', 'Montant payé', 'Amount Paid', 'CURRENCY'),
    createField('balance_due', 'Solde dû', 'Balance Due', 'CURRENCY'),
    createField('status', 'Statut', 'Status', 'STRING', {
      sampleValues: ['DRAFT', 'RECEIVED', 'PAID', 'OVERDUE', 'VOID']
    }),
    createField('days_outstanding', 'Jours en souffrance', 'Days Outstanding', 'NUMBER'),
    createField('is_overdue', 'En retard', 'Is Overdue', 'BOOLEAN'),
  ],
  joinableWith: [
    {
      targetSource: 'dim_contact',
      joinType: 'inner',
      suggestedKeys: [{ sourceField: 'vendor_key', targetField: 'contact_key' }]
    },
  ],
};

export const FACT_INDUSTRY_KPIS: DataSource = {
  id: 'fact_industry_kpis',
  name: 'KPIs Industrie',
  nameEn: 'Industry KPIs',
  description: 'Indicateurs de performance par industrie',
  descriptionEn: 'Industry-specific performance indicators',
  tableType: 'FACT',
  icon: '🎯',
  fields: [
    createPrimaryKey('kpi_key', 'Clé KPI', 'KPI Key'),
    createForeignKey('organization_key', 'Clé organisation', 'Organization Key', 'dim_organization'),
    createField('industry_id', 'ID industrie', 'Industry ID', 'STRING'),
    createField('as_of_date', 'En date du', 'As of Date', 'DATE'),
    createField('fiscal_year', 'Année fiscale', 'Fiscal Year', 'NUMBER'),
    createField('fiscal_period', 'Période fiscale', 'Fiscal Period', 'NUMBER'),
    // Restaurant KPIs
    createField('food_cost_pct', 'Coût aliments %', 'Food Cost %', 'NUMBER', { defaultFormat: 'percentage' }),
    createField('labor_cost_pct', 'Coût main d\'œuvre %', 'Labor Cost %', 'NUMBER', { defaultFormat: 'percentage' }),
    createField('prime_cost_pct', 'Coût prime %', 'Prime Cost %', 'NUMBER', { defaultFormat: 'percentage' }),
    createField('beverage_cost_pct', 'Coût boissons %', 'Beverage Cost %', 'NUMBER', { defaultFormat: 'percentage' }),
    // Retail KPIs
    createField('gross_margin_pct', 'Marge brute %', 'Gross Margin %', 'NUMBER', { defaultFormat: 'percentage' }),
    createField('inventory_turnover', 'Rotation stocks', 'Inventory Turnover', 'NUMBER'),
    createField('sales_per_sqft', 'Ventes par pied carré', 'Sales per Sq Ft', 'CURRENCY'),
    // Real Estate KPIs
    createField('re_cap_rate', 'Taux cap', 'Cap Rate', 'NUMBER', { defaultFormat: 'percentage' }),
    createField('re_noi', 'NOI', 'NOI', 'CURRENCY'),
    createField('re_expense_ratio', 'Ratio dépenses', 'Expense Ratio', 'NUMBER', { defaultFormat: 'percentage' }),
    // Construction KPIs
    createField('job_margin_pct', 'Marge projet %', 'Job Margin %', 'NUMBER', { defaultFormat: 'percentage' }),
    createField('wip_balance', 'Travaux en cours', 'WIP Balance', 'CURRENCY'),
    createField('retention_balance', 'Rétention', 'Retention Balance', 'CURRENCY'),
  ],
  joinableWith: [],
};

// =====================================================
// SCHEMA REGISTRY
// =====================================================

/**
 * All available Gold layer data sources
 */
export const GOLD_SCHEMA: Record<string, DataSource> = {
  // Dimensions
  dim_account: DIM_ACCOUNT,
  dim_contact: DIM_CONTACT,
  dim_date: DIM_DATE,
  dim_organization: DIM_ORGANIZATION,
  // Facts
  fact_transaction: FACT_TRANSACTION,
  fact_account_balance: FACT_ACCOUNT_BALANCE,
  fact_invoice: FACT_INVOICE,
  fact_bill: FACT_BILL,
  fact_industry_kpis: FACT_INDUSTRY_KPIS,
};

/**
 * Get all data sources as array
 */
export function getAllDataSources(): DataSource[] {
  return Object.values(GOLD_SCHEMA);
}

/**
 * Get data sources by type
 */
export function getDataSourcesByType(type: TableType): DataSource[] {
  return getAllDataSources().filter(ds => ds.tableType === type);
}

/**
 * Get dimension tables
 */
export function getDimensions(): DataSource[] {
  return getDataSourcesByType('DIMENSION');
}

/**
 * Get fact tables
 */
export function getFacts(): DataSource[] {
  return getDataSourcesByType('FACT');
}

/**
 * Get a data source by ID
 */
export function getDataSource(id: string): DataSource | undefined {
  return GOLD_SCHEMA[id];
}

/**
 * Get joinable sources for a given source
 */
export function getJoinableSources(sourceId: string): DataSource[] {
  const source = getDataSource(sourceId);
  if (!source) return [];

  return source.joinableWith
    .map(relation => getDataSource(relation.targetSource))
    .filter((ds): ds is DataSource => ds !== undefined);
}

/**
 * Get suggested join between two sources
 */
export function getSuggestedJoin(
  sourceId: string, 
  targetId: string
): { keys: { sourceField: string; targetField: string }[]; joinType: 'inner' | 'left' | 'right' | 'full' } | null {
  const source = getDataSource(sourceId);
  if (!source) return null;

  const relation = source.joinableWith.find(r => r.targetSource === targetId);
  if (!relation) return null;

  return {
    keys: relation.suggestedKeys,
    joinType: relation.joinType,
  };
}

export default GOLD_SCHEMA;
