/**
 * HubSpot Custom Properties Setup Script
 * 
 * Run this once to create all custom properties needed for PlainLedger CRM integration.
 * 
 * Usage: npx ts-node scripts/setup-hubspot-properties.ts
 */

import { Client } from '@hubspot/api-client';

// Get token from environment variable (don't hardcode in production)
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error('Error: HUBSPOT_ACCESS_TOKEN environment variable is required');
  console.error('Set it in your .env file or pass it directly:');
  console.error('  HUBSPOT_ACCESS_TOKEN=pat-xxx npx ts-node scripts/setup-hubspot-properties.ts');
  process.exit(1);
}

const hubspot = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

// Contact properties to create
const contactProperties = [
  {
    name: 'plainledger_id',
    label: 'PlainLedger User ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Unique user ID from PlainLedger',
  },
  {
    name: 'plainledger_org_id',
    label: 'PlainLedger Organization ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Organization ID from PlainLedger',
  },
  {
    name: 'plainledger_tier',
    label: 'PlainLedger Subscription Tier',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Current subscription tier',
    options: [
      { label: 'Free', value: 'free', displayOrder: 1 },
      { label: 'Pro', value: 'pro', displayOrder: 2 },
      { label: 'Premium', value: 'premium', displayOrder: 3 },
    ],
  },
  {
    name: 'plainledger_signup_date',
    label: 'PlainLedger Signup Date',
    type: 'date',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'When the user signed up for PlainLedger',
  },
  {
    name: 'plainledger_last_activity',
    label: 'PlainLedger Last Activity',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Last activity timestamp in PlainLedger',
  },
  {
    name: 'plainledger_connected_sources',
    label: 'PlainLedger Connected Sources',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Number of connected data sources (QuickBooks, Xero, etc.)',
  },
  {
    name: 'plainledger_total_reports',
    label: 'PlainLedger Total Reports',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Total number of reports generated',
  },
];

// Deal properties to create
const dealProperties = [
  {
    name: 'plainledger_tier',
    label: 'PlainLedger Tier',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    description: 'Subscription tier for this deal',
    options: [
      { label: 'Pro', value: 'pro', displayOrder: 1 },
      { label: 'Premium', value: 'premium', displayOrder: 2 },
    ],
  },
  {
    name: 'plainledger_billing_cycle',
    label: 'PlainLedger Billing Cycle',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    description: 'Billing cycle for subscription',
    options: [
      { label: 'Monthly', value: 'monthly', displayOrder: 1 },
      { label: 'Yearly', value: 'yearly', displayOrder: 2 },
    ],
  },
];

async function createProperty(
  objectType: 'contacts' | 'deals',
  property: any,
): Promise<boolean> {
  try {
    await hubspot.crm.properties.coreApi.create(objectType, property);
    console.log(`✓ Created ${objectType} property: ${property.name}`);
    return true;
  } catch (error: any) {
    if (error.code === 409 || error.body?.message?.includes('already exists')) {
      console.log(`○ Property already exists: ${property.name}`);
      return true;
    }
    console.error(`✗ Failed to create ${property.name}:`, error.body?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('HubSpot Custom Properties Setup');
  console.log('='.repeat(60));
  console.log('');

  let successCount = 0;
  let failCount = 0;

  // Create contact properties
  console.log('Creating Contact Properties...');
  console.log('-'.repeat(40));
  for (const prop of contactProperties) {
    const success = await createProperty('contacts', prop);
    if (success) successCount++;
    else failCount++;
  }

  console.log('');

  // Create deal properties
  console.log('Creating Deal Properties...');
  console.log('-'.repeat(40));
  for (const prop of dealProperties) {
    const success = await createProperty('deals', prop);
    if (success) successCount++;
    else failCount++;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Setup Complete: ${successCount} succeeded, ${failCount} failed`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
