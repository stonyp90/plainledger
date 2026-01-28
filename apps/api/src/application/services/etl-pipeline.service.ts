/**
 * ETL Pipeline Service
 *
 * Handles the full medallion architecture transformation:
 * Raw Provider Data → Bronze (raw) → Silver (cleansed) → Gold (analytics)
 */

import {
  BronzeMetadata,
  BronzeQuickBooksAccount,
  BronzeQuickBooksCustomer,
  BronzeQuickBooksInvoice,
  BronzeQuickBooksJournalEntry,
  BronzeXeroAccount,
  BronzeXeroContact,
  BronzeXeroInvoice,
} from "@domain/datalake/bronze-schema";
import {
  SilverMetadata,
  SilverAccount,
  SilverContact,
  SilverTransaction,
  SilverAccountType,
  SilverContactType,
  SilverTransactionType,
  SilverSourceSystem,
  SILVER_QUALITY_RULES,
} from "@domain/datalake/silver-schema";
import {
  DimAccount,
  DimContact,
  FactTransaction,
  AccountType,
  ContactType,
  SourceSystem,
} from "@domain/datalake/schemas";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksInvoice,
  QuickBooksJournalEntry,
  XeroAccount,
  XeroContact,
  XeroInvoice,
} from "@domain/datalake/provider-types";

export class ETLPipelineService {
  // ===========================================================================
  // STAGE 1: Raw Provider Data → Bronze Layer
  // ===========================================================================

  /**
   * Ingest raw QuickBooks account into Bronze layer
   */
  ingestQuickBooksAccountToBronze(
    rawAccount: QuickBooksAccount,
    organizationId: string,
    datasourceId: string,
  ): BronzeQuickBooksAccount {
    const metadata = this.createBronzeMetadata(
      "QUICKBOOKS",
      organizationId,
      datasourceId,
      "/v3/company/{realmId}/account",
      1,
      JSON.stringify(rawAccount),
    );

    return {
      metadata,
      raw_data: rawAccount,
    };
  }

  /**
   * Ingest raw QuickBooks customer into Bronze layer
   */
  ingestQuickBooksCustomerToBronze(
    rawCustomer: QuickBooksCustomer,
    organizationId: string,
    datasourceId: string,
  ): BronzeQuickBooksCustomer {
    const metadata = this.createBronzeMetadata(
      "QUICKBOOKS",
      organizationId,
      datasourceId,
      "/v3/company/{realmId}/customer",
      1,
      JSON.stringify(rawCustomer),
    );

    return {
      metadata,
      raw_data: rawCustomer,
    };
  }

  /**
   * Ingest raw QuickBooks invoice into Bronze layer
   */
  ingestQuickBooksInvoiceToBronze(
    rawInvoice: QuickBooksInvoice,
    organizationId: string,
    datasourceId: string,
  ): BronzeQuickBooksInvoice {
    const metadata = this.createBronzeMetadata(
      "QUICKBOOKS",
      organizationId,
      datasourceId,
      "/v3/company/{realmId}/invoice",
      1,
      JSON.stringify(rawInvoice),
    );

    return {
      metadata,
      raw_data: rawInvoice,
    };
  }

  /**
   * Ingest raw QuickBooks journal entry into Bronze layer
   */
  ingestQuickBooksJournalEntryToBronze(
    rawJournal: QuickBooksJournalEntry,
    organizationId: string,
    datasourceId: string,
  ): BronzeQuickBooksJournalEntry {
    const metadata = this.createBronzeMetadata(
      "QUICKBOOKS",
      organizationId,
      datasourceId,
      "/v3/company/{realmId}/journalentry",
      1,
      JSON.stringify(rawJournal),
    );

    return {
      metadata,
      raw_data: rawJournal,
    };
  }

  /**
   * Ingest raw Xero account into Bronze layer
   */
  ingestXeroAccountToBronze(
    rawAccount: XeroAccount,
    organizationId: string,
    datasourceId: string,
  ): BronzeXeroAccount {
    const metadata = this.createBronzeMetadata(
      "XERO",
      organizationId,
      datasourceId,
      "/api.xro/2.0/Accounts",
      1,
      JSON.stringify(rawAccount),
    );

    return {
      metadata,
      raw_data: rawAccount,
    };
  }

