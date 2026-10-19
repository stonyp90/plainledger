"""Production realm safety checks: python keycloak/test_production_realm.py."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

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

    def test_registration_and_verification_require_application_tenant_provisioning(self):
        self.assertFalse(self.realm['registrationAllowed'])
        self.assertTrue(self.realm['verifyEmail'])
        self.assertTrue(self.realm['bruteForceProtected'])
        self.assertEqual(self.realm['sslRequired'], 'external')

    def test_current_theme_and_all_membership_roles_exist(self):
        self.assertEqual(self.realm['accountTheme'], 'keycloak.v3')
        roles = {role['name'] for role in self.realm['roles']['realm']}
        self.assertTrue({'user', 'member', 'viewer', 'admin', 'owner'}.issubset(roles))

    def test_unreviewed_clients_fail_closed(self):
        self.source['clients'].append({'clientId': 'unreviewed-client'})
        with self.assertRaises(ValueError):
            generator.production_realm(self.source)


if __name__ == '__main__':
    unittest.main()
