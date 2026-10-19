"""Production realm safety checks: python keycloak/test_production_realm.py."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('production_realm', ROOT / 'prepare-production-realm.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class ProductionRealmTests(unittest.TestCase):
    def setUp(self):
        self.source = json.loads((ROOT / 'realms/plainledger-realm.json').read_text())
        self.realm = generator.production_realm(self.source)
        self.clients = {client['clientId']: client for client in self.realm['clients']}

    def test_generated_file_matches_reviewed_generator(self):
        self.assertEqual(generator.render(), (ROOT / 'realms/plainledger-production-realm.json').read_text())

    def test_generator_does_not_mutate_development_realm(self):
        original = copy.deepcopy(self.source)
        generator.production_realm(self.source)
        self.assertEqual(self.source, original)

    def test_only_api_machine_identity_is_imported(self):
        self.assertEqual(len(self.realm['users']), 1)
        user = self.realm['users'][0]
        self.assertEqual(user['serviceAccountClientId'], 'plainledger-api')
        self.assertNotIn('credentials', user)
        self.assertNotIn('attributes', user)
        self.assertNotIn('realm-admin', user['clientRoles']['realm-management'])

    def test_api_machine_preserves_reviewed_registration_permissions(self):
        machine = self.realm['users'][0]
        self.assertEqual(machine['clientRoles'], {
            'realm-management': [
                'manage-users', 'view-users', 'query-users', 'query-groups', 'view-realm',
            ],
        })

    def test_development_machine_can_find_and_map_application_roles(self):
        machines = [user for user in self.source['users']
                    if user.get('serviceAccountClientId') == 'plainledger-api']
        self.assertEqual(len(machines), 1)
        roles = machines[0]['clientRoles']['realm-management']
        self.assertTrue({'manage-users', 'view-realm'}.issubset(roles))
        self.assertNotIn('realm-admin', roles)

    def test_no_development_mail_credentials_or_social_providers(self):
        self.assertEqual(self.realm['smtpServer'], {})
        self.assertEqual(self.realm['identityProviders'], [])
        self.assertEqual(self.realm['groups'], [])

    def test_human_clients_require_authorization_code_pkce_and_exact_origins(self):
        for client_id, variable in [('plainledger-web', 'WEB_URL'), ('plainledger-admin', 'ADMIN_URL')]:
            client = self.clients[client_id]
            origin = '${' + variable + '}'
            self.assertEqual(client['redirectUris'], [origin + '/*'])
            self.assertEqual(client['webOrigins'], [origin])
            self.assertTrue(client['standardFlowEnabled'])
            self.assertFalse(client['directAccessGrantsEnabled'])
            self.assertFalse(client['implicitFlowEnabled'])
            self.assertFalse(client['serviceAccountsEnabled'])
            self.assertEqual(client['attributes']['pkce.code.challenge.method'], 'S256')
            self.assertNotIn('secret', client)

    def test_api_secret_is_a_runtime_substitution_and_no_browser_flow_is_enabled(self):
        client = self.clients['plainledger-api']
        self.assertEqual(client['secret'], '${KEYCLOAK_CLIENT_SECRET}')
        self.assertTrue(client['serviceAccountsEnabled'])
        self.assertFalse(client['standardFlowEnabled'])
        self.assertFalse(client['directAccessGrantsEnabled'])
        self.assertEqual(client['redirectUris'], [])
        self.assertEqual(client['webOrigins'], [])

    def test_application_tokens_have_tenant_and_api_audience_scopes(self):
        for client_id in ('plainledger-web', 'plainledger-api', 'plainledger-admin'):
            client = self.clients[client_id]
            self.assertIn('organization', client['defaultClientScopes'])
            self.assertIn('plainledger-api-audience', client['defaultClientScopes'])

    def test_native_account_clients_use_identity_scopes_without_application_access(self):
        expected_scopes = {'openid', 'profile', 'email', 'roles', 'web-origins', 'acr'}
        source_clients = {client['clientId']: client for client in self.source['clients']}
        for name in ('account', 'account-console'):
            client = self.clients[name]
            self.assertEqual(client, source_clients[name])
            self.assertEqual(set(client['defaultClientScopes']), expected_scopes)
            self.assertEqual(client['optionalClientScopes'], [])
            self.assertFalse(client['fullScopeAllowed'])
            self.assertFalse(client['serviceAccountsEnabled'])
            self.assertFalse(client['directAccessGrantsEnabled'])
            self.assertFalse(client['implicitFlowEnabled'])
            self.assertNotIn('secret', client)
            self.assertEqual(client['rootUrl'], '${authBaseUrl}')
            self.assertEqual(client['redirectUris'], ['/realms/plainledger/account/*'])
            self.assertEqual(client['webOrigins'], [])

    def test_native_account_role_defaults_and_composites_are_preserved(self):
        roles = {role['name']: role for role in self.realm['roles']['client']['account']}
        self.assertEqual(set(roles), {'view-profile', 'manage-account', 'manage-account-links',
                                    'view-applications', 'view-consent', 'manage-consent',
                                    'view-groups', 'delete-account'})
        self.assertEqual(roles['manage-account']['composites'],
                         {'client': {'account': ['manage-account-links']}})
        self.assertEqual(roles['manage-consent']['composites'],
                         {'client': {'account': ['view-consent']}})
        # Keycloak 26.8.1 imports these into its default-role composite, as its
        # built-in client setup does for new application-registered humans.
        self.assertEqual(self.clients['account']['defaultRoles'], ['view-profile', 'manage-account'])
        self.assertNotIn('defaultRole', self.realm)  # Required by that import conversion.
        self.assertEqual(self.realm['defaultRoles'], ['viewer'])
        self.assertNotIn('defaultRoles', self.clients['account-console'])

    def test_account_console_requires_pkce_and_only_native_role_scope(self):
        client = self.clients['account-console']
        self.assertEqual(client['attributes']['pkce.code.challenge.method'], 'S256')
        self.assertEqual(self.realm['clientScopeMappings']['account'], [
            {'client': 'account-console', 'roles': ['manage-account', 'view-groups']},
        ])
        self.assertFalse(any(mapping.get('client') == 'account-console'
                             for mapping in self.realm['scopeMappings']))
        scopes = {scope['name']: scope for scope in self.realm['clientScopes']}
        role_mappers = scopes['roles']['protocolMappers']
        client_roles = next(mapper for mapper in role_mappers
                            if mapper['protocolMapper'] == 'oidc-usermodel-client-role-mapper')
        self.assertEqual(client_roles['config']['access.token.claim'], 'true')
        self.assertEqual(client_roles['config']['claim.name'], 'resource_access.${client_id}.roles')
        self.assertTrue(any(mapper['protocolMapper'] == 'oidc-audience-resolve-mapper'
                            for mapper in client['protocolMappers']))

    def test_missing_or_duplicate_native_account_clients_fail_before_import(self):
        for name in ('account', 'account-console'):
            for duplicate in (False, True):
                source = copy.deepcopy(self.source)
                client = next(client for client in source['clients'] if client['clientId'] == name)
                if duplicate:
                    source['clients'].append(copy.deepcopy(client))
                else:
                    source['clients'].remove(client)
                with self.subTest(name=name, duplicate=duplicate), self.assertRaisesRegex(ValueError, 'Both reviewed native account clients'):
                    generator.production_realm(source)

    def test_account_import_rejects_broader_scopes_origins_credentials_and_role_grants(self):
        changes = [
            {'fullScopeAllowed': True}, {'serviceAccountsEnabled': True},
            {'directAccessGrantsEnabled': True}, {'secret': 'not-a-runtime-secret'},
            {'redirectUris': ['*']}, {'webOrigins': ['*']},
            {'defaultClientScopes': ['openid', 'profile', 'email', 'roles', 'web-origins', 'acr', 'plainledger-api-audience']},
            {'optionalClientScopes': ['organization']},
        ]
        for changeset in changes:
            source = copy.deepcopy(self.source)
            client = next(client for client in source['clients'] if client['clientId'] == 'account-console')
            client.update(changeset)
            with self.subTest(changes=changeset), self.assertRaisesRegex(ValueError, 'restricted identity scopes'):
                generator.production_realm(source)
        source = copy.deepcopy(self.source)
        source['clientScopeMappings']['account'][0]['roles'].append('delete-account')
        with self.assertRaisesRegex(ValueError, 'native restricted role scope'):
            generator.production_realm(source)

    def test_every_client_has_an_enabled_subject_mapper(self):
        # Keycloak 25+ requires explicit token inclusion. An empty mapper config
        # produces validly signed access tokens without a subject or DB identity.
        for realm in (self.source, self.realm):
            scopes = {scope['name']: scope for scope in realm['clientScopes']}
            for client in realm['clients']:
                mappers = [
                    mapper
                    for name in client['defaultClientScopes']
                    for mapper in scopes.get(name, {}).get('protocolMappers', [])
                    if mapper['protocolMapper'] == 'oidc-sub-mapper'
                ]
                self.assertEqual(len(mappers), 1, client['clientId'])
                self.assertEqual(mappers[0]['config'].get('access.token.claim'), 'true')
                self.assertEqual(mappers[0]['config'].get('introspection.token.claim'), 'true')

    def test_registration_and_verification_require_application_tenant_provisioning(self):
        self.assertFalse(self.realm['registrationAllowed'])
        self.assertTrue(self.realm['verifyEmail'])
        self.assertTrue(self.realm['bruteForceProtected'])
        self.assertEqual(self.realm['sslRequired'], 'external')

    def test_current_theme_and_all_membership_roles_exist(self):
        self.assertEqual(self.realm['accountTheme'], 'keycloak.v3')
        roles = {role['name'] for role in self.realm['roles']['realm']}
        self.assertTrue({'user', 'member', 'viewer', 'admin', 'owner'}.issubset(roles))

    def test_managed_profile_is_imported_from_the_same_reviewed_configuration(self):
        reviewed = json.loads(generator.PROFILE.read_text())
        for realm in (self.source, self.realm):
            components = realm['components'][generator.PROFILE_PROVIDER]
            self.assertEqual(len(components), 1)
            self.assertEqual(components[0]['providerId'], 'declarative-user-profile')
            encoded = components[0]['config']['kc.user.profile.config']
            self.assertEqual(len(encoded), 1)
            self.assertEqual(json.loads(encoded[0]), reviewed)
        self.assertTrue(self.realm['internationalizationEnabled'])

    def test_built_in_profile_validators_and_user_permissions_are_preserved(self):
        profile = json.loads(generator.PROFILE.read_text())
        attributes = {attribute['name']: attribute for attribute in profile['attributes']}
        for name in ('username', 'email', 'firstName', 'lastName'):
            attribute = attributes[name]
            self.assertEqual(attribute['permissions'], {'view': ['admin', 'user'], 'edit': ['admin', 'user']})
            self.assertEqual(attribute['validations']['length']['max'], 255)
        self.assertEqual(attributes['username']['validations']['length']['min'], 3)
        self.assertIn('username-prohibited-characters', attributes['username']['validations'])
        self.assertIn('up-username-not-idn-homograph', attributes['username']['validations'])
        self.assertIn('email', attributes['email']['validations'])
        for name in ('email', 'firstName', 'lastName'):
            self.assertEqual(attributes[name]['required'], {'roles': ['user']})
        for name in ('firstName', 'lastName'):
            self.assertIn('person-name-prohibited-characters', attributes[name]['validations'])

    def test_only_reviewed_application_attributes_are_writable_and_only_by_admin(self):
        profile = json.loads(generator.PROFILE.read_text())
        self.assertIsNone(profile.get('unmanagedAttributePolicy'))
        application = [attribute for attribute in profile['attributes']
                       if attribute['name'] not in {'username', 'email', 'firstName', 'lastName'}]
        expected = {'organization', 'organizationName', 'industry', 'province',
                    'registrationSource', 'registeredAt', 'demoMode', 'plan',
                    'accountStatus', 'invitedBy', 'invitedAt'}
        self.assertEqual({attribute['name'] for attribute in application}, expected)
        self.assertEqual(len(application), len(expected))
        for attribute in application:
            self.assertEqual(attribute['permissions'], {'view': ['admin'], 'edit': ['admin']})
            self.assertFalse(attribute['multivalued'])
            self.assertNotIn('required', attribute)
            self.assertEqual(attribute['validations']['length'], {'max': 2048})

    def test_stale_development_profile_cannot_pass_the_generator_check(self):
        source = copy.deepcopy(self.source)
        source['components'].pop(generator.PROFILE_PROVIDER)
        with tempfile.TemporaryDirectory() as directory:
            stale = Path(directory) / 'realm.json'
            stale.write_text(json.dumps(source))
            with patch.object(generator, 'SOURCE', stale), self.assertRaisesRegex(ValueError, 'Development profile is stale'):
                generator.render()

    def test_unreviewed_clients_fail_closed(self):
        self.source['clients'].append({'clientId': 'unreviewed-client'})
        with self.assertRaises(ValueError):
            generator.production_realm(self.source)


if __name__ == '__main__':
    unittest.main()
