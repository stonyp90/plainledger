import { Injectable, Logger } from "@nestjs/common";
import {
  IAccountingProvider,
  ProviderType,
} from "@application/ports/outbound/IAccountingProvider";
import { QuickBooksProvider } from "@infrastructure/adapters/accounting/quickbooks/quickbooks.provider";

/**
 * Provider Factory Service
 *
 * Creates and returns the appropriate accounting provider implementation
 * based on the provider type. Implements the Factory pattern for clean
 * multi-provider support.
 */
@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);
  private readonly providers = new Map<ProviderType, IAccountingProvider>();

  constructor(
    private readonly quickBooksProvider: QuickBooksProvider,
    // Future providers will be injected here:
    // private readonly xeroProvider: XeroProvider,
    // private readonly sageProvider: SageProvider,
  ) {
    // Register QuickBooks provider
    this.providers.set(ProviderType.QUICKBOOKS, quickBooksProvider);

    this.logger.log(
      `ProviderFactory initialized with ${this.providers.size} provider(s)`,
    );
  }

  /**
   * Get provider instance by type
   * @param type Provider type
   * @returns Provider implementation
   * @throws Error if provider type is not supported
   */
  getProvider(type: ProviderType): IAccountingProvider {
    const provider = this.providers.get(type);

    if (!provider) {
      const supportedTypes = Array.from(this.providers.keys()).join(", ");
      throw new Error(
        `Provider type ${type} is not supported. Supported types: ${supportedTypes}`,
      );
    }

    return provider;
  }

  /**
   * Get provider instance by type string
   * Useful for API endpoints that receive provider type as string
   */
  getProviderByString(type: string): IAccountingProvider {
    const providerType = type.toUpperCase() as ProviderType;

    if (!Object.values(ProviderType).includes(providerType)) {
      throw new Error(
        `Invalid provider type: ${type}. Valid types: ${Object.values(ProviderType).join(", ")}`,
      );
    }

    return this.getProvider(providerType);
  }

  /**
   * Get all supported provider types
   */
  getSupportedProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider type is supported
   */
  isProviderSupported(type: ProviderType): boolean {
    return this.providers.has(type);
  }
}
