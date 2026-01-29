/**
 * MongoDB Module Exports
 *
 * Usage:
 * 1. Import MongoDBModule in app.module.ts
 * 2. Inject AnalyticsRepository or AuditRepository where needed
 *
 * Example:
 * ```typescript
 * import { AnalyticsRepository, AuditRepository } from './infrastructure/persistence/mongodb';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private analytics: AnalyticsRepository,
 *     private audit: AuditRepository,
 *   ) {}
 *
 *   async doSomething() {
 *     await this.analytics.track({ eventName: 'something_done', userId: '123' });
 *     await this.audit.log({ action: 'settings.updated', actorId: '123', resourceType: 'settings' });
 *   }
 * }
 * ```
 */

export { MongoDBModule, MongoDBService } from './mongodb.module';
export type {
  AnalyticsEvent,
  AuditLog,
  CustomerJourneyEvent,
} from './mongodb.module';

export { AnalyticsRepository } from './analytics.repository';
export type {
  TrackEventInput,
  EventQuery,
  EventCount,
  FunnelStep,
} from './analytics.repository';

export { AuditRepository } from './audit.repository';
export type {
  AuditAction,
  ResourceType,
  AuditInput,
  AuditQuery,
} from './audit.repository';
