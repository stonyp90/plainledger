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

    def test_browser_tokens_have_tenant_and_api_audience_scopes(self):
        for client in self.clients.values():
            self.assertIn('organization', client['defaultClientScopes'])
            self.assertIn('plainledger-api-audience', client['defaultClientScopes'])

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
