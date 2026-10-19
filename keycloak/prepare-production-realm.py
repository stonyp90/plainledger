#!/usr/bin/env python3
"""Derive a secret-free production import from the shared development realm.

Run this from any directory. --check verifies the committed output is current.
Runtime URL/secret substitutions are resolved by Keycloak's realm importer.
"""
import argparse
import copy
import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'realms/plainledger-realm.json'
OUTPUT = ROOT / 'realms/plainledger-production-realm.json'
PROFILE = ROOT / 'user-profile.json'
PROFILE_PROVIDER = 'org.keycloak.userprofile.UserProfileProvider'
ACCOUNT_CLIENT_IDS = {'account', 'account-console'}
ACCOUNT_SCOPES = {'openid', 'profile', 'email', 'roles', 'web-origins', 'acr'}


def profile_components():
    return [{
        'name': 'declarative-user-profile',
        'providerId': 'declarative-user-profile',
        'config': {'kc.user.profile.config': [json.dumps(json.loads(PROFILE.read_text()), separators=(',', ':'))]},
    }]


def write_atomic(target, text):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', dir=target.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.chmod(target.stat().st_mode & 0o777 if target.exists() else 0o644)
        os.replace(temporary, target)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def validate_account_import(realm):
    # Explicit clients avoid Keycloak creating them before this import's scopes.
    # Keep their native own-account boundary; application audiences do not belong here.
    clients = [client for client in realm['clients'] if client['clientId'] in ACCOUNT_CLIENT_IDS]
    if len(clients) != 2 or {client['clientId'] for client in clients} != ACCOUNT_CLIENT_IDS:
        raise ValueError('Both reviewed native account clients are required')
    base = '/realms/' + realm['realm'] + '/account/'
    for client in clients:
        expected = {
            'enabled': True, 'publicClient': True, 'standardFlowEnabled': True,
            'fullScopeAllowed': False, 'directAccessGrantsEnabled': False,
            'implicitFlowEnabled': False, 'serviceAccountsEnabled': False,
            'rootUrl': '${authBaseUrl}', 'baseUrl': base,
            'redirectUris': [base + '*'], 'webOrigins': [], 'optionalClientScopes': [],
        }
        if (any(client.get(name) != value for name, value in expected.items())
                or 'secret' in client or set(client.get('defaultClientScopes', [])) != ACCOUNT_SCOPES):
            raise ValueError('Native account clients must retain restricted identity scopes and redirects')
    account = next(client for client in clients if client['clientId'] == 'account')
    console = next(client for client in clients if client['clientId'] == 'account-console')
    if account.get('defaultRoles') != ['view-profile', 'manage-account']:
        raise ValueError('Native account defaults must preserve only standard own-account roles')
    if console.get('attributes', {}).get('pkce.code.challenge.method') != 'S256':
        raise ValueError('The account console requires authorization-code PKCE')
    if realm.get('clientScopeMappings', {}).get('account') != [
            {'client': 'account-console', 'roles': ['manage-account', 'view-groups']}]:
        raise ValueError('The account console must retain its native restricted role scope')


def production_realm(source):
    realm = copy.deepcopy(source)
    validate_account_import(realm)
    # The same reviewed managed fields govern both imports. No unmanaged fields
    # are enabled, and custom identity/tenant fields are writable only by admins.
    realm.setdefault('components', {})[PROFILE_PROVIDER] = profile_components()
    # Only a machine identity is needed for API registration/reset operations.
    # Reconstruct it so no human credentials or inherited demo attributes survive.
    realm['users'] = [{
        'username': 'service-account-plainledger-api',
        'enabled': True,
        'serviceAccountClientId': 'plainledger-api',
        'clientRoles': {'realm-management': [
            'manage-users', 'view-users', 'query-users', 'query-groups', 'view-realm',
        ]},
    }]
    realm['groups'] = []
    realm['identityProviders'] = []
    realm['identityProviderMappers'] = []
    # Configure production SMTP through the protected Keycloak admin interface.
    # Do not ship the development SMTP credentials or nonfunctional social IdPs.
    realm['smtpServer'] = {}
    realm['verifyEmail'] = True
    realm['bruteForceProtected'] = True
    realm['registrationAllowed'] = False  # Application registration provisions its tenant.
    realm['sslRequired'] = 'external'

    for client in realm['clients']:
        client_id = client['clientId']
        if client_id in ACCOUNT_CLIENT_IDS:
            continue  # Preserve Keycloak's relative account URLs and restricted scopes.
        if client_id not in {'plainledger-web', 'plainledger-api', 'plainledger-admin'}:
            raise ValueError(f'Unreviewed production client: {client_id}')
        client['directAccessGrantsEnabled'] = False
        client['implicitFlowEnabled'] = False
        client['serviceAccountsEnabled'] = client_id == 'plainledger-api'
        attrs = client.setdefault('attributes', {})
        attrs.pop('client.secret.creation.time', None)
        if client_id == 'plainledger-api':
            client['secret'] = '${KEYCLOAK_CLIENT_SECRET}'
            client['standardFlowEnabled'] = False
            client['redirectUris'] = []
            client['webOrigins'] = []
        else:
            client.pop('secret', None)
            url = '${WEB_URL}' if client_id == 'plainledger-web' else '${ADMIN_URL}'
            client['standardFlowEnabled'] = True
            client['redirectUris'] = [url + '/*']
            client['webOrigins'] = [url]
            attrs['pkce.code.challenge.method'] = 'S256'
            attrs['post.logout.redirect.uris'] = url + '/*'
        for scope in ['organization', 'plainledger-api-audience']:
            if scope not in client.setdefault('defaultClientScopes', []):
                client['defaultClientScopes'].append(scope)
    return realm


def render():
    source = json.loads(SOURCE.read_text())
    if source.get('components', {}).get(PROFILE_PROVIDER) != profile_components():
        raise ValueError('Development profile is stale; run keycloak/prepare-production-realm.py --sync-profile')
    return json.dumps(production_realm(source), indent=2) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--sync-profile', action='store_true',
                      help='Sync the reviewed profile into the development import, then regenerate production')
    args = parser.parse_args()
    if args.sync_profile:
        source = json.loads(SOURCE.read_text())
        source.setdefault('components', {})[PROFILE_PROVIDER] = profile_components()
        write_atomic(SOURCE, json.dumps(source, indent=2) + '\n')
    output = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != output:
            raise SystemExit('Production realm is stale; run keycloak/prepare-production-realm.py')
        print('Production realm is current')
    else:
        write_atomic(OUTPUT, output)
        print('Production realm generated without human accounts or fixed credentials')


if __name__ == '__main__':
    main()
