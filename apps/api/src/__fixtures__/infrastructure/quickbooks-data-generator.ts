/**
 * QuickBooks Data Generator
 *
 * Clean Architecture: Infrastructure layer - generates provider-specific test data.
 * Uses seeded random number generation for reproducible test fixtures.
 */

import {
  IndustryFinancialProfile,
  QuickBooksDataset,
  QuickBooksAccountData,
  QuickBooksCustomerData,
  QuickBooksVendorData,
  QuickBooksInvoiceData,
  QuickBooksCompanyInfo,
  AccountTemplate,
  FixtureOptions,
} from "../domain/industry-financial-profile";

// =============================================================================
// Seeded Random Number Generator
// =============================================================================

/**
 * Simple Linear Congruential Generator for reproducible randomness
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /**
   * Generate random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  /**
   * Generate random float in range [min, max]
   */
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

// =============================================================================
// QuickBooks Data Generator
// =============================================================================

export class QuickBooksDataGenerator {
  private readonly profile: IndustryFinancialProfile;
  private readonly random: SeededRandom;
  private accountIdCounter = 1;
  private customerIdCounter = 101;
  private vendorIdCounter = 201;
  private invoiceIdCounter = 1001;
  private journalEntryIdCounter = 5001;

  constructor(profile: IndustryFinancialProfile, seed: number = Date.now()) {
    this.profile = profile;
    this.random = new SeededRandom(seed);
  }

  /**
   * Generate a complete QuickBooks-like dataset for this industry
   */
  generateFullDataset(options: FixtureOptions = {}): QuickBooksDataset {
    const revenue =
      options.revenue ??
      this.random.nextFloat(
        this.profile.companyProfile.typicalRevenue.min,
        this.profile.companyProfile.typicalRevenue.max,
      );

    return {
      companyInfo: this.generateCompanyInfo(),
      accounts: this.generateAccounts(revenue),
      customers: this.generateCustomers(options.customerCount ?? 10),
      vendors: this.generateVendors(options.vendorCount ?? 5),
      invoices: this.generateInvoices(revenue, options.invoiceCount ?? 12),
      journalEntries: [],
    };
  }

  /**
   * Generate company info
   */
  private generateCompanyInfo(): QuickBooksCompanyInfo {
    const province = this.profile.companyProfile.province;
    const city = this.getCityForProvince(province);
    const companyName = this.profile.companyProfile.companyNameTemplate
      .replace("{province}", province)
      .replace("{city}", city);

    return {
      CompanyName: companyName,
      LegalName: companyName.replace("Inc.", "Incorporated"),
      Country: "CA",
      FiscalYearStartMonth: this.getMonthName(
        this.profile.companyProfile.fiscalYearStartMonth,
      ),
      CompanyAddr: {
        Line1: `${this.random.nextInt(100, 9999)} ${this.pickStreetName()}`,
        City: city,
        CountrySubDivisionCode: province,
        PostalCode: this.generatePostalCode(province),
        Country: "Canada",
      },
    };
  }

  /**
   * Generate accounts based on profile structure
   */
  private generateAccounts(annualRevenue: number): QuickBooksAccountData[] {
    const accounts: QuickBooksAccountData[] = [];
    let accountNumCounter = 1000;

    // Revenue accounts
    for (const template of this.profile.accountStructure.revenueAccounts) {
      accounts.push(
        this.createAccountFromTemplate(
          template,
          accountNumCounter++,
          this.random.nextFloat(
            template.typicalBalanceRange!.min,
            template.typicalBalanceRange!.max,
          ),
        ),
      );
    }

    // Expense accounts
    for (const template of this.profile.accountStructure.expenseAccounts) {
      const balance = template.balanceAsPercentOfRevenue
        ? annualRevenue * template.balanceAsPercentOfRevenue
        : this.random.nextFloat(
            template.typicalBalanceRange!.min,
            template.typicalBalanceRange!.max,
          );
      accounts.push(
        this.createAccountFromTemplate(template, accountNumCounter++, balance),
      );
    }

    // COGS accounts
    if (this.profile.accountStructure.cogsAccounts) {
      for (const template of this.profile.accountStructure.cogsAccounts) {
        const balance = template.balanceAsPercentOfRevenue
          ? annualRevenue * template.balanceAsPercentOfRevenue
          : this.random.nextFloat(
              template.typicalBalanceRange!.min,
              template.typicalBalanceRange!.max,
            );
        accounts.push(
          this.createAccountFromTemplate(
            template,
            accountNumCounter++,
            balance,
          ),
        );
      }
    }

    // Asset accounts
    for (const template of this.profile.accountStructure.assetAccounts) {
      const balance = template.isContra
        ? -this.random.nextFloat(
            Math.abs(template.typicalBalanceRange!.min),
            Math.abs(template.typicalBalanceRange!.max),
          )
        : this.random.nextFloat(
            template.typicalBalanceRange!.min,
            template.typicalBalanceRange!.max,
          );
      accounts.push(
        this.createAccountFromTemplate(template, accountNumCounter++, balance),
      );
    }

    // Liability accounts
    for (const template of this.profile.accountStructure.liabilityAccounts) {
      accounts.push(
        this.createAccountFromTemplate(
          template,
          accountNumCounter++,
          this.random.nextFloat(
            template.typicalBalanceRange!.min,
            template.typicalBalanceRange!.max,
          ),
        ),
      );
    }

    // Equity accounts
    if (this.profile.accountStructure.equityAccounts) {
      for (const template of this.profile.accountStructure.equityAccounts) {
        accounts.push(
          this.createAccountFromTemplate(
            template,
            accountNumCounter++,
            this.random.nextFloat(
              template.typicalBalanceRange!.min,
              template.typicalBalanceRange!.max,
            ),
          ),
        );
      }
    }

    return accounts;
  }

