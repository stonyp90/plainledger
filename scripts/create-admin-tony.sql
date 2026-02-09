-- SQL script to create admin user for tony@plainledger.ca
-- Keycloak User ID: 6840364a-e6d1-4561-ba42-e9971e041443
-- Run this via AWS RDS Query Editor or via ECS task

-- Step 1: Ensure super-admin group exists
INSERT INTO platform.groups (id, name, description, tier_level, is_system, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'super-admin',
  'Super Administrator with all permissions',
  10,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create admin user (replace KEYCLOAK_ID with actual Keycloak user ID)
INSERT INTO platform.admin_users (id, keycloak_id, email, display_name, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '6840364a-e6d1-4561-ba42-e9971e041443',  -- Keycloak User ID for tony@plainledger.ca
  'tony@plainledger.ca',
  'Tony Admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (keycloak_id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  is_active = true,
  updated_at = NOW();

-- Step 3: Assign user to super-admin group
INSERT INTO platform.user_groups (user_id, group_id)
SELECT 
  au.id,
  g.id
FROM platform.admin_users au
CROSS JOIN platform.groups g
WHERE au.keycloak_id = '6840364a-e6d1-4561-ba42-e9971e041443'
  AND g.name = 'super-admin'
ON CONFLICT DO NOTHING;

-- Verify the admin user was created
SELECT 
  au.id,
  au.email,
  au.display_name,
  au.is_active,
  g.name as group_name,
  g.tier_level
FROM platform.admin_users au
LEFT JOIN platform.user_groups ug ON ug.user_id = au.id
LEFT JOIN platform.groups g ON g.id = ug.group_id
WHERE au.keycloak_id = '6840364a-e6d1-4561-ba42-e9971e041443';