  /**
   * Ingest raw Xero contact into Bronze layer
   */
  ingestXeroContactToBronze(
    rawContact: XeroContact,
    organizationId: string,
    datasourceId: string,
  ): BronzeXeroContact {
    const metadata = this.createBronzeMetadata(
      "XERO",
      organizationId,
      datasourceId,
      "/api.xro/2.0/Contacts",
      1,
      JSON.stringify(rawContact),
    );

    return {
      metadata,
      raw_data: rawContact,
    };
  }

  /**
   * Ingest raw Xero invoice into Bronze layer
   */
  ingestXeroInvoiceToBronze(
    rawInvoice: XeroInvoice,
    organizationId: string,
    datasourceId: string,
  ): BronzeXeroInvoice {
    const metadata = this.createBronzeMetadata(
      "XERO",
      organizationId,
      datasourceId,
      "/api.xro/2.0/Invoices",
      1,
      JSON.stringify(rawInvoice),
    );

    return {
      metadata,
      raw_data: rawInvoice,
    };
  }

  // ===========================================================================
  // STAGE 2: Bronze Layer → Silver Layer
  // ===========================================================================

  /**
   * Transform Bronze QuickBooks account to Silver
   */
  transformQuickBooksAccountToSilver(
    bronze: BronzeQuickBooksAccount,
  ): SilverAccount {
    const raw = bronze.raw_data;
    const qualityIssues: string[] = [];
    let qualityScore = 100;

    // Validate required fields
    if (!raw.AcctNum) {
      qualityIssues.push("ACC_001: Account code is missing");
      qualityScore -= 10;
    }
    if (!raw.Name) {
      qualityIssues.push("ACC_002: Account name is missing");
      qualityScore -= 20;
    }

    const accountType = this.mapQBClassificationToSilverType(
      raw.Classification,
    );
    const normalBalance =
      accountType === SilverAccountType.ASSET ||
      accountType === SilverAccountType.EXPENSE
        ? "DEBIT"
        : "CREDIT";

    const metadata: SilverMetadata = {
      bronze_ingestion_id: bronze.metadata.ingestion_id,
      processing_job_id: crypto.randomUUID(),
      processed_at: new Date(),
      source_system: SilverSourceSystem.QUICKBOOKS,
      organization_id: bronze.metadata.organization_id,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      is_valid: qualityScore >= 70,
    };

    return {
      metadata,
      silver_account_id: `silver_qb_acc_${raw.Id}`,
      source_account_id: raw.Id,
      organization_id: bronze.metadata.organization_id,
      account_code: raw.AcctNum || raw.Id,
      account_name: raw.Name,
      account_type: accountType,
      account_subtype: this.normalizeSubtype(raw.AccountSubType),
      parent_account_id: raw.ParentRef?.value || null,
      source_account_type: raw.AccountType,
      source_account_subtype: raw.AccountSubType,
      is_active: raw.Active,
      is_system_account: false,
      hierarchy_level: raw.FullyQualifiedName.split(":").length,
      hierarchy_path: raw.FullyQualifiedName.replace(/:/g, "/"),
      normal_balance: normalBalance,
      currency_code: raw.CurrencyRef.value,
      source_created_at: new Date(raw.MetaData.CreateTime),
      source_updated_at: new Date(raw.MetaData.LastUpdatedTime),
    };
  }

