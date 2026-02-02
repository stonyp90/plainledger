# API Agent Guide

This is a specialized agent guide for the PlainLedger API (NestJS backend). For general project guidance, see the [main agent.md](../../agent.md).

## 🤖 Using Skills and Sub-Agents

**ALWAYS** check for available skills and use sub-agents when appropriate:
- Use skills for specialized tasks (testing, linting, infrastructure)
- Reference this file for API-specific patterns
- Delegate to domain-specific agents when working on complex features
- Update this file when discovering better patterns

## Quick Reference

- **Main Agent Guide:** [`../../agent.md`](../../agent.md)
- **Architecture:** Clean Architecture (Domain → Application → Infrastructure)
- **Framework:** NestJS with TypeScript
- **Database:** PostgreSQL with TypeORM
- **Testing:** Jest (unit), Playwright (E2E)
- **Authentication:** See `keycloak/` directory for Keycloak config
- **ETL/Pipelines:** See `pipelines/README.md` for ETL patterns

**Token Optimization:** Use semantic search for specific patterns, reference code by path.

## Architecture Enforcement

### Class Size Limit: 1000 Lines Maximum

**CRITICAL:** If a class exceeds 1000 lines, it MUST be refactored:
1. Extract related functionality into separate services
2. Use composition over inheritance
3. Apply Single Responsibility Principle
4. Split by domain boundaries (DDD)

**Current violations:**
- `ai.service.ts` (1719 lines) → Needs refactoring
- `datalake-data.service.ts` (1766 lines) → Needs refactoring
- `etl-pipeline.service.ts` (1369 lines) → Needs refactoring

### Domain-Driven Design (DDD)

**Domain Layer:**
- Entities with rich behavior (not anemic)
- Value objects for domain primitives
- Domain services for cross-entity logic
- Aggregates for consistency boundaries

**Application Layer:**
- Use cases orchestrate domain entities
- Ports define interfaces (not implementations)
- DTOs for data transfer (not domain entities)

**Infrastructure Layer:**
- Implements application ports
- Handles technical concerns (DB, HTTP, external APIs)
- No business logic

## API-Specific Patterns

### Clean Architecture Layers

```
apps/api/src/
├── domain/           # Entities, Value Objects, Domain Errors
├── application/      # Use Cases, Ports (interfaces)
└── infrastructure/   # Controllers, Repositories, External Services
```

**Rules:**
- Domain layer has NO dependencies on other layers
- Application layer depends only on domain
- Infrastructure layer implements application ports

## File Naming & Folder Organization

### Naming Conventions

**CRITICAL:** All names must be **provider-agnostic** and **technology-agnostic**.

| Layer | Convention | Good Example | Bad Example |
|-------|------------|--------------|-------------|
| **Ports** | `I{Domain}Service.ts` | `IAccountingProvider.ts` | `IQuickBooksService.ts` |
| **Adapters** | `{provider}.adapter.ts` | `quickbooks.adapter.ts` | `qb-service.ts` |
| **Controllers** | `{resource}.controller.ts` | `datasource-sync.controller.ts` | `quickbooks-sync.controller.ts` |
| **Use Cases** | `{action}-{resource}.use-case.ts` | `sync-datasource.use-case.ts` | `sync-qb.use-case.ts` |
| **Services** | `{domain}.service.ts` | `benchmark.service.ts` | `statscan-benchmark.service.ts` |

### Controller Naming (Provider-Agnostic)

Controllers should use generic, capability-based names:

```
✅ GOOD (Provider-Agnostic)           ❌ BAD (Provider-Specific)
─────────────────────────────────────────────────────────────────
datasource-sync.controller.ts        quickbooks-sync.controller.ts
identity-admin.controller.ts         keycloak-admin.controller.ts
bi-data.controller.ts                powerbi-data.controller.ts
email.controller.ts                  ses-email.controller.ts
storage.controller.ts                s3-storage.controller.ts
```

### Infrastructure Folder Structure

