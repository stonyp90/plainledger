# Keycloak Admin Client Setup

## Overview

The `plainledger-admin` client must be manually created in Keycloak for the admin console authentication to work. The realm JSON file contains the configuration, but Keycloak only imports realms on first startup, so updates must be applied manually.

## Client Configuration

The client configuration is defined in `keycloak/realms/plainledger-realm.json`. Here are the exact settings:

### Basic Settings

- **Client ID**: `plainledger-admin`
- **Name**: `PlainLedger Admin Console`
- **Description**: `Platform administration console for PlainLedger`
- **Client Protocol**: `openid-connect`
- **Access Type**: `public` (Public Client)
- **Standard Flow Enabled**: `ON`
- **Direct Access Grants Enabled**: `ON`
- **Implicit Flow Enabled**: `OFF`

### Access Settings

- **Root URL**: `https://admin.plainledger.ca`
- **Home URL**: `/`
- **Valid Redirect URIs**:
  - `http://localhost:3001/*`
  - `http://127.0.0.1:3001/*`
  - `https://admin.plainledger.ca/*`
- **Valid Post Logout Redirect URIs**:
  - `http://localhost:3001/*`
  - `https://admin.plainledger.ca/*`
- **Web Origins**:
  - `http://localhost:3001`
  - `http://127.0.0.1:3001`
  - `https://admin.plainledger.ca`
  - `+` (allow all origins)

### Advanced Settings

- **Proof Key for Code Exchange Code Challenge Method**: `S256`

### Client Scopes

**Default Client Scopes:**
- `openid`
- `web-origins`
- `acr`
- `profile`
- `roles`
- `email`

**Optional Client Scopes:**
- `address`
- `phone`
- `offline_access`
- `microprofile-jwt`

## Manual Setup Steps

1. Log into Keycloak Admin Console: `https://auth.plainledger.ca/admin`
2. Select the `plainledger` realm
3. Navigate to **Clients** → **Create client**
4. Configure the client with the settings above
5. Save the client

## Verification

After creating the client, verify it works by:

1. Visiting `https://admin.plainledger.ca`
2. You should be redirected to Keycloak for authentication
3. After login, you should be redirected back to the admin console

## Troubleshooting

If you see "Client not found" error:
- Verify the client ID is exactly `plainledger-admin`
- Check that the client is enabled
- Verify redirect URIs match exactly (including wildcards)
- Ensure Web Origins includes `+` or the exact origin
