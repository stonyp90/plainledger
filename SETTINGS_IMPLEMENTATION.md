# Settings Management Implementation Guide

## Overview

All settings and configurations are now persisted in PostgreSQL with Redis caching for performance. This document explains the implementation and troubleshooting.

## Architecture

### Storage Layers

1. **Database (PostgreSQL)**: Primary storage for all settings
   - `organization_settings` table: Organization-level settings
   - `user_settings` table: User-level settings

2. **Cache (Redis)**: 30-minute TTL for frequently accessed settings
   - Cache-first read strategy
   - Automatic invalidation on updates
   - Graceful fallback if Redis unavailable

3. **Files (S3/MinIO)**: Logo and profile picture files
   - Only URLs stored in database
   - Files stored in S3 bucket

## Database Schema

### Organization Settings (`organization_settings`)
- `organizationId` (UUID, Primary Key)
- `thresholdSettings` (JSONB) - Anomaly detection thresholds
- `brandingSettings` (JSONB) - Logo, colors, custom CSS
- `notificationIntegrations` (JSONB) - Slack/Teams webhooks
- `analyticsConfig` (JSONB) - Power BI configuration
- `generalSettings` (JSONB) - Fiscal year, currency, timezone

### User Settings (`user_settings`)
- `userId` (VARCHAR, Primary Key) - Keycloak user ID
- `notificationPreferences` (JSONB) - Detailed notification settings
- `uiPreferences` (JSONB) - Theme, language, layout
- `featurePreferences` (JSONB) - Feature toggles

## API Endpoints

### Organization Settings
- `GET /api/v1/settings/organization` - Get all org settings
- `PUT /api/v1/settings/organization` - Update org settings
- `PUT /api/v1/settings/organization/thresholds` - Update thresholds
- `PUT /api/v1/settings/organization/branding` - Update branding
- `PUT /api/v1/settings/organization/notifications` - Update integrations

### User Settings
- `GET /api/v1/settings/user` - Get user settings
- `PUT /api/v1/settings/user` - Update user settings
- `PUT /api/v1/settings/user/notifications` - Update notification prefs
- `PUT /api/v1/settings/user/ui` - Update UI preferences

## Local Development Setup

### Prerequisites

1. **Database Tables**: TypeORM will auto-create tables if `synchronize: true`
   ```bash
   # Check if tables exist
   psql -U plainledger -d plainledger -c "\dt accounting.*"
   ```

2. **Redis** (Optional but recommended):
   ```bash
   # Redis is included in docker-compose.yml
   docker-compose up -d redis
   ```

3. **User Profile with Organization**:
   - Users must have `organizationId` set in `user_profiles` table
   - Check: `SELECT id, email, organization_id FROM accounting.user_profiles;`

### Common Issues & Fixes

#### Issue 1: "User is not associated with an organization"
**Cause**: User profile doesn't have `organizationId` set

**Fix**:
```sql
-- Find user's organization
SELECT u.id, u.email, u.organization_id, o.id as org_id, o.name
FROM accounting.user_profiles u
LEFT JOIN accounting.organizations o ON u.organization_id = o.id;

-- Update user's organization if needed
UPDATE accounting.user_profiles 
SET organization_id = '<org-uuid>' 
WHERE id = '<user-id>';
```

#### Issue 2: "Failed to connect to Redis"
**Impact**: Settings still work, but without caching (slower)

**Fix**:
```bash
# Start Redis
docker-compose up -d redis

# Verify Redis is running
docker-compose ps redis
redis-cli ping  # Should return "PONG"
```

#### Issue 3: Tables don't exist
**Fix**:
```bash
# Option 1: Let TypeORM create them (if synchronize: true)
# Restart API server

# Option 2: Create manually
psql -U plainledger -d plainledger -f create-settings-tables.sql
```

#### Issue 4: Authentication token not found
**Cause**: Frontend not sending Bearer token

**Fix**:
- Check browser console for auth errors
- Verify Keycloak is running: `http://localhost:8080`
- Check token in localStorage: `localStorage.getItem('keycloak-token')`
- Ensure user is logged in

## Production Checklist

✅ **Database**:
- [ ] Tables created (`organization_settings`, `user_settings`)
- [ ] Indexes created on `organizationId` and `userId`
- [ ] Backup strategy configured

✅ **Redis**:
- [ ] Redis cluster configured (ElastiCache)
- [ ] Connection string in environment variables
- [ ] Monitoring enabled

✅ **S3**:
- [ ] Upload bucket configured (`plainledger-uploads`)
- [ ] CORS configured for web access
- [ ] CloudFront CDN (optional, for faster delivery)

✅ **API**:
- [ ] Settings endpoints tested
- [ ] Error handling verified
- [ ] Logging configured

✅ **Frontend**:
- [ ] API calls use correct base URL
- [ ] Authentication tokens properly sent
- [ ] Error handling for failed saves

## Testing

### Test Organization Settings
```bash
# Get settings
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/settings/organization

# Update thresholds
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"thresholdSettings": {"varianceWarning": 15}}' \
  http://localhost:3000/api/v1/settings/organization/thresholds
```

### Test User Settings
```bash
# Get user settings
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/settings/user

# Update notification preferences
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notificationPreferences": {"enabled": true}}' \
  http://localhost:3000/api/v1/settings/user/notifications
```

## Migration from localStorage

The frontend components still use localStorage as a fallback for backward compatibility. To migrate existing data:

1. **Threshold Settings**: Already migrated - saves to DB on next save
2. **Notification Preferences**: Already migrated - saves to DB on next save
3. **Other Settings**: Will be saved to DB when user updates them

## Performance

- **Cache Hit**: ~1-5ms response time
- **Cache Miss**: ~10-50ms (DB query + cache write)
- **Cache TTL**: 30 minutes (configurable in `CacheService`)

## Monitoring

Check logs for:
- `CacheService`: Redis connection status
- `SettingsService`: Cache hit/miss rates
- `SettingsController`: API request/response times

## Troubleshooting

### Settings not saving
1. Check API logs: `docker-compose logs api | grep settings`
2. Verify user has `organizationId` in database
3. Check authentication token is valid
4. Verify database connection

### Settings not loading
1. Check cache: `redis-cli GET "org:settings:<org-id>"`
2. Check database: `SELECT * FROM accounting.organization_settings WHERE organization_id = '<org-id>';`
3. Verify API endpoint is accessible

### Redis connection issues
- Settings still work without Redis (just slower)
- Check Redis logs: `docker-compose logs redis`
- Verify REDIS_HOST and REDIS_PORT environment variables

## Next Steps

1. Add database migrations for production
2. Add monitoring/alerting for cache hit rates
3. Consider adding settings versioning/audit trail
4. Add bulk update endpoints for admin users