```
infrastructure/
├── adapters/                    # External provider implementations
│   ├── accounting/              # Accounting providers
│   │   ├── quickbooks/          # QuickBooks adapter
│   │   │   ├── quickbooks.adapter.ts
│   │   │   ├── quickbooks.service.ts
│   │   │   └── __tests__/
│   │   ├── xero/                # Xero adapter (future)
│   │   └── sage/                # Sage adapter (future)
│   │
│   ├── bi/                      # Business Intelligence
│   │   └── powerbi/
│   │       ├── powerbi.adapter.ts
│   │       ├── powerbi-datalake.adapter.ts
│   │       └── powerbi-theme.adapter.ts
│   │
│   ├── crm/                     # CRM providers
│   │   └── hubspot/
│   │       └── hubspot.adapter.ts
│   │
│   ├── email/                   # Email providers
│   │   └── ses/
│   │       └── ses.adapter.ts
│   │
│   ├── notifications/           # Push notification providers
│   │   └── novu/
│   │       └── novu.adapter.ts
│   │
│   └── storage/                 # Storage providers
│       └── s3/
│           └── s3-cleanup.adapter.ts
│
├── http/                        # HTTP layer (tech-agnostic names)
│   ├── controllers/
│   │   ├── datasource-sync.controller.ts  # NOT quickbooks-sync
│   │   ├── identity-admin.controller.ts   # NOT keycloak-admin
│   │   └── bi-data.controller.ts          # NOT powerbi-data
│   ├── guards/
│   ├── decorators/
│   └── filters/
│
├── graphql/                     # GraphQL layer
│   ├── resolvers/
│   └── guards/
│
├── persistence/                 # Database implementations
│   ├── postgres/
│   ├── mongodb/
│   └── datalake/
│
├── intelligence/                # AI/ML adapters
│   └── adapters/
│       ├── bedrock.adapter.ts
│       ├── sagemaker.adapter.ts
│       └── api.adapter.ts
│
├── services/                    # Infrastructure services (non-adapter)
│   ├── benchmark-health.service.ts
│   ├── benchmark-refresh.service.ts
│   └── datalake-data.service.ts
│
├── jobs/                        # Scheduled jobs
│   ├── customer-journey.job.ts
│   └── data-retention.job.ts
│
└── cache/                       # Caching
    └── cache.service.ts
```

### When to Create a Folder

**Create a folder when:**
- 2+ related files exist (provider implementations)
- Provider has multiple components (adapter + service + utils)
- Tests are needed (`__tests__/` subdirectory)

**Keep flat when:**
- Single implementation with no tests
- Simple utility files

```
✅ Multiple files → Create folder
adapters/accounting/quickbooks/
├── quickbooks.adapter.ts
├── quickbooks.service.ts
├── quickbooks-environment.util.ts
└── __tests__/
    └── quickbooks.adapter.spec.ts

✅ Single file → Keep flat (but use folder if tests needed)
adapters/email/ses/
└── ses.adapter.ts
```

### Adapter vs Service Naming

**Adapters** - Implement external provider integrations:
- File: `{provider}.adapter.ts`
- Class: `{Provider}Adapter`
- Example: `SESAdapter`, `HubSpotAdapter`, `PowerBIAdapter`

**Services** - Internal application services:
- File: `{domain}.service.ts`
- Class: `{Domain}Service`
- Example: `BenchmarkHealthService`, `CacheService`

```typescript
// Adapter (external integration)
@Injectable()
export class SESAdapter implements IEmailProvider {
  readonly providerName = 'AWS SES';
  // ...
}

// Service (internal)
@Injectable()
export class BenchmarkHealthService {
  // ...
}
```

### Renaming Checklist

When renaming files:
1. ✅ Update class name inside file
2. ✅ Update Logger name: `new Logger(NewClassName.name)`
3. ✅ Update all imports across codebase
4. ✅ Update app.module.ts registrations
5. ✅ Update test file imports
6. ✅ Update interface provider tokens if needed

### Dependency Injection Pattern

```typescript
@Injectable()
export class YourUseCase {
  constructor(
    @Inject("IRepositoryToken")
    private readonly repository: IRepository,
  ) {}
}
```

### Use Case Pattern