  /**
   * Create account from template
   */
  private createAccountFromTemplate(
    template: AccountTemplate,
    accountNumber: number,
    balance: number,
  ): QuickBooksAccountData {
    return {
      Id: String(this.accountIdCounter++),
      Name: template.name,
      AccountType: template.quickBooksType,
      AccountSubType: template.quickBooksSubtype,
      AcctNum: String(accountNumber),
      Classification: template.classification,
      CurrentBalance: Math.round(balance * 100) / 100, // Round to 2 decimals
      Active: true,
      FullyQualifiedName: template.name,
      CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
      MetaData: {
        CreateTime: "2024-01-01T00:00:00Z",
        LastUpdatedTime: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate customers
   */
  private generateCustomers(count: number): QuickBooksCustomerData[] {
    const customers: QuickBooksCustomerData[] = [];
    const province = this.profile.companyProfile.province;
    const city = this.getCityForProvince(province);

    for (let i = 0; i < count; i++) {
      const isCompany = this.random.next() > 0.3; // 70% companies
      const profile =
        this.profile.customerProfiles?.[
          i % (this.profile.customerProfiles?.length || 1)
        ];

      let displayName: string;
      let companyName: string | undefined;
      let givenName: string | undefined;
      let familyName: string | undefined;

      if (isCompany) {
        displayName = profile?.displayNameTemplate
          ? profile.displayNameTemplate
              .replace("{province}", province)
              .replace("{city}", city)
          : `${city} ${this.pickCompanySuffix()} Inc.`;
        companyName = displayName;
      } else {
        givenName = this.pickFirstName();
        familyName = this.pickLastName();
        displayName = `${givenName} ${familyName}`;
      }

      const balance = profile?.typicalBalanceRange
        ? this.random.nextFloat(
            profile.typicalBalanceRange.min,
            profile.typicalBalanceRange.max,
          )
        : this.random.nextFloat(1000, 20000);

      customers.push({
        Id: String(this.customerIdCounter++),
        DisplayName: displayName,
        CompanyName: companyName,
        GivenName: givenName,
        FamilyName: familyName,
        PrimaryEmailAddr: {
          Address: `${displayName.toLowerCase().replace(/\s+/g, ".")}@example.ca`,
        },
        PrimaryPhone: {
          FreeFormNumber: `(${province === "QC" ? "514" : "416"}) ${this.random.nextInt(100, 999)}-${this.random.nextInt(1000, 9999)}`,
        },
        BillAddr: {
          Line1: `${this.random.nextInt(100, 9999)} ${this.pickStreetName()}`,
          City: profile?.city || city,
          CountrySubDivisionCode: profile?.province || province,
          PostalCode: this.generatePostalCode(province),
          Country: "Canada",
        },
        Active: true,
        Balance: Math.round(balance * 100) / 100,
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: new Date().toISOString(),
        },
      });
    }

    return customers;
  }

  /**
   * Generate vendors
   */
  private generateVendors(count: number): QuickBooksVendorData[] {
    const vendors: QuickBooksVendorData[] = [];
    const province = this.profile.companyProfile.province;
    const city = this.getCityForProvince(province);

    const vendorTypes = [
      "Supplier",
      "Contractor",
      "Service Provider",
      "Distributor",
    ];

    for (let i = 0; i < count; i++) {
      const vendorType = this.random.pick(vendorTypes);
      const displayName = `${city} ${vendorType} Inc.`;

      vendors.push({
        Id: String(this.vendorIdCounter++),
        DisplayName: displayName,
        CompanyName: displayName,
        PrimaryEmailAddr: {
          Address: `${displayName.toLowerCase().replace(/\s+/g, ".")}@example.ca`,
        },
        Active: true,
        Balance: this.random.nextFloat(5000, 50000),
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: new Date().toISOString(),
        },
      });
    }

    return vendors;
  }

  /**
   * Generate invoices
   */
  private generateInvoices(
    annualRevenue: number,
    count: number,
  ): QuickBooksInvoiceData[] {
    const invoices: QuickBooksInvoiceData[] = [];
    const monthlyRevenue = annualRevenue / 12;
    const invoicesPerMonth = Math.max(1, Math.floor(count / 12));

    // Generate invoices for the past 12 months
    for (let month = 0; month < 12; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - month));
      const txnDate = date.toISOString().split("T")[0];
      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      for (let i = 0; i < invoicesPerMonth && invoices.length < count; i++) {
        const invoiceAmount =
          (monthlyRevenue / invoicesPerMonth) * this.random.nextFloat(0.8, 1.2);
        const customerId = String(
          this.customerIdCounter - this.random.nextInt(1, 10),
        ); // Use existing customer

        invoices.push({
          Id: String(this.invoiceIdCounter++),
          DocNumber: `INV-${date.getFullYear()}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
          TxnDate: txnDate,
          DueDate: dueDateStr,
          CustomerRef: { value: customerId, name: `Customer ${customerId}` },
          Line: [
            {
              Id: "1",
              LineNum: 1,
              Amount: Math.round(invoiceAmount * 100) / 100,
              DetailType: "SalesItemLineDetail",
              Description: `Invoice for ${this.getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`,
            },
          ],
          TotalAmt: Math.round(invoiceAmount * 100) / 100,
          Balance: Math.round(invoiceAmount * 100) / 100, // Assume unpaid
          CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
          MetaData: {
            CreateTime: txnDate + "T10:00:00Z",
            LastUpdatedTime: txnDate + "T10:00:00Z",
          },
        });
      }
    }

    return invoices;
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private getCityForProvince(province: string): string {
    const cities: Record<string, string[]> = {
      QC: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil"],
      ON: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton"],
      BC: ["Vancouver", "Victoria", "Surrey", "Burnaby", "Richmond"],
      AB: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert"],
    };
    return this.random.pick(cities[province] || cities.QC);
  }

  private pickStreetName(): string {
    const streets = [
      "Main Street",
      "Rue Principale",
      "Boulevard Saint-Laurent",
      "Avenue du Parc",
      "Rue Sainte-Catherine",
      "King Street",
      "Queen Street",
      "University Avenue",
    ];
    return this.random.pick(streets);
  }

  private pickCompanySuffix(): string {
    const suffixes = [
      "Solutions",
      "Services",
      "Group",
      "Enterprises",
      "Corp",
      "Ltd",
    ];
    return this.random.pick(suffixes);
  }

  private pickFirstName(): string {
    const names = [
      "Jean",
      "Marie",
      "Pierre",
      "Sophie",
      "François",
      "Isabelle",
      "Marc",
      "Julie",
    ];
    return this.random.pick(names);
  }

  private pickLastName(): string {
    const names = [
      "Tremblay",
      "Gagnon",
      "Roy",
      "Côté",
      "Bouchard",
      "Dubois",
      "Morin",
      "Lavoie",
    ];
    return this.random.pick(names);
  }

  private generatePostalCode(province: string): string {
    if (province === "QC") {
      return `H${this.random.nextInt(0, 9)}${this.random.pick(["A", "B", "C", "E", "G", "H", "J", "K"])} ${this.random.nextInt(0, 9)}${this.random.pick(["A", "B", "C", "E", "G", "H", "J", "K"])}${this.random.nextInt(0, 9)}`;
    } else {
      return `${this.random.pick(["K", "L", "M", "N", "P", "R", "S", "T", "V", "X", "Y"])}${this.random.nextInt(0, 9)}${this.random.pick(["A", "B", "C", "E", "G", "H", "J", "K"])} ${this.random.nextInt(0, 9)}${this.random.pick(["A", "B", "C", "E", "G", "H", "J", "K"])}${this.random.nextInt(0, 9)}`;
    }
  }

  private getMonthName(month: number): string {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1] || "January";
  }
}
