import { Account, AccountType } from '@domain/entities/Account';
import { AccountCode } from '@domain/value-objects/AccountCode';

/**
 * Port (Interface) for Account Repository
 */
export interface IAccountRepository {
  /**
   * Find an account by ID
   */
  findById(id: string): Promise<Account | null>;

  /**
   * Find an account by code within an organization
   */
  findByCode(organizationId: string, code: AccountCode): Promise<Account | null>;

  /**
   * Find all accounts for an organization
   */
  findByOrganizationId(
    organizationId: string,
    options?: {
      accountType?: AccountType;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<Account[]>;

  /**
   * Find accounts by type for balance sheet/income statement
   */
  findByTypes(
    organizationId: string,
    types: AccountType[],
  ): Promise<Account[]>;

  /**
   * Save a new account
   */
  save(account: Account): Promise<void>;

  /**
   * Save multiple accounts
   */
  saveMany(accounts: Account[]): Promise<void>;

  /**
   * Update an existing account
   */
  update(account: Account): Promise<void>;

  /**
   * Delete an account
   */
  delete(id: string): Promise<void>;

  /**
   * Check if an account code exists in an organization
   */
  existsByCode(organizationId: string, code: AccountCode): Promise<boolean>;
}