  /**
   * Transform Bronze QuickBooks customer to Silver
   */
  transformQuickBooksCustomerToSilver(
    bronze: BronzeQuickBooksCustomer,
  ): SilverContact {
    const raw = bronze.raw_data;
    const qualityIssues: string[] = [];
    let qualityScore = 100;

    // Validate email
    const emailIsValid = this.validateEmail(raw.PrimaryEmailAddr?.Address);
    if (raw.PrimaryEmailAddr?.Address && !emailIsValid) {
      qualityIssues.push("CON_001: Invalid email format");
      qualityScore -= 5;
    }

    // Validate display name
    if (!raw.DisplayName) {
      qualityIssues.push("CON_002: Display name is missing");
      qualityScore -= 20;
    }

    const metadata: SilverMetadata = {
      bronze_ingestion_id: bronze.metadata.ingestion_id,
      processing_job_id: crypto.randomUUID(),
      processed_at: new Date(),
      source_system: SilverSourceSystem.QUICKBOOKS,
      organization_id: bronze.metadata.organization_id,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      is_valid: qualityScore >= 70,
    };

    return {
      metadata,
      silver_contact_id: `silver_qb_cust_${raw.Id}`,
      source_contact_id: raw.Id,
      organization_id: bronze.metadata.organization_id,
      contact_type: SilverContactType.CUSTOMER,
      display_name: raw.DisplayName,
      legal_name: raw.CompanyName || null,
      first_name: raw.GivenName || null,
      last_name: raw.FamilyName || null,
      email: raw.PrimaryEmailAddr?.Address || null,
      email_is_valid: emailIsValid,
      phone: raw.PrimaryPhone?.FreeFormNumber || null,
      phone_normalized: this.normalizePhone(raw.PrimaryPhone?.FreeFormNumber),
      address_line1: raw.BillAddr?.Line1 || null,
      address_city: raw.BillAddr?.City || null,
      address_province_state: raw.BillAddr?.CountrySubDivisionCode || null,
      address_province_code: raw.BillAddr?.CountrySubDivisionCode || null,
      address_postal_code: raw.BillAddr?.PostalCode || null,
      address_country: raw.BillAddr?.Country || null,
      address_country_code: this.normalizeCountryCode(raw.BillAddr?.Country),
      is_active: raw.Active,
      source_created_at: new Date(raw.MetaData.CreateTime),
      source_updated_at: new Date(raw.MetaData.LastUpdatedTime),
    };
  }

  /**
   * Transform Bronze QuickBooks invoice to Silver transactions
   */
  transformQuickBooksInvoiceToSilver(
    bronze: BronzeQuickBooksInvoice,
  ): SilverTransaction[] {
    const raw = bronze.raw_data;
    const transactions: SilverTransaction[] = [];
    const qualityIssues: string[] = [];
    let qualityScore = 100;

    // Validate transaction date
    if (!raw.TxnDate || !this.isValidDate(raw.TxnDate)) {
      qualityIssues.push("TXN_002: Invalid transaction date");
      qualityScore -= 15;
    }

    const txnDate = this.parseDateString(raw.TxnDate);

    const baseMetadata: SilverMetadata = {
      bronze_ingestion_id: bronze.metadata.ingestion_id,
      processing_job_id: crypto.randomUUID(),
      processed_at: new Date(),
      source_system: SilverSourceSystem.QUICKBOOKS,
      organization_id: bronze.metadata.organization_id,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      is_valid: qualityScore >= 70,
    };

    // A/R entry
    transactions.push({
      metadata: baseMetadata,
      silver_transaction_id: `silver_qb_inv_${raw.Id}_ar`,
      source_transaction_id: raw.Id,
      source_line_id: null,
      organization_id: bronze.metadata.organization_id,
      transaction_type: SilverTransactionType.INVOICE,
      transaction_date: txnDate,
      posting_date: txnDate,
      reference_number: raw.DocNumber,
      memo: raw.PrivateNote || null,
      source_account_id: "accounts_receivable",
      account_code: "1200",
      source_contact_id: raw.CustomerRef.value,
      debit_amount: raw.TotalAmt,
      credit_amount: 0,
      net_amount: raw.TotalAmt,
      currency_code: raw.CurrencyRef.value,
      exchange_rate: raw.ExchangeRate || 1,
      amount_in_base_currency: raw.TotalAmt * (raw.ExchangeRate || 1),
      source_item_id: null,
      source_class_id: null,
      source_location_id: null,
      source_created_at: new Date(raw.MetaData.CreateTime),
      source_updated_at: new Date(raw.MetaData.LastUpdatedTime),
    });

    // Revenue lines
    for (const line of raw.Line) {
      if (line.DetailType === "SubTotalLineDetail") continue;

      transactions.push({
        metadata: baseMetadata,
        silver_transaction_id: `silver_qb_inv_${raw.Id}_${line.Id}`,
        source_transaction_id: raw.Id,
        source_line_id: line.Id,
        organization_id: bronze.metadata.organization_id,
        transaction_type: SilverTransactionType.INVOICE,
        transaction_date: txnDate,
        posting_date: txnDate,
        reference_number: raw.DocNumber,
        memo: line.Description || null,
        source_account_id:
          line.SalesItemLineDetail?.ItemRef?.value ||
          line.AccountBasedExpenseLineDetail?.AccountRef.value ||
          "revenue",
        account_code: null,
        source_contact_id: raw.CustomerRef.value,
        debit_amount: 0,
        credit_amount: line.Amount,
        net_amount: -line.Amount,
        currency_code: raw.CurrencyRef.value,
        exchange_rate: raw.ExchangeRate || 1,
        amount_in_base_currency: -line.Amount * (raw.ExchangeRate || 1),
        source_item_id: line.SalesItemLineDetail?.ItemRef?.value || null,
        source_class_id: null,
        source_location_id: null,
        source_created_at: new Date(raw.MetaData.CreateTime),
        source_updated_at: new Date(raw.MetaData.LastUpdatedTime),
      });
    }

    return transactions;
  }