```typescript
// application/use-cases/your-use-case.ts
export class YourUseCase {
  async execute(input: InputDto): Promise<OutputDto> {
    // 1. Validate input
    // 2. Load domain entities
    // 3. Execute business logic
    // 4. Persist changes
    // 5. Return DTO (not domain entity)
  }
}
```

### Repository Pattern

**Define interface in application:**
```typescript
// application/ports/outbound/IYourRepository.ts
export interface IYourRepository {
  findById(id: string): Promise<Entity | null>;
  save(entity: Entity): Promise<void>;
}
```

**Implement in infrastructure:**
```typescript
// infrastructure/persistence/postgres/postgres-your.repository.ts
@Injectable()
export class PostgresYourRepository implements IYourRepository {
  // Implementation using TypeORM
}
```

### Controller Pattern

```typescript
@Controller('api/v1/your-resource')
export class YourController {
  constructor(private readonly useCase: YourUseCase) {}

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.useCase.execute({ id });
  }
}
```

### GraphQL Resolver Pattern

```typescript
@Resolver(() => YourType)
export class YourResolver {
  constructor(private readonly useCase: YourUseCase) {}

  @Query(() => YourType)
  @UseGuards(GqlAuthGuard)
  async yourQuery(@Args('id') id: string) {
    return this.useCase.execute({ id });
  }
}
```

## Common Tasks

### Adding a New Feature

1. **Domain Layer:**
   - Create entity in `domain/entities/`
   - Create value objects if needed
   - Define domain errors

2. **Application Layer:**
   - Create use case in `application/use-cases/`
   - Define port interfaces in `application/ports/outbound/`

3. **Infrastructure Layer:**
   - Implement repository in `infrastructure/persistence/postgres/`
   - Create controller in `infrastructure/http/controllers/`
   - Add GraphQL resolver if needed

4. **Wire Up:**
   - Register in `app.module.ts`
   - Add to DI container

5. **Add Swagger Documentation:**
   - Add `@ApiTags` to controller
   - Add `@ApiOperation` to each endpoint
   - Add `@ApiResponse` for all responses
   - Add `@ApiProperty` to DTOs

6. **Add Tests:**
   - Unit tests for use case
   - Integration tests for repository
   - Contract tests for API endpoint
   - E2E tests for user flow (if applicable)

### Database Migrations

**Current:** Manual SQL scripts (`local-dev/init-db.sql`)  
**Recommended:** Use TypeORM migrations for version control

```bash
# Generate migration
npm run migration:generate -- -n YourMigrationName

# Run migrations
npm run migration:run
```

### Testing Patterns

**Unit Tests:**
```typescript
describe('YourUseCase', () => {
  let useCase: YourUseCase;
  let mockRepository: jest.Mocked<IRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new YourUseCase(mockRepository);
  });

  it('should execute correctly', async () => {
    // Test implementation
  });
});
```

**Integration Tests with Testcontainers:**
```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { loadIndustry } from '../../../fixtures/loader';

describe('Integration Tests', () => {
  let postgres: StartedTestContainer;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('pgvector/pgvector:pg16')
      .withDatabase('test')
      .start();
    
    // Use fixtures for test data
    const restaurant = loadIndustry('restaurant');
    // Seed database with fixture data
  });

  afterAll(async () => {
    await postgres.stop();
  });
});
```

**E2E Tests:**
- Use Playwright for browser tests
- Use fixtures for test data (see `e2e/helpers/fixtures.ts`)
- Use testcontainers for infrastructure (see `e2e/testcontainers-setup.ts`)
- Test full user flows

## Architecture Enforcement Rules

### Class Size Limit
**CRITICAL:** Classes MUST be under 1000 lines. If exceeding:
1. **Identify responsibilities** - What does this class do?
2. **Extract services** - Move related logic to separate services
3. **Use composition** - Break into smaller, focused classes
4. **Apply DDD** - Separate by domain boundaries

**Current violations to refactor:**
- `ai.service.ts` (1719 lines) → Split into: AIProviderService, AIGuardrailsService, AICacheService
- `datalake-data.service.ts` (1766 lines) → Split by domain: BronzeService, SilverService, GoldService
- `etl-pipeline.service.ts` (1369 lines) → Split by stage: ExtractService, TransformService, LoadService

