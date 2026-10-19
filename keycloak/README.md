# Keycloak realm and managed user profile

`user-profile.json` is the reviewed profile configuration for PlainLedger's
Keycloak 26.8.1 deployment. It preserves the upstream username, email, first-name
and last-name validators and their normal account-editing permissions.
Internationalization and Keycloak's built-in locale handling remain enabled.

The additional fields are optional, single-valued and bounded to 2,048
characters. Only the trusted administration context can view or edit them:

- Tenant assignment: `organization`, `organizationName`.
- Account metadata: `industry`, `province`, `demoMode`, `plan`, `accountStatus`.
- Provisioning metadata: `registrationSource`, `registeredAt`, `invitedBy`, `invitedAt`.

Unknown unmanaged attributes remain disabled. The configuration does not add
realm-management roles to the API service account. Its existing `manage-users`
permission authorizes application user updates; changing the profile schema
itself requires a separately authorized operator with `manage-realm`.

## Native account-console scopes

The realm import declares both Keycloak-native `account` and `account-console`
clients. Keycloak 26.8.1 otherwise creates these clients before importing the
explicit `clientScopes` list, leaving the console without its role mappers.
A user can then sign in successfully while the console's token has audience
`account` but no `resource_access.account` roles, causing its profile request
to return HTTP 403.

Both native clients receive only `openid`, `profile`, `email`, `roles`,
`web-origins` and `acr`. They keep `fullScopeAllowed: false`, relative account
redirects, and disabled direct/password, implicit and service-account flows.
The console requires PKCE S256 and retains the upstream `manage-account` and
`view-groups` role scope. Application organization and API-audience scopes
are not assigned to these clients.

The imported `account` role definitions preserve the upstream composites:
`manage-account` includes `manage-account-links`, and `manage-consent` includes
`view-consent`. Its `defaultRoles` list preserves only `view-profile` and
`manage-account`. Keycloak 26.8.1 converts this client list into the existing
realm default-role composite during import; the application `viewer` default
is unchanged. The API service account keeps its five reviewed management roles.

After changing the reviewed realm source, regenerate and check it:

```bash
python3 keycloak/prepare-production-realm.py
python3 keycloak/prepare-production-realm.py --check
python3 keycloak/test_production_realm.py
node --test e2e/prepare-real-stack.test.cjs
```

## Keep the import files synchronized

After a reviewed change to `user-profile.json`, run:

```bash
python3 keycloak/prepare-production-realm.py --sync-profile
python3 keycloak/prepare-production-realm.py --check
python3 keycloak/test_production_realm.py
node --test e2e/prepare-real-stack.test.cjs
```

The explicit sync command embeds the same profile component in the development
import and regenerates the production import. File replacement is atomic. The
check rejects a development profile that differs from the reviewed JSON, as
well as stale generated production output. Production continues to exclude
human/demo accounts and fixed credentials. The disposable E2E generator copies
the exact production profile component and production API machine permissions.

Keycloak user-update requests containing `attributes` must preserve the user's
existing username, email, first name and last name. Keycloak validates the whole
submitted profile in that case. The API adapter reads these fields before
merging custom attributes; it does not resend credentials, verification flags,
required actions or roles during an attribute update.

## Apply to an existing realm

Startup `--import-realm` initializes a new realm; it does not update an existing
realm. Updating these repository files alone does not change the configuration
of an already running identity service. Do not delete or recreate a realm or its
users to apply this profile change.

For a confirmed existing `plainledger` realm, use an already authenticated
Keycloak Admin CLI session belonging to an authorized operator. The endpoint is
`GET`/`PUT /admin/realms/plainledger/users/profile`. Save and review the current
configuration before replacement, preserving any additional reviewed custom
fields or validators needed by that deployment. Once the target configuration
has been reviewed, the exact update for the repository's profile is:

