#!/usr/bin/env python3
"""Verify HTTPS, exact deployed revision, real API readiness and OIDC metadata."""
from __future__ import annotations

import argparse
import ipaddress
import json
import re
import subprocess
import sys
from pathlib import Path

from env_config import ConfigError, load


class VerificationError(RuntimeError):
    pass


def fetch(host: str, path: str, target: str | None = None) -> tuple[int, str, str]:
    command = ['curl', '--silent', '--show-error', '--connect-timeout', '10',
               '--max-time', '25', '--proto', '=https', '--tlsv1.2',
               '--max-redirs', '0', '--write-out', '\n%{http_code}\n%{content_type}',
               f'https://{host}{path}']
    if target:
        address = ipaddress.ip_address(target)
        formatted = f'[{address}]' if address.version == 6 else str(address)
        command[1:1] = ['--resolve', f'{host}:443:{formatted}']
    result = subprocess.run(command, capture_output=True, text=True, timeout=30)
    if result.returncode:
        # Do not print response bodies or remote errors with arbitrary contents.
        raise VerificationError(f'HTTPS request failed for {host}{path} (curl exit {result.returncode}).')
    parts = result.stdout.rsplit('\n', 2)
    if len(parts) != 3 or not parts[1].isdigit():
        raise VerificationError(f'Unparseable HTTP status for {host}{path}.')
    return int(parts[1]), parts[2], parts[0]


def json_response(host: str, path: str, target: str | None) -> dict:
    status, content_type, body = fetch(host, path, target)
    if status != 200 or 'application/json' not in content_type.lower():
        raise VerificationError(f'{host}{path} must return HTTP 200 application/json; received {status}.')
    try:
        document = json.loads(body)
    except json.JSONDecodeError as error:
        raise VerificationError(f'{host}{path} returned malformed JSON.') from error
    if not isinstance(document, dict):
        raise VerificationError(f'{host}{path} returned an unexpected JSON shape.')
    return document


def verify(data: dict[str, str], release: str, target: str | None = None) -> list[str]:
    checks: list[str] = []
    app = data['APP_DOMAIN']
    status, _, body = fetch(app, '/__deployment/release', target)
    if status != 200 or body.strip() != release:
        raise VerificationError('The HTTPS origin is not serving the requested source revision.')
    checks.append('exact_release')
    ready = json_response(app, '/health/ready', target)
    if ready.get('status') != 'ready' or ready.get('checks') != {'database': 'connected', 'cache': 'connected'}:
        raise VerificationError('API database/cache readiness did not pass.')
    checks.append('api_database_cache_ready')
    for domain in (app, data['ADMIN_DOMAIN']):
        status, content_type, body = fetch(domain, '/', target)
        if status != 200:
            raise VerificationError(f'The application entry point on {domain} returned HTTP {status}.')
        if 'text/html' not in content_type or '<html' not in body.lower():
            raise VerificationError(f'The application entry point on {domain} did not return HTML.')
    checks.append('web_admin_entries')
    auth = data['AUTH_DOMAIN']
    issuer = f'https://{auth}/realms/plainledger'
    discovery = json_response(auth, '/realms/plainledger/.well-known/openid-configuration', target)
    if discovery.get('issuer') != issuer:
        raise VerificationError('Keycloak published the wrong public issuer.')
    for name in ('authorization_endpoint', 'token_endpoint', 'jwks_uri', 'end_session_endpoint'):
        if not str(discovery.get(name, '')).startswith(issuer + '/'):
            raise VerificationError(f'Keycloak published an invalid {name}.')
    jwks = json_response(auth, '/realms/plainledger/protocol/openid-connect/certs', target)
    if not isinstance(jwks.get('keys'), list) or not jwks['keys']:
        raise VerificationError('Keycloak did not publish a signing key set.')
    checks.append('oidc_public_issuer_and_signing_keys')
    # Management interfaces must not become public through the reverse proxy.
    for domain, path in ((auth, '/health/ready'), (auth, '/metrics'),
                         (data['STORAGE_DOMAIN'], '/minio/health/ready')):
        status, _, _ = fetch(domain, path, target)
        if status != 404:
            raise VerificationError(f'Management path {domain}{path} is unexpectedly exposed.')
    checks.append('management_routes_private')
    # No anonymous bucket listing on financial datasets or shared documents.
    for name in ('S3_BUCKET_BRONZE', 'S3_BUCKET_SILVER', 'S3_BUCKET_GOLD', 'S3_BUCKET_DOCUMENT_SHARE'):
        status, _, _ = fetch(data['STORAGE_DOMAIN'], '/' + data[name], target)
        if status != 403:
            raise VerificationError(f'{name} did not reject an anonymous bucket listing with HTTP 403.')
    checks.append('financial_buckets_private')
    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, required=True)
    parser.add_argument('--release', required=True)
    parser.add_argument('--target-ip', help='Verify this origin IP with the configured HTTPS hostnames; TLS remains verified.')
    args = parser.parse_args()
    try:
        if not re.fullmatch(r'[a-f0-9]{40}', args.release):
            raise ConfigError('Release must be a complete lowercase Git commit SHA.')
        data = load(args.env_file)
        checks = verify(data, args.release, args.target_ip)
    except (OSError, ValueError, subprocess.SubprocessError, VerificationError) as error:
        print(f'HTTPS verification failed: {error}', file=sys.stderr)
        return 1
    print(json.dumps({'result': 'passed', 'release': args.release,
                      'route': 'origin_override' if args.target_ip else 'public_dns', 'checks': checks}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