### Domain-Driven Design (DDD)

**Domain Layer Rules:**
- **Entities** - Rich domain models with business logic
- **Value Objects** - Immutable, validated domain primitives
- **Domain Services** - Business logic that doesn't belong to entities
- **Aggregates** - Consistency boundaries

**Example:**
```typescript
// Domain Entity (rich model)
export class Organization {
  private constructor(
    private readonly id: OrganizationId,
    private name: string,
    private tenantId: TenantId,
  ) {}

  rename(newName: string): void {
    if (newName.length < 3) {
      throw new DomainError('Organization name must be at least 3 characters');
    }
    this.name = newName;
  }
}

// Value Object
export class TenantId {
  private constructor(private readonly value: string) {}
  
  static create(value: string): TenantId {
    if (!value.match(/^[a-z0-9-]+$/)) {
      throw new DomainError('Invalid tenant ID format');
    }
    return new TenantId(value);
  }
}
```

### Modularity & Decoupling

**When complexity increases:**
1. **Extract modules** - Create feature modules
2. **Use interfaces** - Define contracts, not implementations
3. **Dependency inversion** - Depend on abstractions
4. **Event-driven** - Use events for loose coupling

**Signs to decouple:**
- Class > 1000 lines
- Too many dependencies (>5 constructor params)
- Multiple responsibilities (SRP violation)
- Hard to test
- Circular dependencies

## Provider-Agnostic Architecture

**CRITICAL:** All external integrations MUST be technology and provider agnostic. Use interfaces (ports) with concrete implementations for each provider.

### Why Provider-Agnostic Design?

1. **Vendor flexibility** - Switch providers without code changes
2. **Testing** - Easily mock external dependencies
3. **Multi-provider support** - Support multiple providers simultaneously
4. **Future-proofing** - Add new providers without core changes
5. **Compliance** - Different providers for different regions/requirements

### Pattern: Port + Provider + Factory

```
application/ports/outbound/
├── IAccountingProvider.ts      # Interface (contract)
└── IStorageProvider.ts

infrastructure/integrations/
├── quickbooks/
│   └── quickbooks.provider.ts  # QuickBooks implementation
├── xero/
│   └── xero.provider.ts        # Xero implementation
└── sage/
    └── sage.provider.ts        # Sage implementation

application/services/
└── provider-factory.service.ts # Factory to select provider
```

### Step 1: Define the Port (Interface)

```typescript
// application/ports/outbound/IAccountingProvider.ts

/**
 * IAccountingProvider - Provider-agnostic accounting integration interface
 * 
 * All accounting providers (QuickBooks, Xero, Sage) must implement this interface.
 * Business logic should ONLY depend on this interface, never concrete implementations.
 */
export interface IAccountingProvider {
  readonly providerName: string;
  readonly providerId: string;
  
  // Authentication
  connect(credentials: ProviderCredentials): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  refreshToken(): Promise<void>;
  isConnected(): Promise<boolean>;
  
  // Data fetching (normalized to common schema)
  getAccounts(): Promise<NormalizedAccount[]>;
  getTransactions(dateRange: DateRange): Promise<NormalizedTransaction[]>;
  getInvoices(dateRange: DateRange): Promise<NormalizedInvoice[]>;
  getBills(dateRange: DateRange): Promise<NormalizedBill[]>;
  getContacts(): Promise<NormalizedContact[]>;
  
  // Sync status
  getLastSyncTime(): Promise<Date | null>;
  getSyncStatus(): Promise<SyncStatus>;
}

// Normalized types that all providers must return
export interface NormalizedAccount {
  id: string;
  externalId: string;
  name: string;
  type: AccountType;  // Our standard enum, not provider-specific
  code?: string;
  balance?: number;
  currency: string;
}

export interface NormalizedTransaction {
  id: string;
  externalId: string;
  date: Date;
  amount: number;
  accountId: string;
  description?: string;
  category?: string;
  metadata: Record<string, unknown>;
}
```

### Step 2: Implement Provider-Specific Classes

