"""Meaningful deployment-boundary tests. No Docker, SSH or cloud access is used."""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ORACLE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ORACLE / 'scripts'))
import env_config
import remote_runner
import verify


def fixture_config() -> dict[str, str]:
    data = env_config.parse_data((ORACLE / 'env.example').read_text())
    for name in env_config.IMAGES:
        data[name] = 'example/image:test@sha256:' + 'a' * 64
    for index, name in enumerate(env_config.SECRETS, start=1):
        data[name] = f'{index:064x}'
    data.update(TLS_EMAIL='operator@example.com', KEYCLOAK_ADMIN_USER='operator',
                MONGO_ROOT_USER='mongoroot', MINIO_ROOT_USER='minioroot',
                MINIO_APP_ACCESS_KEY='plainledgerapp', SMTP_HOST='smtp.example.com',
                SMTP_USER='smtp-user', SMTP_PASSWORD='fixture-smtp-password',
                SMTP_FROM='accounts@example.com')
    return data


class ConfigurationTests(unittest.TestCase):
    def test_template_cannot_be_deployed_as_real_configuration(self):
        with self.assertRaisesRegex(env_config.ConfigError, 'Missing required'):
            env_config.validate(env_config.parse_data((ORACLE / 'env.example').read_text()))

    def test_missing_configuration_reports_names_without_values(self):
        data = fixture_config()
        del data['KEYCLOAK_CLIENT_SECRET']
        with self.assertRaises(env_config.ConfigError) as caught:
            env_config.validate(data)
        self.assertIn('KEYCLOAK_CLIENT_SECRET', str(caught.exception))
        self.assertNotIn(data['APP_DB_PASSWORD'], str(caught.exception))

    def test_shell_expressions_are_rejected_as_data(self):
        for expression in ('$(touch /tmp/must-not-exist)', '`hostname`', '${HOME}'):
            with self.subTest(expression=expression), self.assertRaises(env_config.ConfigError):
                env_config.parse_data('APP_DB_PASSWORD=' + expression)

    def test_reused_service_credentials_and_public_data_bucket_are_rejected(self):
        data = fixture_config()
        data['KEYCLOAK_DB_PASSWORD'] = data['APP_DB_PASSWORD']
        with self.assertRaisesRegex(env_config.ConfigError, 'must differ'):
            env_config.validate(data)
        data = fixture_config()
        data['S3_BUCKET_DOCUMENT_SHARE'] = data['S3_BUCKET_UPLOADS']
        with self.assertRaisesRegex(env_config.ConfigError, 'separate buckets'):
            env_config.validate(data)

    def test_connection_credentials_are_url_encoded(self):
        data = fixture_config()
        data['APP_DB_PASSWORD'] = 'a' * 32 + '@:#%&'
        data['MONGO_APP_PASSWORD'] = 'b' * 32 + '@:#%&'
        result = env_config.validate(data)
        self.assertIn('%40%3A%23%25%26@app-db', result['DATABASE_URL'])
        self.assertIn('%40%3A%23%25%26@mongodb', result['MONGODB_URI'])

    def test_host_file_permissions_and_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'runtime.env'
            path.write_text('\n'.join(f'{k}={v}' for k, v in fixture_config().items()))
            path.chmod(0o644)
            with self.assertRaisesRegex(env_config.ConfigError, 'private'):
                env_config.load(path)
            path.chmod(0o600)
            self.assertEqual(env_config.load(path)['APP_DOMAIN'], 'plainledger.ca')
            alias = Path(directory) / 'alias'
            alias.symlink_to(path)
            with self.assertRaisesRegex(env_config.ConfigError, 'symlink'):
                env_config.load(alias)

    def test_registry_references_require_digests(self):
        data = fixture_config()
        data['CADDY_IMAGE'] = 'caddy:latest'
        with self.assertRaisesRegex(env_config.ConfigError, 'digest'):
            env_config.validate(data)

    def test_error_redaction_covers_uri_and_individual_secrets(self):
        data = env_config.validate(fixture_config())
        message = data['APP_DB_PASSWORD'] + ' ' + data['DATABASE_URL'] + ' ' + data['SMTP_PASSWORD']
        redacted = env_config.redact(message, data)
        self.assertNotIn(data['APP_DB_PASSWORD'], redacted)
        self.assertNotIn(data['DATABASE_URL'], redacted)
        self.assertNotIn(data['SMTP_PASSWORD'], redacted)


