-- Fail before API startup if the host has no migrated/restored application schema.
-- This does not seed users, modify tables, or turn on TypeORM synchronize.
DO $schema_check$
DECLARE
  required_relation text;
BEGIN
  FOREACH required_relation IN ARRAY ARRAY[
    'accounting.organizations',
    'accounting.accounts',
    'accounting.journal_entries',
    'accounting.journal_entry_lines',
    'accounting.user_profiles',
    'accounting.organization_settings',
    'accounting.user_settings',
    'reporting.saved_reports',
    'integration.shared_documents',
    'tenant.subscription_plans',
    'tenant.entitlements',
    'tenant.roles',
    'tenant.permissions'
  ] LOOP
    IF to_regclass(required_relation) IS NULL THEN
      RAISE EXCEPTION 'Application schema is not ready: missing %. Run a reviewed migration or restore before deployment.', required_relation;
    END IF;
  END LOOP;
END
$schema_check$;
