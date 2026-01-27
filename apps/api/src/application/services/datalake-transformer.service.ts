/**
 * Datalake Transformer Service
 * Transforms provider-specific data into standardized datalake schema format
 */

import {
  DimAccount,
  DimContact,
  FactTransaction,
  AccountType,
  ContactType,
  TransactionTypeCode,
  SourceSystem,
} from "@domain/datalake/schemas";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksVendor,
  QuickBooksInvoice,
  QuickBooksJournalEntry,
  XeroAccount,
  XeroContact,
  XeroInvoice,
  XeroManualJournal,
  SageAccount,
  SageContact,
  SageInvoice,
  FreshBooksAccount,
  FreshBooksClient,
  FreshBooksInvoice,
} from "@domain/datalake/provider-types";

export class DatalakeTransformerService {
  // =============================================================================
  // Account Transformers
  // =============================================================================

  /**
   * Transform QuickBooks account to DimAccount
   */
  transformQuickBooksAccount(
    qbAccount: QuickBooksAccount,
    organizationKey: string,
  ): DimAccount {
    const accountType = this.mapQuickBooksAccountType(qbAccount.Classification);
    const isDebitNormal =
      accountType === AccountType.ASSET || accountType === AccountType.EXPENSE;

    return {
      account_key: `qb_${qbAccount.Id}`,
      account_id: crypto.randomUUID(),
      source_account_id: qbAccount.Id,
      organization_key: organizationKey,
      account_code: qbAccount.AcctNum || qbAccount.Id,
      account_name: qbAccount.Name,
      account_name_fr: qbAccount.Name, // Would need translation service
      account_type_key: `type_${accountType.toLowerCase()}`,
      account_type: accountType,
      account_subtype: this.normalizeSubtype(qbAccount.AccountSubType),
      source_account_type: qbAccount.AccountType,
      source_account_subtype: qbAccount.AccountSubType,
      parent_account_key: qbAccount.ParentRef
        ? `qb_${qbAccount.ParentRef.value}`
        : null,
      hierarchy_level: qbAccount.FullyQualifiedName.split(":").length,
      hierarchy_path: qbAccount.FullyQualifiedName.replace(/:/g, "/"),
      is_active: qbAccount.Active,
      is_system: false,
      display_order: parseInt(qbAccount.AcctNum || "0") || 0,
      is_debit_normal: isDebitNormal,
      balance_sheet_section: this.getBalanceSheetSection(accountType),
      income_statement_section: this.getIncomeStatementSection(accountType),
      cash_flow_section: this.getCashFlowSection(qbAccount.AccountSubType),
      is_gst_hst_collected: this.isGstHstCollected(qbAccount),
      is_gst_hst_paid: this.isGstHstPaid(qbAccount),
      is_pst_qst_collected: false,
      gifi_code: null, // Would map from account type
      is_sred_eligible: false,
      is_apprentice_wage: false,
      is_digital_media_labour: false,
      is_clean_tech_asset: false,
    };
  }

  /**
   * Transform Xero account to DimAccount
   */
  transformXeroAccount(
    xeroAccount: XeroAccount,
    organizationKey: string,
  ): DimAccount {
    const accountType = this.mapXeroAccountClass(xeroAccount.Class);
    const isDebitNormal =
      accountType === AccountType.ASSET || accountType === AccountType.EXPENSE;

    return {
      account_key: `xero_${xeroAccount.AccountID}`,
      account_id: crypto.randomUUID(),
      source_account_id: xeroAccount.AccountID,
      organization_key: organizationKey,
      account_code: xeroAccount.Code,
      account_name: xeroAccount.Name,
      account_name_fr: xeroAccount.Name,
      account_type_key: `type_${accountType.toLowerCase()}`,
      account_type: accountType,
      account_subtype: this.mapXeroAccountType(xeroAccount.Type),
      source_account_type: xeroAccount.Type,
      source_account_subtype: xeroAccount.Type,
      parent_account_key: null, // Xero doesn't have parent accounts in same way
      hierarchy_level: 1,
      hierarchy_path: xeroAccount.Name,
      is_active: xeroAccount.Status === "ACTIVE",
      is_system: false,
      display_order: parseInt(xeroAccount.Code) || 0,
      is_debit_normal: isDebitNormal,
      balance_sheet_section: this.getBalanceSheetSection(accountType),
      income_statement_section: this.getIncomeStatementSection(accountType),
      cash_flow_section: this.getCashFlowSection(xeroAccount.Type),
      is_gst_hst_collected:
        xeroAccount.TaxType === "OUTPUT" ||
        xeroAccount.TaxType === "GSTONREVENUE",
      is_gst_hst_paid:
        xeroAccount.TaxType === "INPUT" ||
        xeroAccount.TaxType === "GSTONEXPENSES",
      is_pst_qst_collected: false,
      gifi_code: xeroAccount.ReportingCode || null,
      is_sred_eligible: false,
      is_apprentice_wage: false,
      is_digital_media_labour: false,
      is_clean_tech_asset: false,
    };
  }

