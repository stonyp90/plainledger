#!/usr/bin/env python3
"""Prepare or activate a versioned PlainLedger release on an existing OCI VM."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from env_config import ConfigError, load, redact
from verify import VerificationError, verify


class DeploymentError(RuntimeError):
    pass


PRIVATE_PROBE = r'''
const required = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Readiness request failed');
  return r.json();
};
const health = await required('http://api:3000/health/ready');
if (health.status !== 'ready' || health.checks.database !== 'connected' || health.checks.cache !== 'connected') throw new Error('API dependencies unavailable');
const config = await required('http://keycloak:8080/realms/plainledger/.well-known/openid-configuration');
if (config.issuer !== process.env.KEYCLOAK_URL + '/realms/plainledger') throw new Error('Wrong Keycloak issuer');
const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
const client = new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
for (const bucket of ['S3_BUCKET_BRONZE','S3_BUCKET_SILVER','S3_BUCKET_GOLD','S3_BUCKET_UPLOADS','S3_BUCKET_DOCUMENT_SHARE']) await client.send(new HeadBucketCommand({Bucket:process.env[bucket]}));
client.destroy();
console.log('Private API, Keycloak issuer and application storage credentials verified.');
'''

TOKEN_PROBE = r'''
const endpoint = process.env.KEYCLOAK_URL + '/realms/plainledger/protocol/openid-connect/token';
const body = new URLSearchParams({grant_type:'client_credentials',client_id:'plainledger-api',client_secret:process.env.KEYCLOAK_CLIENT_SECRET});
const r = await fetch(endpoint,{method:'POST',body,signal:AbortSignal.timeout(15000)});
if (!r.ok) throw new Error('Public HTTPS service-account authentication failed');
const token = await r.json();
if (typeof token.access_token !== 'string') throw new Error('No access token returned');
const claims = JSON.parse(Buffer.from(token.access_token.split('.')[1],'base64url').toString());
if (claims.iss !== process.env.KEYCLOAK_URL + '/realms/plainledger' || claims.exp <= Date.now()/1000) throw new Error('Unexpected issued token claims');
console.log('Public HTTPS service-account token issued with expected issuer and expiry.');
'''


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run(command: list[str], env: dict[str, str], data: dict[str, str], cwd: Path,
        timeout: int = 300) -> str:
    result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        tail = redact((result.stderr + '\n' + result.stdout)[-5000:], data)
        raise DeploymentError(f'Command failed with exit {result.returncode}: {command[0]}\n{tail}')
    return result.stdout


def atomic_receipt(path: Path, content: dict) -> None:
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(content, indent=2) + '\n')
    temporary.chmod(0o600)
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, required=True)
    parser.add_argument('--release', required=True)
    parser.add_argument('--phase', choices=('prepare', 'activate'), default='prepare')
    parser.add_argument('--initialize-empty-database', action='store_true',
                        help='Run the guarded empty-database bootstrap; existing schemas are rejected.')
    parser.add_argument('--preflight-only', action='store_true', help='Validate configuration and Compose without starting containers.')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    shared = args.env_file.resolve().parent
    receipt: dict = {'release': args.release, 'phase': args.phase, 'started_at': utc_now(),
                     'status': 'started', 'checks': []}
    data: dict[str, str] = {}
    try:
        if not re.fullmatch(r'[a-f0-9]{40}', args.release):
            raise ConfigError('Release must be a complete lowercase Git commit SHA.')
        data = load(args.env_file)
        if not shutil.which('docker') or not shutil.which('curl'):
            raise DeploymentError('The provisioned host needs Docker Engine, Compose v2, and curl.')
        environment = {k: v for k, v in os.environ.items()
                       if not k.startswith(('COMPOSE_', 'DOCKER_', 'VITE_', 'NEXT_PUBLIC_'))}
        environment.update(data)
        environment['RELEASE_SHA'] = args.release
        environment['COMPOSE_PARALLEL_LIMIT'] = '2'
        compose = ['docker', 'compose', '--project-name', 'plainledger-oracle',
                   '--env-file', '/dev/null', '-f', str(repo / 'deploy/oracle/compose.yml')]
        version = run(['docker', 'compose', 'version', '--short'], environment, data, repo).strip().lstrip('v')
        match = re.match(r'(\d+)\.(\d+)', version)
        if not match or tuple(map(int, match.groups())) < (2, 24):
            raise DeploymentError('Docker Compose 2.24 or newer is required.')
        run(['docker', 'info', '--format', '{{.OSType}}'], environment, data, repo)
        run(compose + ['config', '--quiet'], environment, data, repo)
        receipt['checks'].append('configuration_and_compose')
        if args.preflight_only:
            print('Preflight passed. No containers were started and no configuration values were printed.')
            return 0
        if shutil.disk_usage(repo).free < 8 * 1024 ** 3:
            raise DeploymentError('At least 8 GiB of free host disk is required before building this stack.')
        lock_path = shared / 'deployment.lock'
        with lock_path.open('a') as lock:
            lock_path.chmod(0o600)
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise DeploymentError('Another deployment is using this host configuration.') from error
            print('Pulling pinned dependency images.', flush=True)
            run(compose + ['pull', 'caddy', 'app-db', 'keycloak-db', 'redis', 'mongodb', 'minio', 'storage-init'], environment, data, repo, 900)
            print('Building application images for the requested source revision.', flush=True)
            run(compose + ['build', '--pull', 'api', 'web', 'admin', 'keycloak'], environment, data, repo, 2400)
            receipt['checks'].append('container_builds')
            print('Starting private persistent dependencies.', flush=True)
            run(compose + ['up', '-d', '--wait', '--wait-timeout', '240', 'app-db', 'keycloak-db', 'redis', 'mongodb', 'minio'], environment, data, repo, 300)
            if args.initialize_empty_database:
                bootstrap = repo / 'apps/api/scripts/bootstrap-empty-database.cjs'
                if not bootstrap.is_file():
                    raise DeploymentError('The reviewed empty-database bootstrap is absent from this release.')
                print('Running guarded empty-database initialization.', flush=True)
                run(compose + ['run', '--rm', '--no-deps', 'api', 'node', 'scripts/bootstrap-empty-database.cjs', '--apply'], environment, data, repo, 300)
                receipt['checks'].append('guarded_empty_database_bootstrap')
            print('Checking the application schema and private storage.', flush=True)
            run(compose + ['run', '--rm', '--no-deps', 'schema-check'], environment, data, repo)
            run(compose + ['run', '--rm', '--no-deps', 'storage-init'], environment, data, repo)
            print('Starting the application and HTTPS gateway.', flush=True)
            run(compose + ['up', '-d', '--wait', '--wait-timeout', '360'], environment, data, repo, 420)
            run(compose + ['exec', '-T', 'api', 'node', '--input-type=module', '-e', PRIVATE_PROBE], environment, data, repo)
            receipt['checks'].extend(['private_service_readiness', 'oidc_internal_discovery', 's3_application_bucket_access'])
            if args.phase == 'activate':
                print('Verifying the Oracle origin over HTTPS, then the public DNS route.', flush=True)
                receipt['origin_checks'] = verify(data, args.release, '127.0.0.1')
                run(compose + ['exec', '-T', 'api', 'node', '--input-type=module', '-e', TOKEN_PROBE], environment, data, repo)
                receipt['public_checks'] = verify(data, args.release)
                receipt['checks'].append('public_https_service_account_authentication')
                receipt['status'] = 'activated'
                temporary = shared / 'current.new'
                temporary.unlink(missing_ok=True)
                temporary.symlink_to(repo, target_is_directory=True)
                temporary.replace(shared / 'current')
            else:
                receipt['status'] = 'prepared_public_verification_pending'
            receipt['finished_at'] = utc_now()
            atomic_receipt(shared / f'{args.release}-{args.phase}.json', receipt)
        print(json.dumps(receipt, indent=2))
        return 0
    except (OSError, ConfigError, DeploymentError, VerificationError, subprocess.SubprocessError) as error:
        safe_error = redact(str(error), data)
        receipt.update(status='failed', finished_at=utc_now(), error=safe_error)
        if data and shared.is_dir() and not args.preflight_only:
            try:
                atomic_receipt(shared / f'{args.release}-{args.phase}.json', receipt)
            except OSError:
                pass
        print(f'Deployment stopped: {safe_error}', file=sys.stderr)
        print('No volume deletion, database rollback, or DNS change was performed.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