```typescript
// infrastructure/integrations/quickbooks/quickbooks.provider.ts

@Injectable()
export class QuickBooksProvider implements IAccountingProvider {
  readonly providerName = 'QuickBooks';
  readonly providerId = 'quickbooks';
  
  private client: QuickBooksClient;  // SDK-specific
  
  constructor(private readonly configService: ConfigService) {
    this.client = new QuickBooksClient({
      clientId: configService.get('QUICKBOOKS_CLIENT_ID'),
      clientSecret: configService.get('QUICKBOOKS_CLIENT_SECRET'),
    });
  }
  
  async getAccounts(): Promise<NormalizedAccount[]> {
    // Fetch from QuickBooks API
    const qbAccounts = await this.client.getAccounts();
    
    // Normalize to our standard schema
    return qbAccounts.map(this.normalizeAccount);
  }
  
  private normalizeAccount(qbAccount: QBAccount): NormalizedAccount {
    return {
      id: uuidv4(),  // Our internal ID
      externalId: qbAccount.Id,  // QuickBooks ID
      name: qbAccount.Name,
      type: this.mapAccountType(qbAccount.AccountType),  // Map to our enum
      code: qbAccount.AcctNum,
      balance: qbAccount.CurrentBalance,
      currency: qbAccount.CurrencyRef?.value || 'CAD',
    };
  }
  
  private mapAccountType(qbType: string): AccountType {
    // Map QuickBooks-specific types to our standard enum
    const mapping: Record<string, AccountType> = {
      'Bank': AccountType.ASSET,
      'Accounts Receivable': AccountType.ASSET,
      'Accounts Payable': AccountType.LIABILITY,
      'Income': AccountType.REVENUE,
      'Expense': AccountType.EXPENSE,
      // ... more mappings
    };
    return mapping[qbType] || AccountType.OTHER;
  }
}
```

```typescript
// infrastructure/integrations/xero/xero.provider.ts

@Injectable()
export class XeroProvider implements IAccountingProvider {
  readonly providerName = 'Xero';
  readonly providerId = 'xero';
  
  async getAccounts(): Promise<NormalizedAccount[]> {
    // Xero-specific implementation
    const xeroAccounts = await this.xeroClient.accountingApi.getAccounts();
    return xeroAccounts.body.accounts.map(this.normalizeAccount);
  }
  
  private normalizeAccount(xeroAccount: XeroAccount): NormalizedAccount {
    return {
      id: uuidv4(),
      externalId: xeroAccount.accountID,
      name: xeroAccount.name,
      type: this.mapAccountType(xeroAccount.type),
      code: xeroAccount.code,
      currency: xeroAccount.currencyCode || 'CAD',
    };
  }
}
```

### Step 3: Create Provider Factory

```typescript
// application/services/provider-factory.service.ts

@Injectable()
export class AccountingProviderFactory {
  private readonly providers: Map<string, IAccountingProvider>;
  
  constructor(
    private readonly quickbooksProvider: QuickBooksProvider,
    private readonly xeroProvider: XeroProvider,
    private readonly sageProvider: SageProvider,
  ) {
    this.providers = new Map([
      ['quickbooks', quickbooksProvider],
      ['xero', xeroProvider],
      ['sage', sageProvider],
    ]);
  }
  
  /**
   * Get provider by ID
   */
  getProvider(providerId: string): IAccountingProvider {
    const provider = this.providers.get(providerId.toLowerCase());
    if (!provider) {
      throw new Error(`Unknown accounting provider: ${providerId}`);
    }
    return provider;
  }
  
  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Check if provider is supported
   */
  isSupported(providerId: string): boolean {
    return this.providers.has(providerId.toLowerCase());
  }
}
```

### Step 4: Use in Use Cases (Business Logic)

```typescript
// application/use-cases/sync-accounting-data.use-case.ts

@Injectable()
export class SyncAccountingDataUseCase {
  constructor(
    private readonly providerFactory: AccountingProviderFactory,
    @Inject('IAccountRepository')
    private readonly accountRepository: IAccountRepository,
  ) {}
  
  async execute(input: SyncInput): Promise<SyncResult> {
    // Get the appropriate provider (QuickBooks, Xero, Sage, etc.)
    const provider = this.providerFactory.getProvider(input.providerId);
    
    // Fetch normalized data (same interface regardless of provider)
    const accounts = await provider.getAccounts();
    const transactions = await provider.getTransactions(input.dateRange);
    
    // Business logic works with normalized data
    await this.accountRepository.upsertMany(accounts);
    
    return { accountsSynced: accounts.length };
  }
}
```