  /**
   * Transform Sage account to DimAccount
   */
  transformSageAccount(
    sageAccount: SageAccount,
    organizationKey: string,
  ): DimAccount {
    const accountType = this.mapSageAccountClassification(
      sageAccount.ledger_account_classification.displayed_as,
    );
    const isDebitNormal =
      accountType === AccountType.ASSET || accountType === AccountType.EXPENSE;

    return {
      account_key: `sage_${sageAccount.id}`,
      account_id: crypto.randomUUID(),
      source_account_id: sageAccount.id,
      organization_key: organizationKey,
      account_code: sageAccount.nominal_code.toString(),
      account_name: sageAccount.displayed_as,
      account_name_fr: sageAccount.displayed_as,
      account_type_key: `type_${accountType.toLowerCase()}`,
      account_type: accountType,
      account_subtype: sageAccount.ledger_account_type.displayed_as,
      source_account_type: sageAccount.ledger_account_type.displayed_as,
      source_account_subtype: sageAccount.ledger_account_group.displayed_as,
      parent_account_key: null,
      hierarchy_level: 1,
      hierarchy_path: sageAccount.displayed_as,
      is_active: sageAccount.is_enabled,
      is_system: false,
      display_order: sageAccount.nominal_code,
      is_debit_normal: isDebitNormal,
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
   * Transform FreshBooks account to DimAccount
   */
  transformFreshBooksAccount(
    fbAccount: FreshBooksAccount,
    organizationKey: string,
  ): DimAccount {
    const accountType = this.mapFreshBooksAccountType(
      fbAccount.account_type.account_type,
    );
    const isDebitNormal =
      accountType === AccountType.ASSET || accountType === AccountType.EXPENSE;

    return {
      account_key: `fb_${fbAccount.accountid}`,
      account_id: crypto.randomUUID(),
      source_account_id: fbAccount.accountid.toString(),
      organization_key: organizationKey,
      account_code: fbAccount.account_number,
      account_name: fbAccount.name,
      account_name_fr: fbAccount.name,
      account_type_key: `type_${accountType.toLowerCase()}`,
      account_type: accountType,
      account_subtype: fbAccount.account_type.account_subtype,
      source_account_type: fbAccount.account_type.account_type,
      source_account_subtype: fbAccount.account_type.account_subtype,
      parent_account_key: fbAccount.parent_accountid
        ? `fb_${fbAccount.parent_accountid}`
        : null,
      hierarchy_level: fbAccount.parent_accountid ? 2 : 1,
      hierarchy_path: fbAccount.name,
      is_active: fbAccount.active,
      is_system: fbAccount.system_account,
      display_order: parseInt(fbAccount.account_number) || 0,
      is_debit_normal: isDebitNormal,
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

  // =============================================================================
  // Contact Transformers
  // =============================================================================

  /**
   * Transform QuickBooks customer to DimContact
   */
  transformQuickBooksCustomer(
    qbCustomer: QuickBooksCustomer,
    organizationKey: string,
  ): DimContact {
    return {
      contact_key: `qb_cust_${qbCustomer.Id}`,
      contact_id: crypto.randomUUID(),
      source_contact_id: qbCustomer.Id,
      organization_key: organizationKey,
      contact_type: ContactType.CUSTOMER,
      contact_name:
        `${qbCustomer.GivenName || ""} ${qbCustomer.FamilyName || ""}`.trim() ||
        qbCustomer.DisplayName,
      display_name: qbCustomer.DisplayName,
      company_name: qbCustomer.CompanyName || "",
      email: qbCustomer.PrimaryEmailAddr?.Address || "",
      phone: qbCustomer.PrimaryPhone?.FreeFormNumber || "",
      address_city: qbCustomer.BillAddr?.City || "",
      address_province_state: qbCustomer.BillAddr?.CountrySubDivisionCode || "",
      address_country: qbCustomer.BillAddr?.Country || "CA",
      is_customer: true,
      is_vendor: false,
      is_active: qbCustomer.Active,
      payment_terms: "",
      tax_number: "",
    };
  }

  /**
   * Transform QuickBooks vendor to DimContact
   */
  transformQuickBooksVendor(
    qbVendor: QuickBooksVendor,
    organizationKey: string,
  ): DimContact {
    return {
      contact_key: `qb_vend_${qbVendor.Id}`,
      contact_id: crypto.randomUUID(),
      source_contact_id: qbVendor.Id,
      organization_key: organizationKey,
      contact_type: ContactType.VENDOR,
      contact_name:
        `${qbVendor.GivenName || ""} ${qbVendor.FamilyName || ""}`.trim() ||
        qbVendor.DisplayName,
      display_name: qbVendor.DisplayName,
      company_name: qbVendor.CompanyName || "",
      email: qbVendor.PrimaryEmailAddr?.Address || "",
      phone: qbVendor.PrimaryPhone?.FreeFormNumber || "",
      address_city: qbVendor.BillAddr?.City || "",
      address_province_state: qbVendor.BillAddr?.CountrySubDivisionCode || "",
      address_country: qbVendor.BillAddr?.Country || "CA",
      is_customer: false,
      is_vendor: true,
      is_active: qbVendor.Active,
      payment_terms: "",
      tax_number: "",
    };
  }

  /**
   * Transform Xero contact to DimContact
   */
  transformXeroContact(
    xeroContact: XeroContact,
    organizationKey: string,
  ): DimContact {
    const phone = xeroContact.Phones?.find((p) => p.PhoneType === "DEFAULT");
    const address = xeroContact.Addresses?.find(
      (a) => a.AddressType === "STREET",
    );

    let contactType: ContactType;
    if (xeroContact.IsCustomer && xeroContact.IsSupplier) {
      contactType = ContactType.BOTH;
    } else if (xeroContact.IsSupplier) {
      contactType = ContactType.VENDOR;
    } else {
      contactType = ContactType.CUSTOMER;
    }

    return {
      contact_key: `xero_${xeroContact.ContactID}`,
      contact_id: crypto.randomUUID(),
      source_contact_id: xeroContact.ContactID,
      organization_key: organizationKey,
      contact_type: contactType,
      contact_name:
        `${xeroContact.FirstName || ""} ${xeroContact.LastName || ""}`.trim() ||
        xeroContact.Name,
      display_name: xeroContact.Name,
      company_name: xeroContact.Name,
      email: xeroContact.EmailAddress || "",
      phone: phone?.PhoneNumber || "",
      address_city: address?.City || "",
      address_province_state: address?.Region || "",
      address_country: address?.Country || "CA",
      is_customer: xeroContact.IsCustomer,
      is_vendor: xeroContact.IsSupplier,
      is_active: xeroContact.ContactStatus === "ACTIVE",
      payment_terms: "",
      tax_number: "",
    };
  }

  // =============================================================================
  // Transaction Transformers
  // =============================================================================

  /**
   * Transform QuickBooks invoice to FactTransactions
   */
  transformQuickBooksInvoice(
    invoice: QuickBooksInvoice,
    organizationKey: string,
    accountKeyMap: Map<string, string>,
  ): FactTransaction[] {
    const transactions: FactTransaction[] = [];
    const txnDate = this.parseDateString(invoice.TxnDate);
    const dateKey = this.toDateKey(txnDate);
    const exchangeRate = invoice.ExchangeRate || 1;

    // Create A/R debit entry
    const arTransaction: FactTransaction = {
      transaction_key: `qb_inv_${invoice.Id}_ar`,
      transaction_id: crypto.randomUUID(),
      organization_key: organizationKey,
      business_unit_key: null,
      account_key: accountKeyMap.get("accounts_receivable") || "ar_default",
      date_key: dateKey,
      contact_key: `qb_cust_${invoice.CustomerRef.value}`,
      item_key: null,
      class_key: null,
      location_key: null,
      transaction_type_key: "type_invoice",
      transaction_date: txnDate,
      posting_date: txnDate,
      debit_amount: invoice.TotalAmt,
      credit_amount: 0,
      amount: invoice.TotalAmt,
      currency_code: invoice.CurrencyRef.value,
      exchange_rate: exchangeRate,
      amount_cad: invoice.TotalAmt * exchangeRate,
      reference_number: invoice.DocNumber,
      memo: invoice.PrivateNote || "",
      source_system: SourceSystem.QUICKBOOKS,
      source_transaction_id: invoice.Id,
      created_at: new Date(invoice.MetaData.CreateTime),
      updated_at: new Date(invoice.MetaData.LastUpdatedTime),
    };
    transactions.push(arTransaction);

    // Create revenue credit entries for each line
    for (const line of invoice.Line) {
      if (line.DetailType === "SubTotalLineDetail") continue;

      const accountRef =
        line.SalesItemLineDetail?.ItemRef?.value ||
        line.AccountBasedExpenseLineDetail?.AccountRef.value;
      const accountKey = accountRef
        ? accountKeyMap.get(accountRef) || `qb_${accountRef}`
        : "revenue_default";

      const revenueTransaction: FactTransaction = {
        transaction_key: `qb_inv_${invoice.Id}_line_${line.Id}`,
        transaction_id: crypto.randomUUID(),
        organization_key: organizationKey,
        business_unit_key: null,
        account_key: accountKey,
        date_key: dateKey,
        contact_key: `qb_cust_${invoice.CustomerRef.value}`,
        item_key: line.SalesItemLineDetail?.ItemRef
          ? `qb_item_${line.SalesItemLineDetail.ItemRef.value}`
          : null,
        class_key: null,
        location_key: null,
        transaction_type_key: "type_invoice",
        transaction_date: txnDate,
        posting_date: txnDate,
        debit_amount: 0,
        credit_amount: line.Amount,
        amount: -line.Amount,
        currency_code: invoice.CurrencyRef.value,
        exchange_rate: exchangeRate,
        amount_cad: -line.Amount * exchangeRate,
        reference_number: invoice.DocNumber,
        memo: line.Description || "",
        source_system: SourceSystem.QUICKBOOKS,
        source_transaction_id: `${invoice.Id}_${line.Id}`,
        created_at: new Date(invoice.MetaData.CreateTime),
        updated_at: new Date(invoice.MetaData.LastUpdatedTime),
      };
      transactions.push(revenueTransaction);
    }

    return transactions;
  }

  /**
   * Transform QuickBooks journal entry to FactTransactions
   */
  transformQuickBooksJournalEntry(
    journal: QuickBooksJournalEntry,
    organizationKey: string,
  ): FactTransaction[] {
    const transactions: FactTransaction[] = [];
    const txnDate = this.parseDateString(journal.TxnDate);
    const dateKey = this.toDateKey(txnDate);
    const exchangeRate = journal.ExchangeRate || 1;

    for (const line of journal.Line) {
      const isDebit = line.JournalEntryLineDetail.PostingType === "Debit";
      const accountRef = line.JournalEntryLineDetail.AccountRef.value;

      const transaction: FactTransaction = {
        transaction_key: `qb_je_${journal.Id}_${line.Id}`,
        transaction_id: crypto.randomUUID(),
        organization_key: organizationKey,
        business_unit_key: null,
        account_key: `qb_${accountRef}`,
        date_key: dateKey,
        contact_key: line.JournalEntryLineDetail.Entity
          ? `qb_${line.JournalEntryLineDetail.Entity.Type.toLowerCase()}_${line.JournalEntryLineDetail.Entity.EntityRef.value}`
          : null,
        item_key: null,
        class_key: line.JournalEntryLineDetail.ClassRef
          ? `qb_class_${line.JournalEntryLineDetail.ClassRef.value}`
          : null,
        location_key: line.JournalEntryLineDetail.DepartmentRef
          ? `qb_dept_${line.JournalEntryLineDetail.DepartmentRef.value}`
          : null,
        transaction_type_key: "type_journal",
        transaction_date: txnDate,
        posting_date: txnDate,
        debit_amount: isDebit ? line.Amount : 0,
        credit_amount: isDebit ? 0 : line.Amount,
        amount: isDebit ? line.Amount : -line.Amount,
        currency_code: journal.CurrencyRef.value,
        exchange_rate: exchangeRate,
        amount_cad: (isDebit ? line.Amount : -line.Amount) * exchangeRate,
        reference_number: journal.DocNumber || "",
        memo: line.Description || journal.PrivateNote || "",
        source_system: SourceSystem.QUICKBOOKS,
        source_transaction_id: `${journal.Id}_${line.Id}`,
        created_at: new Date(journal.MetaData.CreateTime),
        updated_at: new Date(journal.MetaData.LastUpdatedTime),
      };
      transactions.push(transaction);
    }

    return transactions;
  }

  /**
   * Transform Xero invoice to FactTransactions
   */
  transformXeroInvoice(
    invoice: XeroInvoice,
    organizationKey: string,
  ): FactTransaction[] {
    const transactions: FactTransaction[] = [];
    const txnDate = this.parseDateString(invoice.Date);
    const dateKey = this.toDateKey(txnDate);
    const exchangeRate = invoice.CurrencyRate || 1;
    const isReceivable = invoice.Type === "ACCREC";

    // A/R or A/P entry
    const controlTransaction: FactTransaction = {
      transaction_key: `xero_inv_${invoice.InvoiceID}_control`,
      transaction_id: crypto.randomUUID(),
      organization_key: organizationKey,
      business_unit_key: null,
      account_key: isReceivable ? "ar_default" : "ap_default",
      date_key: dateKey,
      contact_key: `xero_${invoice.Contact.ContactID}`,
      item_key: null,
      class_key: null,
      location_key: null,
      transaction_type_key: isReceivable ? "type_invoice" : "type_bill",
      transaction_date: txnDate,
      posting_date: txnDate,
      debit_amount: isReceivable ? invoice.Total : 0,
      credit_amount: isReceivable ? 0 : invoice.Total,
      amount: isReceivable ? invoice.Total : -invoice.Total,
      currency_code: invoice.CurrencyCode,
      exchange_rate: exchangeRate,
      amount_cad:
        (isReceivable ? invoice.Total : -invoice.Total) * exchangeRate,
      reference_number: invoice.InvoiceNumber,
      memo: invoice.Reference || "",
      source_system: SourceSystem.XERO,
      source_transaction_id: invoice.InvoiceID,
      created_at: new Date(invoice.UpdatedDateUTC),
      updated_at: new Date(invoice.UpdatedDateUTC),
    };
    transactions.push(controlTransaction);

    // Line items
    for (const line of invoice.LineItems) {
      const accountKey = line.AccountCode
        ? `xero_${line.AccountCode}`
        : "default_account";

      const lineTransaction: FactTransaction = {
        transaction_key: `xero_inv_${invoice.InvoiceID}_${line.LineItemID}`,
        transaction_id: crypto.randomUUID(),
        organization_key: organizationKey,
        business_unit_key: null,
        account_key: accountKey,
        date_key: dateKey,
        contact_key: `xero_${invoice.Contact.ContactID}`,
        item_key: line.ItemCode ? `xero_item_${line.ItemCode}` : null,
        class_key:
          line.Tracking && line.Tracking.length > 0
            ? `xero_track_${line.Tracking[0].TrackingCategoryID}`
            : null,
        location_key: null,
        transaction_type_key: isReceivable ? "type_invoice" : "type_bill",
        transaction_date: txnDate,
        posting_date: txnDate,
        debit_amount: isReceivable ? 0 : line.LineAmount,
        credit_amount: isReceivable ? line.LineAmount : 0,
        amount: isReceivable ? -line.LineAmount : line.LineAmount,
        currency_code: invoice.CurrencyCode,
        exchange_rate: exchangeRate,
        amount_cad:
          (isReceivable ? -line.LineAmount : line.LineAmount) * exchangeRate,
        reference_number: invoice.InvoiceNumber,
        memo: line.Description || "",
        source_system: SourceSystem.XERO,
        source_transaction_id: `${invoice.InvoiceID}_${line.LineItemID}`,
        created_at: new Date(invoice.UpdatedDateUTC),
        updated_at: new Date(invoice.UpdatedDateUTC),
      };
      transactions.push(lineTransaction);
    }

    return transactions;
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private mapQuickBooksAccountType(
    classification: QuickBooksAccount["Classification"],
  ): AccountType {
    const mapping: Record<string, AccountType> = {
      Asset: AccountType.ASSET,
      Liability: AccountType.LIABILITY,
      Equity: AccountType.EQUITY,
      Revenue: AccountType.REVENUE,
      Expense: AccountType.EXPENSE,
    };
    return mapping[classification] || AccountType.EXPENSE;
  }

  private mapXeroAccountClass(accountClass: XeroAccount["Class"]): AccountType {
    const mapping: Record<string, AccountType> = {
      ASSET: AccountType.ASSET,
      LIABILITY: AccountType.LIABILITY,
      EQUITY: AccountType.EQUITY,
      REVENUE: AccountType.REVENUE,
      EXPENSE: AccountType.EXPENSE,
    };
    return mapping[accountClass] || AccountType.EXPENSE;
  }

  private mapXeroAccountType(type: XeroAccount["Type"]): string {
    const mapping: Record<string, string> = {
      BANK: "Bank",
      CURRENT: "Current Asset",
      CURRLIAB: "Current Liability",
      DEPRECIATN: "Depreciation",
      DIRECTCOSTS: "Direct Costs",
      EQUITY: "Equity",
      EXPENSE: "Expense",
      FIXED: "Fixed Asset",
      INVENTORY: "Inventory",
      LIABILITY: "Liability",
      NONCURRENT: "Non-current Asset",
      OTHERINCOME: "Other Income",
      OVERHEADS: "Overheads",
      PREPAYMENT: "Prepayment",
      REVENUE: "Revenue",
      SALES: "Sales",
      TERMLIAB: "Term Liability",
      PAYGLIABILITY: "PAYG Liability",
      SUPERANNUATIONEXPENSE: "Superannuation Expense",
      SUPERANNUATIONLIABILITY: "Superannuation Liability",
      WAGESEXPENSE: "Wages Expense",
    };
    return mapping[type] || type;
  }

  private mapSageAccountClassification(classification: string): AccountType {
    const lowerClass = classification.toLowerCase();
    if (lowerClass.includes("asset")) return AccountType.ASSET;
    if (lowerClass.includes("liabilit")) return AccountType.LIABILITY;
    if (lowerClass.includes("equity") || lowerClass.includes("capital"))
      return AccountType.EQUITY;
    if (lowerClass.includes("income") || lowerClass.includes("revenue"))
      return AccountType.REVENUE;
    return AccountType.EXPENSE;
  }

  private mapFreshBooksAccountType(accountType: string): AccountType {
    const mapping: Record<string, AccountType> = {
      asset: AccountType.ASSET,
      liability: AccountType.LIABILITY,
      equity: AccountType.EQUITY,
      income: AccountType.REVENUE,
      expense: AccountType.EXPENSE,
    };
    return mapping[accountType.toLowerCase()] || AccountType.EXPENSE;
  }

  private normalizeSubtype(subtype: string): string {
    return subtype
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^./, (s) => s.toUpperCase());
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

  private getCashFlowSection(subtype: string): string | null {
    const operating = [
      "bank",
      "cash",
      "accounts receivable",
      "accounts payable",
      "inventory",
    ];
    const investing = ["fixed", "property", "equipment", "investment"];
    const financing = ["loan", "mortgage", "capital", "dividend"];

    const lower = subtype.toLowerCase();
    if (operating.some((o) => lower.includes(o))) return "OPERATING";
    if (investing.some((i) => lower.includes(i))) return "INVESTING";
    if (financing.some((f) => lower.includes(f))) return "FINANCING";
    return null;
  }

  private isGstHstCollected(account: QuickBooksAccount): boolean {
    const taxTypes = ["gstonrevenue", "hst", "gst", "tax collected"];
    return taxTypes.some((t) =>
      account.AccountSubType?.toLowerCase().includes(t),
    );
  }

  private isGstHstPaid(account: QuickBooksAccount): boolean {
    const taxTypes = ["gstonexpenses", "input tax", "itc"];
    return taxTypes.some((t) =>
      account.AccountSubType?.toLowerCase().includes(t),
    );
  }

  private toDateKey(date: Date): number {
    // Use UTC methods to avoid timezone issues
    return (
      date.getUTCFullYear() * 10000 +
      (date.getUTCMonth() + 1) * 100 +
      date.getUTCDate()
    );
  }

  /**
   * Parse a date string (YYYY-MM-DD) to a Date object at UTC midnight
   */
  private parseDateString(dateStr: string): Date {
    // Add time component to ensure UTC parsing
    return new Date(`${dateStr}T00:00:00Z`);
  }
}