  /**
   * Transform Bronze QuickBooks journal entry to Silver transactions
   */
  transformQuickBooksJournalEntryToSilver(
    bronze: BronzeQuickBooksJournalEntry,
  ): SilverTransaction[] {
    const raw = bronze.raw_data;
    const transactions: SilverTransaction[] = [];
    const qualityIssues: string[] = [];
    let qualityScore = 100;

    // Validate debits equal credits
    const totalDebits = raw.Line.filter(
      (l) => l.JournalEntryLineDetail.PostingType === "Debit",
    ).reduce((sum, l) => sum + l.Amount, 0);
    const totalCredits = raw.Line.filter(
      (l) => l.JournalEntryLineDetail.PostingType === "Credit",
    ).reduce((sum, l) => sum + l.Amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      qualityIssues.push("TXN_001: Journal entry does not balance");
      qualityScore -= 30;
    }

    const txnDate = this.parseDateString(raw.TxnDate);

    const baseMetadata: SilverMetadata = {
      bronze_ingestion_id: bronze.metadata.ingestion_id,
      processing_job_id: crypto.randomUUID(),
      processed_at: new Date(),
      source_system: SilverSourceSystem.QUICKBOOKS,
      organization_id: bronze.metadata.organization_id,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      is_valid: qualityScore >= 70,
    };

    for (const line of raw.Line) {
      const isDebit = line.JournalEntryLineDetail.PostingType === "Debit";

      transactions.push({
        metadata: baseMetadata,
        silver_transaction_id: `silver_qb_je_${raw.Id}_${line.Id}`,
        source_transaction_id: raw.Id,
        source_line_id: line.Id,
        organization_id: bronze.metadata.organization_id,
        transaction_type: SilverTransactionType.JOURNAL_ENTRY,
        transaction_date: txnDate,
        posting_date: txnDate,
        reference_number: raw.DocNumber || null,
        memo: line.Description || raw.PrivateNote || null,
        source_account_id: line.JournalEntryLineDetail.AccountRef.value,
        account_code: null,
        source_contact_id:
          line.JournalEntryLineDetail.Entity?.EntityRef.value || null,
        debit_amount: isDebit ? line.Amount : 0,
        credit_amount: isDebit ? 0 : line.Amount,
        net_amount: isDebit ? line.Amount : -line.Amount,
        currency_code: raw.CurrencyRef.value,
        exchange_rate: raw.ExchangeRate || 1,
        amount_in_base_currency:
          (isDebit ? line.Amount : -line.Amount) * (raw.ExchangeRate || 1),
        source_item_id: null,
        source_class_id: line.JournalEntryLineDetail.ClassRef?.value || null,
        source_location_id:
          line.JournalEntryLineDetail.DepartmentRef?.value || null,
        source_created_at: new Date(raw.MetaData.CreateTime),
        source_updated_at: new Date(raw.MetaData.LastUpdatedTime),
      });
    }

    return transactions;
  }