### Provider Types to Abstract

| Domain | Port Interface | Implementations |
|--------|---------------|-----------------|
| **Accounting** | `IAccountingProvider` | QuickBooks, Xero, Sage, FreshBooks |
| **Storage** | `IStorageProvider` | AWS S3, MinIO, Azure Blob, GCS |
| **Email** | `IEmailProvider` | AWS SES, SendGrid, Mailgun, SMTP |
| **AI/LLM** | `IAIProvider` | OpenAI, Anthropic, AWS Bedrock, Azure OpenAI |
| **Cache** | `ICacheProvider` | Redis, Memcached, In-memory |
| **Search** | `ISearchProvider` | Elasticsearch, OpenSearch, Algolia |
| **Auth** | `IAuthProvider` | Keycloak, Auth0, Cognito, Okta |
| **Notifications** | `INotificationProvider` | Firebase, OneSignal, Pusher |

### Storage Provider Example

```typescript
// application/ports/outbound/IStorageProvider.ts
export interface IStorageProvider {
  readonly providerName: string;
  
  upload(key: string, data: Buffer, options?: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  listObjects(prefix: string): Promise<ObjectInfo[]>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  exists(key: string): Promise<boolean>;
}

// infrastructure/storage/s3.provider.ts
@Injectable()
export class S3StorageProvider implements IStorageProvider {
  readonly providerName = 'AWS S3';
  private readonly s3Client: S3Client;
  // S3-specific implementation
}

// infrastructure/storage/minio.provider.ts
@Injectable()
export class MinIOStorageProvider implements IStorageProvider {
  readonly providerName = 'MinIO';
  // MinIO-specific implementation (same interface)
}
```

### AI Provider Example

```typescript
// application/ports/outbound/IAIProvider.ts
export interface IAIProvider {
  readonly providerName: string;
  readonly modelId: string;
  
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  classifyText(text: string, categories: string[]): Promise<Classification>;
}

// infrastructure/ai/openai.provider.ts
@Injectable()
export class OpenAIProvider implements IAIProvider {
  readonly providerName = 'OpenAI';
  readonly modelId = 'gpt-4';
}

// infrastructure/ai/anthropic.provider.ts  
@Injectable()
export class AnthropicProvider implements IAIProvider {
  readonly providerName = 'Anthropic';
  readonly modelId = 'claude-3';
}

// infrastructure/ai/bedrock.provider.ts
@Injectable()
export class BedrockProvider implements IAIProvider {
  readonly providerName = 'AWS Bedrock';
  readonly modelId = 'anthropic.claude-3-sonnet';
}
```

### Registration in Module

```typescript
// app.module.ts

// Register all providers
providers: [
  QuickBooksProvider,
  XeroProvider,
  SageProvider,
  AccountingProviderFactory,
  
  // Register interface binding for DI
  {
    provide: 'IAccountingProvider',
    useFactory: (factory: AccountingProviderFactory, config: ConfigService) => {
      const defaultProvider = config.get('DEFAULT_ACCOUNTING_PROVIDER') || 'quickbooks';
      return factory.getProvider(defaultProvider);
    },
    inject: [AccountingProviderFactory, ConfigService],
  },
],
```

### Testing Provider Implementations

```typescript
// Create mock provider for tests
export class MockAccountingProvider implements IAccountingProvider {
  readonly providerName = 'Mock';
  readonly providerId = 'mock';
  
  async getAccounts(): Promise<NormalizedAccount[]> {
    return [
      { id: '1', externalId: 'ext-1', name: 'Cash', type: AccountType.ASSET, currency: 'CAD' },
    ];
  }
  // ... implement all methods with test data
}

// Use in tests
describe('SyncAccountingDataUseCase', () => {
  it('should sync accounts from any provider', async () => {
    const mockProvider = new MockAccountingProvider();
    const useCase = new SyncAccountingDataUseCase(
      { getProvider: () => mockProvider } as AccountingProviderFactory,
      mockAccountRepository,
    );
    
    const result = await useCase.execute({ providerId: 'mock', dateRange: {} });
    expect(result.accountsSynced).toBe(1);
  });
});
```

