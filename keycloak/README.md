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