  /**
   * Transform Bronze Xero account to Silver
   */
  transformXeroAccountToSilver(bronze: BronzeXeroAccount): SilverAccount {
    const raw = bronze.raw_data;
    const qualityIssues: string[] = [];
    let qualityScore = 100;

    if (!raw.Code) {
      qualityIssues.push("ACC_001: Account code is missing");
      qualityScore -= 10;
    }

    const accountType = this.mapXeroClassToSilverType(raw.Class);
    const normalBalance =
      accountType === SilverAccountType.ASSET ||
      accountType === SilverAccountType.EXPENSE
        ? "DEBIT"
        : "CREDIT";

    const metadata: SilverMetadata = {
      bronze_ingestion_id: bronze.metadata.ingestion_id,
      processing_job_id: crypto.randomUUID(),
      processed_at: new Date(),
      source_system: SilverSourceSystem.XERO,
      organization_id: bronze.metadata.organization_id,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      is_valid: qualityScore >= 70,
    };

    return {
      metadata,
      silver_account_id: `silver_xero_acc_${raw.AccountID}`,
      source_account_id: raw.AccountID,
      organization_id: bronze.metadata.organization_id,
      account_code: raw.Code,
      account_name: raw.Name,
      account_type: accountType,
      account_subtype: raw.Type,
      parent_account_id: null,
      source_account_type: raw.Type,
      source_account_subtype: raw.Type,
      is_active: raw.Status === "ACTIVE",
      is_system_account: false,
      hierarchy_level: 1,
      hierarchy_path: raw.Name,
      normal_balance: normalBalance,
      currency_code: raw.CurrencyCode || "CAD",
      source_created_at: new Date(raw.UpdatedDateUTC),
      source_updated_at: new Date(raw.UpdatedDateUTC),
    };
  }

  /**
   * Transform Bronze Xero contact to Silver
   */
  transformXeroContactToSilver(bronze: BronzeXeroContact): SilverContact {
    const raw = bronze.raw_data;
    const qualityIssues: string[] = [];
    let qualityScore = 100;

    const emailIsValid = this.validateEmail(raw.EmailAddress);
    if (raw.EmailAddress && !emailIsValid) {
      qualityIssues.push("CON_001: Invalid email format");
      qualityScore -= 5;
    }

    let contactType: SilverContactType;
    if (raw.IsCustomer && raw.IsSupplier) {
      contactType = SilverContactType.CUSTOMER_AND_VENDOR;
    } else if (raw.IsSupplier) {
      contactType = SilverContactType.VENDOR;
    } else {
      contactType = SilverContactType.CUSTOMER;
    }

    const phone = raw.Phones?.find((p) => p.PhoneType === "DEFAULT");
    const address = raw.Addresses?.find((a) => a.AddressType === "STREET");

    const metadata: SilverMetadata = {
      bronze_ingestion_id: bronze.metadata.ingestion_id,
      processing_job_id: crypto.randomUUID(),
      processed_at: new Date(),
      source_system: SilverSourceSystem.XERO,
      organization_id: bronze.metadata.organization_id,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      is_valid: qualityScore >= 70,
    };

    return {
      metadata,
      silver_contact_id: `silver_xero_contact_${raw.ContactID}`,
      source_contact_id: raw.ContactID,
      organization_id: bronze.metadata.organization_id,
      contact_type: contactType,
      display_name: raw.Name,
      legal_name: raw.Name,
      first_name: raw.FirstName || null,
      last_name: raw.LastName || null,
      email: raw.EmailAddress || null,
      email_is_valid: emailIsValid,
      phone: phone?.PhoneNumber || null,
      phone_normalized: this.normalizePhone(phone?.PhoneNumber),
      address_line1: null,
      address_city: address?.City || null,
      address_province_state: address?.Region || null,
      address_province_code: address?.Region || null,
      address_postal_code: null,
      address_country: address?.Country || null,
      address_country_code: this.normalizeCountryCode(address?.Country),
      is_active: raw.ContactStatus === "ACTIVE",
      source_created_at: new Date(raw.UpdatedDateUTC),
      source_updated_at: new Date(raw.UpdatedDateUTC),
    };
  }

  // ===========================================================================
  // STAGE 3: Silver Layer → Gold Layer (Star Schema)
  // ===========================================================================

  /**
   * Transform Silver account to Gold DimAccount
   */
  transformSilverAccountToGold(
    silver: SilverAccount,
    organizationKey: string,
  ): DimAccount {
    const accountType = this.mapSilverTypeToGoldType(silver.account_type);

    return {
      account_key: `gold_${silver.silver_account_id}`,
      account_id: crypto.randomUUID(),
      source_account_id: silver.source_account_id,
      organization_key: organizationKey,
      account_code: silver.account_code,
      account_name: silver.account_name,
      account_name_fr: silver.account_name, // Would use translation service
      account_type_key: `type_${accountType.toLowerCase()}`,
      account_type: accountType,
      account_subtype: silver.account_subtype,
      source_account_type: silver.source_account_type,
      source_account_subtype: silver.source_account_subtype,
      parent_account_key: silver.parent_account_id
        ? `gold_silver_${silver.metadata.source_system.toLowerCase()}_acc_${silver.parent_account_id}`
        : null,
      hierarchy_level: silver.hierarchy_level,
      hierarchy_path: silver.hierarchy_path,
      is_active: silver.is_active,
      is_system: silver.is_system_account,
      display_order: parseInt(silver.account_code) || 0,
      is_debit_normal: silver.normal_balance === "DEBIT",
      balance_sheet_section: this.getBalanceSheetSection(accountType),
      income_statement_section: this.getIncomeStatementSection(accountType),
      cash_flow_section: null,
      is_gst_hst_collected: false,
      is_gst_hst_paid: false,
      is_pst_qst_collected: false,
      gifi_code: null,
      is_sred_eligible: false,
      is_apprentice_wage: false,
      is_digital_media_labour: false,
      is_clean_tech_asset: false,
    };
  }