### Checklist for New Providers

When adding a new external integration:

- [ ] Define interface in `application/ports/outbound/I{Domain}Provider.ts`
- [ ] Create normalized types that all providers return
- [ ] Implement provider in `infrastructure/integrations/{provider}/`
- [ ] Add type mapping functions (provider types → our types)
- [ ] Register in factory service
- [ ] Add to module providers
- [ ] Write unit tests with mock provider
- [ ] Write integration tests with real provider (sandbox/test account)
- [ ] Document provider-specific configuration

## API Contract Testing

**CRITICAL:** All API endpoints MUST have contract tests.

### OpenAPI/Swagger Requirements

**Every controller MUST:**
```typescript
@Controller('api/v1/organizations')
@ApiTags('organizations')
export class OrganizationController {
  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: OrganizationDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganization(@Param('id') id: string) {
    // Implementation
  }
}
```

**DTOs MUST have Swagger decorators:**
```typescript
export class OrganizationDto {
  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  id: string;

  @ApiProperty({ description: 'Organization name', example: 'Acme Corp' })
  name: string;
}
```

### Contract Testing Setup

**Required:**
1. **Generate OpenAPI spec** - Automatically from decorators (see `swagger.config.ts`)
2. **Contract tests** - Validate API contracts don't break (see `test/contract/api.contract.spec.ts`)
3. **Version contracts** - Track API versions

**Run contract tests:**
```bash
npm run test:contract
```

**Export OpenAPI spec:**
- Automatically exported to `openapi-spec.json` in non-production
- Available at `/api/docs` endpoint
- Used for contract validation

**Implementation:**
- Contract tests compare current spec with stored contract
- Detects breaking changes (removed endpoints, changed schemas)
- Validates all endpoints have Swagger decorators
- Saves current spec as new contract on first run

**Swagger Decorator Requirements:**
```typescript
@Controller('organizations')
@ApiTags('organizations')  // Required
@ApiBearerAuth()           // If auth required
export class OrganizationController {
  @Get(':id')
  @ApiOperation({ summary: 'Get organization' })  // Required
  @ApiResponse({ status: 200, type: OrganizationDto })  // Required
  @ApiResponse({ status: 404 })  // Required for error cases
  async getOrganization(@Param('id') id: string) {
    // Implementation
  }
}
```

## Testing Requirements

### Test Coverage by Layer

**Domain Layer:**
- ✅ Unit tests for all entities
- ✅ Value object validation tests
- ✅ Domain service tests
- ✅ Domain error tests

**Application Layer:**
- ✅ Use case tests (business logic)
- ✅ Port interface tests
- ✅ Service tests

**Infrastructure Layer:**
- ✅ Repository integration tests
- ✅ Controller contract tests
- ✅ External service mock tests

### Important Features to Test

**CRITICAL paths (must have tests):**
1. **Authentication** - Login, token refresh, logout
2. **Authorization** - Role-based access, feature gates
3. **Data Sync** - ETL pipeline, data transformation
4. **Financial Calculations** - Balance sheets, reports, KPIs
5. **Multi-tenancy** - Tenant isolation, data segregation
6. **API Contracts** - Request/response validation

**Test Types:**
- **Unit** - Fast, isolated, mock dependencies
- **Integration** - Test layers together, use testcontainers
- **Contract** - Validate API contracts
- **E2E** - Full user flows (Playwright)

## Self-Improvement

**Update this file when:**
- Discovering better patterns
- Fixing recurring issues
- Adding new architectural patterns
- Improving code quality
- Refactoring large classes

**Pattern to Follow:**
1. Implement feature
2. Document pattern if reusable
3. Update this agent.md
4. Share learnings with main agent.md if applicable
5. **Check class size** - Refactor if > 1000 lines
6. **Add contract tests** - For all new endpoints

---

**Last Updated:** February 2026  
**Related:** [`../../agent.md`](../../agent.md)
