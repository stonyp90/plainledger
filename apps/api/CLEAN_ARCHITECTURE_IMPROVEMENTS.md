# Clean Architecture Improvements

## Overview
This document outlines recommended improvements to enhance clean architecture principles in the PlainLedger API.

## Current Architecture Assessment

### ✅ Good Practices Already in Place
- Domain layer is clean (no NestJS dependencies)
- Use cases use dependency injection with interfaces
- Repository pattern implemented correctly
- Domain entities are well-structured with value objects
- Proper separation of concerns in most areas

### 🔧 Areas for Improvement

## 1. **Move Notifications to Infrastructure Layer**

**Current:** `src/notifications/` at root level  
**Recommended:** `src/infrastructure/notifications/`

**Rationale:** Notifications deal with external services (Novu) and should be in the infrastructure layer.

**Impact:** Low - mostly organizational

**Files to move:**
- `src/notifications/notification.service.ts`
- `src/notifications/novu.service.ts`
- `src/notifications/subscription-reminder.service.ts`

**Update imports in:**
- `src/app.module.ts`
- `src/infrastructure/http/controllers/onboarding.controller.ts`
- `src/infrastructure/http/controllers/contact.controller.ts`

---

## 2. **Extract Business Logic from GraphQL Resolver**

**Current:** `OrganizationResolver.createOrganization()` generates tenant ID directly  
**Recommended:** Move tenant ID generation to use case or domain service

**Location:** `src/infrastructure/graphql/resolvers/organization.resolver.ts:155`

**Current Code:**
```typescript
const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

**Recommended:** 
- Create a `GenerateTenantIdUseCase` or
- Add tenant ID generation to `CreateOrganizationUseCase` as optional parameter
- Or create a domain service `TenantIdGenerator`

**Impact:** Medium - improves testability and reusability

---

## 3. **Create Interfaces/Ports for Infrastructure Services**

**Current:** Services like `AIService`, `DatalakeDataService` are directly injected without interfaces

**Recommended:** Create ports in `application/ports/outbound/`

**Services needing interfaces:**
- `AIService` → `IAIService`
- `DatalakeDataService` → `IDatalakeDataService`
- `PowerBIDatalakeService` → `IPowerBIDatalakeService`
- `KeycloakAdminService` → `IKeycloakAdminService`

**Example:**
```typescript
// application/ports/outbound/IAIService.ts
export interface IAIService {
  generateResponse(prompt: string, options?: AIGenerationOptions): Promise<AIResponse>;
  getAvailableProviders(): AIProviderConfig[];
}

// infrastructure/ai/ai.service.ts
@Injectable()
export class AIService implements IAIService {
  // implementation
}
```

**Impact:** High - improves testability and allows swapping implementations

---

## 4. **Centralize Error Handling**

**Current:** Each controller has repetitive error handling

**Recommended:** Create a global exception filter

**Example:**
```typescript
// infrastructure/http/filters/domain-exception.filter.ts
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    if (exception instanceof EntityNotFoundError) {
      return response.status(404).json({ message: exception.message });
    }
    if (exception instanceof DuplicateEntityError) {
      return response.status(409).json({ message: exception.message });
    }
    return response.status(400).json({ message: exception.message });
  }
}
```

**Impact:** Medium - reduces code duplication

---

## 5. **Move ETL Services to Domain Layer**

**Current:** `ETLPipelineService` and `DatalakeTransformerService` are in application layer  
**Recommended:** Move to `domain/services/` as they contain pure transformation logic

**Rationale:** These services don't depend on infrastructure and contain domain transformation rules.

**Files:**
- `src/application/services/etl-pipeline.service.ts` → `src/domain/services/etl-pipeline.service.ts`
- `src/application/services/datalake-transformer.service.ts` → `src/domain/services/datalake-transformer.service.ts`

**Impact:** Medium - better aligns with clean architecture principles

---

## 6. **Create Use Case for AI Chat**

**Current:** `AIController` contains business logic (rate limiting, validation)  
**Recommended:** Create `GenerateAIResponseUseCase`

**Benefits:**
- Separates business logic from HTTP concerns
- Makes logic reusable (could be called from GraphQL, WebSocket, etc.)
- Easier to test

**Example:**
```typescript
// application/use-cases/generate-ai-response.use-case.ts
@Injectable()
export class GenerateAIResponseUseCase {
  constructor(
    @Inject("IAIService") private readonly aiService: IAIService,
    @Inject("IRateLimitService") private readonly rateLimitService: IRateLimitService,
  ) {}

  async execute(request: GenerateAIResponseRequest): Promise<GenerateAIResponseResponse> {
    // Rate limiting logic
    // Validation logic
    // Call AI service
    // Return response
  }
}
```

**Impact:** High - improves separation of concerns

---

## 7. **Add Input/Output Ports for Use Cases**

**Current:** Some use cases have inline interfaces  
**Recommended:** Create separate input/output DTOs in `application/ports/inbound/` and `application/ports/outbound/`

**Example Structure:**
```
application/
  ports/
    inbound/
      CreateOrganizationRequest.ts
      GetOrganizationRequest.ts
      GenerateBalanceSheetRequest.ts
    outbound/
      CreateOrganizationResponse.ts
      GetOrganizationResponse.ts
      GenerateBalanceSheetResponse.ts
      IOrganizationRepository.ts
      IAccountRepository.ts
      IAIService.ts
```

**Impact:** Low-Medium - improves clarity and maintainability

---

## 8. **Create Domain Services for Complex Business Logic**

**Current:** Some business logic might be scattered  
**Recommended:** Create domain services for complex operations

**Potential Domain Services:**
- `TenantIdGenerator` - Generate tenant IDs
- `AccountHierarchyService` - Manage account hierarchies
- `FinancialCalculationService` - Complex financial calculations

**Location:** `src/domain/services/`

**Impact:** Medium - improves domain model encapsulation

---

## 9. **Extract Rate Limiting to Application Service**

**Current:** Rate limiting logic in `AIController`  
**Recommended:** Create `RateLimitService` in application layer

**Example:**
```typescript
// application/services/rate-limit.service.ts
@Injectable()
export class RateLimitService {
  async checkRateLimit(tenantId: string, action: string): Promise<boolean> {
    // Rate limiting logic
  }
}
```

**Impact:** Medium - makes rate limiting reusable

---

## 10. **Consider Domain Events**

**Current:** Synchronous operations  
**Recommended:** Consider domain events for side effects

**Example:**
```typescript
// domain/events/organization-created.event.ts
export class OrganizationCreatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly tenantId: string,
    public readonly createdAt: Date,
  ) {}
}

// In use case
const organization = Organization.create(...);
await this.repository.save(organization);
this.eventBus.publish(new OrganizationCreatedEvent(...));
```

**Impact:** High - enables better decoupling and async processing

---

## Priority Recommendations

### High Priority (Immediate Impact)
1. ✅ Create interfaces for infrastructure services (#3)
2. ✅ Create use case for AI chat (#6)
3. ✅ Centralize error handling (#4)

### Medium Priority (Improve Architecture)
4. ✅ Move notifications to infrastructure (#1)
5. ✅ Extract business logic from resolver (#2)
6. ✅ Move ETL services to domain (#5)
7. ✅ Extract rate limiting service (#9)

### Low Priority (Nice to Have)
8. ✅ Add input/output ports (#7)
9. ✅ Create domain services (#8)
10. ✅ Consider domain events (#10)

---

## Implementation Notes

- All changes should maintain backward compatibility
- Update tests accordingly
- Update documentation
- Consider creating a migration guide for team members