class RemoteBoundaryTests(unittest.TestCase):
    def test_missing_target_does_not_silently_skip(self):
        with self.assertRaisesRegex(remote_runner.PreflightError, 'explicitly'):
            remote_runner.settings({})

    def test_shell_metacharacters_and_parent_paths_are_rejected(self):
        data = dict(ORACLE_DEPLOY_ENABLED='true', ORACLE_HOST='oracle.example.com',
                    ORACLE_SSH_USER='ubuntu', ORACLE_BASE_DIR='/opt/plainledger',
                    ORACLE_SSH_PRIVATE_KEY='fixture', ORACLE_SSH_KNOWN_HOSTS='fixture')
        for name, value in [('ORACLE_HOST', 'host;id'), ('ORACLE_SSH_USER', '-oProxyCommand=id'),
                            ('ORACLE_BASE_DIR', '/opt/../etc'), ('ORACLE_SSH_PORT', '22 -v')]:
            with self.subTest(name=name), self.assertRaises(remote_runner.PreflightError):
                remote_runner.settings(dict(data, **{name: value}))

    def test_archive_hash_is_checked_before_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            (base / 'incoming').mkdir()
            revision = 'b' * 40
            (base / 'incoming' / f'{revision}.tar.gz').write_bytes(b'not an archive')
            result = subprocess.run(['sh', str(ORACLE / 'scripts/receive-release.sh'),
                                     str(base), revision, '0' * 64, 'prepare', 'false'],
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('SHA256 does not match', result.stderr)
            self.assertFalse((base / 'releases').exists())

    def test_tar_traversal_and_symlinks_cannot_escape_release(self):
        for entry_type in ('traversal', 'symlink'):
            with self.subTest(entry_type=entry_type), tempfile.TemporaryDirectory() as directory:
                base = Path(directory)
                (base / 'incoming').mkdir()
                revision = 'c' * 40
                archive = base / 'incoming' / f'{revision}.tar.gz'
                with tarfile.open(archive, 'w:gz') as output:
                    member = tarfile.TarInfo('../../escape' if entry_type == 'traversal' else 'link')
                    if entry_type == 'symlink':
                        member.type = tarfile.SYMTYPE
                        member.linkname = '/etc'
                        output.addfile(member)
                    else:
                        member.size = 4
                        output.addfile(member, io.BytesIO(b'test'))
                digest = hashlib.sha256(archive.read_bytes()).hexdigest()
                result = subprocess.run(['sh', str(ORACLE / 'scripts/receive-release.sh'),
                                         str(base), revision, digest, 'prepare', 'false'],
                                        capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('unsafe path or link', result.stderr)
                self.assertFalse((base / 'releases' / revision).exists())


class HttpsVerificationTests(unittest.TestCase):
    def setUp(self):
        self.data = fixture_config()
        self.revision = 'd' * 40
        app, auth, admin, storage = (self.data[name] for name in env_config.DOMAINS)
        issuer = f'https://{auth}/realms/plainledger'
        self.responses = {
            (app, '/__deployment/release'): (200, 'text/plain', self.revision),
            (app, '/health/ready'): (200, 'application/json', json.dumps({'status':'ready','checks':{'database':'connected','cache':'connected'}})),
            (app, '/'): (200, 'text/html', '<html>PlainLedger</html>'),
            (admin, '/'): (200, 'text/html', '<html>PlainLedger Admin</html>'),
            (auth, '/realms/plainledger/.well-known/openid-configuration'): (200, 'application/json', json.dumps({
                'issuer': issuer, 'authorization_endpoint': issuer+'/protocol/openid-connect/auth',
                'token_endpoint': issuer+'/protocol/openid-connect/token', 'jwks_uri': issuer+'/protocol/openid-connect/certs',
                'end_session_endpoint': issuer+'/protocol/openid-connect/logout'})),
            (auth, '/realms/plainledger/protocol/openid-connect/certs'): (200, 'application/json', '{"keys":[{"kid":"test","kty":"RSA"}]}'),
            (auth, '/health/ready'): (404, 'text/plain', ''),
            (auth, '/metrics'): (404, 'text/plain', ''),
            (storage, '/minio/health/ready'): (404, 'text/plain', ''),
        }
        for name in ('S3_BUCKET_BRONZE','S3_BUCKET_SILVER','S3_BUCKET_GOLD','S3_BUCKET_DOCUMENT_SHARE'):
            self.responses[(storage, '/'+self.data[name])] = (403, 'application/xml', '<Error>AccessDenied</Error>')

    def verify_responses(self):
        with patch.object(verify, 'fetch', side_effect=lambda host,path,target=None:self.responses[(host,path)]):
            return verify.verify(self.data, self.revision)

    def test_verified_responses_pass(self):
        self.assertIn('financial_buckets_private', self.verify_responses())

    def test_200_spa_fallback_is_not_api_readiness(self):
        self.responses[(self.data['APP_DOMAIN'], '/health/ready')] = (200, 'text/html', '<html>PlainLedger</html>')
        with self.assertRaisesRegex(verify.VerificationError, 'application/json'):
            self.verify_responses()

    def test_stale_revision_and_wrong_issuer_are_rejected(self):
        self.responses[(self.data['APP_DOMAIN'], '/__deployment/release')] = (200, 'text/plain', 'e'*40)
        with self.assertRaisesRegex(verify.VerificationError, 'revision'):
            self.verify_responses()
        self.setUp()
        key = (self.data['AUTH_DOMAIN'], '/realms/plainledger/.well-known/openid-configuration')
        self.responses[key] = (200, 'application/json', '{"issuer":"http://keycloak:8080/realms/plainledger"}')
        with self.assertRaisesRegex(verify.VerificationError, 'issuer'):
            self.verify_responses()

    def test_public_financial_listing_is_rejected(self):
        self.responses[(self.data['STORAGE_DOMAIN'], '/'+self.data['S3_BUCKET_GOLD'])] = (200, 'application/xml', '<ListBucketResult/>')
        with self.assertRaisesRegex(verify.VerificationError, 'anonymous'):
            self.verify_responses()


if __name__ == '__main__':
    unittest.main()
