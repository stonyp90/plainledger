#!/usr/bin/env python3
"""Derive a secret-free production import from the shared development realm.

Run this from any directory. --check verifies the committed output is current.
Runtime URL/secret substitutions are resolved by Keycloak's realm importer.
"""
import argparse
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'realms/plainledger-realm.json'
OUTPUT = ROOT / 'realms/plainledger-production-realm.json'


def production_realm(source):
    realm = copy.deepcopy(source)
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
    return json.dumps(production_realm(json.loads(SOURCE.read_text())), indent=2) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != output:
            raise SystemExit('Production realm is stale; run keycloak/prepare-production-realm.py')
        print('Production realm is current')
    else:
        OUTPUT.write_text(output)
        print('Production realm generated without human accounts or fixed credentials')


if __name__ == '__main__':
    main()