```bash
umask 077
kcadm.sh get users/profile -r plainledger > user-profile-before.json
kcadm.sh update users/profile -r plainledger -f keycloak/user-profile.json
kcadm.sh get users/profile -r plainledger > user-profile-after.json
```

Confirm the saved result retains the built-in validators, the managed field
permissions, and the disabled unmanaged-attribute policy. Use the operator's
existing authorization for this one schema update; do not grant `manage-realm`
to the application machine. The command changes profile configuration and does
not migrate application memberships or modify user identities by itself.

The automated import and browser checks exercise a **fresh disposable realm**.
They verify actual API persistence of tenant metadata and rejection of an
ordinary account's attempted tenant edit. They do not certify that an existing
production realm received this configuration update. That requires verification
against the separately configured production identity service.

### Attach scopes to existing native account clients

An existing realm needs the reviewed default scopes attached to its **existing**
`account` and `account-console` clients. Importing the new JSON at startup does
not perform this migration. Do not recreate either client or the realm, replace
user identities, or expand the API machine's roles.

Use the existing authenticated operator session with permission to manage the
clients and client scopes. First resolve the two client UUIDs and the six scope
UUIDs, then save and review each client's current representation and assigned
scopes:

```bash
kcadm.sh get clients -r plainledger -q clientId=account --fields id,clientId
kcadm.sh get clients -r plainledger -q clientId=account-console --fields id,clientId
kcadm.sh get client-scopes -r plainledger --fields id,name
kcadm.sh get clients/ACCOUNT_CLIENT_UUID -r plainledger
kcadm.sh get clients/ACCOUNT_CLIENT_UUID/default-client-scopes -r plainledger
```

Replace `ACCOUNT_CLIENT_UUID` and `SCOPE_UUID` below with the verified IDs from
that realm. For each missing assignment among `openid`, `profile`, `email`,
`roles`, `web-origins` and `acr`, attach the scope to each of the two existing
clients using this idempotent operation:

```bash
kcadm.sh update clients/ACCOUNT_CLIENT_UUID/default-client-scopes/SCOPE_UUID \
  -r plainledger --no-merge
kcadm.sh get clients/ACCOUNT_CLIENT_UUID/default-client-scopes -r plainledger
```

The underlying endpoint is
`PUT /admin/realms/plainledger/clients/{clientId}/default-client-scopes/{scopeId}`.
Leave the native restricted role mappings and existing reviewed scopes in place;
check any unexpected pre-existing scope separately before changing it. Confirm
`fullScopeAllowed` remains false, the console still requires PKCE S256, and its
role scope contains only the native `manage-account` and `view-groups` mappings.
No `organization` or `plainledger-api-audience` scope is needed here.

Then obtain a new console token through normal browser sign-in and verify the
correct user's account profile loads with HTTP 200 in both EN and FR. It should
carry the `account` audience and the user's scoped own-account role claim.
Never record the raw access or refresh token as verification evidence. The
fresh-realm CI checks do not establish that this migration was applied to an
existing production service.

## Pinned implementation references

The base profile follows Keycloak's
[26.8.1 default profile](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/resources/org/keycloak/userprofile/config/keycloak-default-user-profile.json).
The
[admin user update](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/resources/admin/UserResource.java)
validates submitted profile fields. The
[attribute implementation](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/userprofile/DefaultAttributes.java)
keeps unmanaged attributes disabled when no enabling policy is configured.
The
[profile resource](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/resources/admin/UserProfileResource.java)
requires realm-management authorization for schema changes.

Native account client and role defaults follow
[RealmManager](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/managers/RealmManager.java)
and [AccountRoles](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/AccountRoles.java).
The import ordering and supported client-default-role conversion are in
[DefaultExportImportManager](https://github.com/keycloak/keycloak/blob/26.8.1/model/storage-private/src/main/java/org/keycloak/storage/datastore/DefaultExportImportManager.java).
The existing-client scope assignment endpoint is implemented by
[ClientResource](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/resources/admin/ClientResource.java).