  /**
   * Transform Silver contact to Gold DimContact
   */
  transformSilverContactToGold(
    silver: SilverContact,
    organizationKey: string,
  ): DimContact {
    return {
      contact_key: `gold_${silver.silver_contact_id}`,
      contact_id: crypto.randomUUID(),
      source_contact_id: silver.source_contact_id,
      organization_key: organizationKey,
      contact_type: this.mapSilverContactTypeToGold(silver.contact_type),
      contact_name:
        [silver.first_name, silver.last_name].filter(Boolean).join(" ") ||
        silver.display_name,
      display_name: silver.display_name,
      company_name: silver.legal_name || silver.display_name,
      email: silver.email || "",
      phone: silver.phone || "",
      address_city: silver.address_city || "",
      address_province_state: silver.address_province_state || "",
      address_country: silver.address_country_code || "CA",
      is_customer:
        silver.contact_type === SilverContactType.CUSTOMER ||
        silver.contact_type === SilverContactType.CUSTOMER_AND_VENDOR,
      is_vendor:
        silver.contact_type === SilverContactType.VENDOR ||
        silver.contact_type === SilverContactType.CUSTOMER_AND_VENDOR,
      is_active: silver.is_active,
      payment_terms: "",
      tax_number: "",
    };
  }

  /**
   * Transform Silver transactions to Gold FactTransactions
   */
  transformSilverTransactionsToGold(
    silverTxns: SilverTransaction[],
    organizationKey: string,
    accountKeyMap: Map<string, string>,
    contactKeyMap: Map<string, string>,
  ): FactTransaction[] {
    return silverTxns.map((silver) => {
      const sourceSystem = this.mapSilverSourceToGold(
        silver.metadata.source_system,
      );

      return {
        transaction_key: `gold_${silver.silver_transaction_id}`,
        transaction_id: crypto.randomUUID(),
        organization_key: organizationKey,
        business_unit_key: null,
        account_key:
          accountKeyMap.get(silver.source_account_id) ||
          `gold_acc_${silver.source_account_id}`,
        date_key: this.toDateKey(silver.transaction_date),
        contact_key: silver.source_contact_id
          ? contactKeyMap.get(silver.source_contact_id) ||
            `gold_contact_${silver.source_contact_id}`
          : null,
        item_key: silver.source_item_id
          ? `gold_item_${silver.source_item_id}`
          : null,
        class_key: silver.source_class_id
          ? `gold_class_${silver.source_class_id}`
          : null,
        location_key: silver.source_location_id
          ? `gold_loc_${silver.source_location_id}`
          : null,
        transaction_type_key: `type_${silver.transaction_type.toLowerCase()}`,
        transaction_date: silver.transaction_date,
        posting_date: silver.posting_date,
        debit_amount: silver.debit_amount,
        credit_amount: silver.credit_amount,
        amount: silver.net_amount,
        currency_code: silver.currency_code,
        exchange_rate: silver.exchange_rate,
        amount_cad: silver.amount_in_base_currency,
        reference_number: silver.reference_number || "",
        memo: silver.memo || "",
        source_system: sourceSystem,
        source_transaction_id: silver.source_transaction_id,
        created_at: silver.source_created_at,
        updated_at: silver.source_updated_at,
      };
    });
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private createBronzeMetadata(
    sourceSystem: string,
    organizationId: string,
    datasourceId: string,
    endpoint: string,
    recordCount: number,
    payload: string,
  ): BronzeMetadata {
    return {
      ingestion_id: crypto.randomUUID(),
      source_system: sourceSystem,
      organization_id: organizationId,
      datasource_id: datasourceId,
      ingested_at: new Date(),
      source_endpoint: endpoint,
      ingestion_status: "success",
      record_count: recordCount,
      payload_hash: this.hashPayload(payload),
    };
  }

  private hashPayload(payload: string): string {
    // Simple hash for deduplication
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private mapQBClassificationToSilverType(
    classification: string,
  ): SilverAccountType {
    const mapping: Record<string, SilverAccountType> = {
      Asset: SilverAccountType.ASSET,
      Liability: SilverAccountType.LIABILITY,
      Equity: SilverAccountType.EQUITY,
      Revenue: SilverAccountType.REVENUE,
      Expense: SilverAccountType.EXPENSE,
    };
    return mapping[classification] || SilverAccountType.EXPENSE;
  }

  private mapXeroClassToSilverType(xeroClass: string): SilverAccountType {
    const mapping: Record<string, SilverAccountType> = {
      ASSET: SilverAccountType.ASSET,
      LIABILITY: SilverAccountType.LIABILITY,
      EQUITY: SilverAccountType.EQUITY,
      REVENUE: SilverAccountType.REVENUE,
      EXPENSE: SilverAccountType.EXPENSE,
    };
    return mapping[xeroClass] || SilverAccountType.EXPENSE;
  }

  private mapSilverTypeToGoldType(silverType: SilverAccountType): AccountType {
    const mapping: Record<SilverAccountType, AccountType> = {
      [SilverAccountType.ASSET]: AccountType.ASSET,
      [SilverAccountType.LIABILITY]: AccountType.LIABILITY,
      [SilverAccountType.EQUITY]: AccountType.EQUITY,
      [SilverAccountType.REVENUE]: AccountType.REVENUE,
      [SilverAccountType.EXPENSE]: AccountType.EXPENSE,
    };
    return mapping[silverType];
  }

  private mapSilverContactTypeToGold(
    silverType: SilverContactType,
  ): ContactType {
    const mapping: Record<SilverContactType, ContactType> = {
      [SilverContactType.CUSTOMER]: ContactType.CUSTOMER,
      [SilverContactType.VENDOR]: ContactType.VENDOR,
      [SilverContactType.CUSTOMER_AND_VENDOR]: ContactType.BOTH,
    };
    return mapping[silverType];
  }

  private mapSilverSourceToGold(source: SilverSourceSystem): SourceSystem {
    const mapping: Record<SilverSourceSystem, SourceSystem> = {
      [SilverSourceSystem.QUICKBOOKS]: SourceSystem.QUICKBOOKS,
      [SilverSourceSystem.XERO]: SourceSystem.XERO,
      [SilverSourceSystem.SAGE]: SourceSystem.SAGE,
      [SilverSourceSystem.FRESHBOOKS]: SourceSystem.FRESHBOOKS,
      [SilverSourceSystem.WAVE]: SourceSystem.WAVE,
      [SilverSourceSystem.CSV]: SourceSystem.CSV,
    };
    return mapping[source];
  }

  private normalizeSubtype(subtype: string): string {
    if (!subtype) return "";
    return subtype
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^./, (s) => s.toUpperCase());
  }

  private validateEmail(email: string | undefined): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private normalizePhone(phone: string | undefined): string | null {
    if (!phone) return null;
    return phone.replace(/\D/g, "");
  }

  private normalizeCountryCode(country: string | undefined): string | null {
    if (!country) return null;
    const mapping: Record<string, string> = {
      Canada: "CA",
      CA: "CA",
      "United States": "US",
      USA: "US",
      US: "US",
    };
    return mapping[country] || country.substring(0, 2).toUpperCase();
  }

  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  private parseDateString(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00Z`);
  }

  private toDateKey(date: Date): number {
    return (
      date.getUTCFullYear() * 10000 +
      (date.getUTCMonth() + 1) * 100 +
      date.getUTCDate()
    );
  }

  private getBalanceSheetSection(accountType: AccountType): string | null {
    if (
      accountType === AccountType.ASSET ||
      accountType === AccountType.LIABILITY ||
      accountType === AccountType.EQUITY
    ) {
      return accountType;
    }
    return null;
  }

  private getIncomeStatementSection(accountType: AccountType): string | null {
    if (
      accountType === AccountType.REVENUE ||
      accountType === AccountType.EXPENSE
    ) {
      return accountType;
    }
    return null;
  }
}
