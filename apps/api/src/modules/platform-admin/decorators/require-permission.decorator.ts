import { SetMetadata } from '@nestjs/common';

export const PLATFORM_PERMISSIONS_KEY = 'platform_permissions';

/**
 * Decorator to require specific platform admin permissions
 * 
 * @example
 * @RequirePermission('org:view')
 * @RequirePermission('org:edit', 'org:delete') // Requires ANY of these
 * @RequirePermission(['org:edit', 'org:delete']) // Requires ALL of these
 */
export const RequirePermission = (...permissions: (string | string[])[]) => {
  // Flatten and normalize permissions
  const normalizedPermissions = permissions.map(p => 
    Array.isArray(p) ? { type: 'all', permissions: p } : { type: 'any', permissions: [p] }
  );
  
  return SetMetadata(PLATFORM_PERMISSIONS_KEY, normalizedPermissions);
};

/**
 * Decorator to bypass permission check (for public admin endpoints like health)
 */
export const PUBLIC_ADMIN_KEY = 'public_admin';
export const PublicAdmin = () => SetMetadata(PUBLIC_ADMIN_KEY, true);
