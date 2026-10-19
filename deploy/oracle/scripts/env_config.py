#!/usr/bin/env python3
"""Read host configuration as data, validate it, and never print secret values."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import stat
import sys
from urllib.parse import quote

DOMAINS = ('APP_DOMAIN', 'AUTH_DOMAIN', 'ADMIN_DOMAIN', 'STORAGE_DOMAIN')
IMAGES = ('CADDY_IMAGE', 'APP_DB_IMAGE', 'KEYCLOAK_DB_IMAGE', 'REDIS_IMAGE',
          'MONGODB_IMAGE', 'MINIO_IMAGE', 'MINIO_CLIENT_IMAGE')
SECRETS = ('APP_DB_PASSWORD', 'KEYCLOAK_DB_PASSWORD', 'KEYCLOAK_ADMIN_PASSWORD',
           'KEYCLOAK_CLIENT_SECRET', 'REDIS_PASSWORD', 'MONGO_ROOT_PASSWORD',
           'MONGO_APP_PASSWORD', 'MINIO_ROOT_PASSWORD', 'MINIO_APP_SECRET_KEY',
           'UNSUBSCRIBE_SECRET')
IDENTIFIERS = ('APP_DB_NAME', 'APP_DB_USER', 'KEYCLOAK_DB_NAME', 'KEYCLOAK_DB_USER',
               'KEYCLOAK_ADMIN_USER', 'MONGO_ROOT_USER', 'MONGO_APP_DB',
               'MONGO_APP_USER', 'MINIO_ROOT_USER', 'MINIO_APP_ACCESS_KEY')
BUCKETS = ('S3_BUCKET_BRONZE', 'S3_BUCKET_SILVER', 'S3_BUCKET_GOLD',
           'S3_BUCKET_UPLOADS', 'S3_BUCKET_DOCUMENT_SHARE')
SMTP = ('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM')
OPTIONAL = ('QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET', 'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY')
REQUIRED = DOMAINS + IMAGES + SECRETS + IDENTIFIERS + BUCKETS + SMTP + ('TLS_EMAIL', 'S3_REGION')
ALLOWED = set(REQUIRED + OPTIONAL)
SECRET_NAMES = set(SECRETS) | {'SMTP_PASSWORD', 'QUICKBOOKS_CLIENT_SECRET',
                             'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
                             'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'}
NAME = re.compile(r'^[A-Z][A-Z0-9_]*$')
DOMAIN = re.compile(r'^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$')
IDENTIFIER = re.compile(r'^[a-zA-Z][a-zA-Z0-9_-]{2,62}$')
IMAGE = re.compile(r'^[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}$')


class ConfigError(ValueError):
    """A validation error containing names/reasons, never supplied values."""


def parse_data(text: str) -> dict[str, str]:
    data: dict[str, str] = {}
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        name, separator, value = line.partition('=')
        if not separator or not NAME.fullmatch(name):
            raise ConfigError(f'Invalid assignment on line {number}; use KEY=value data syntax.')
        if name not in ALLOWED:
            raise ConfigError(f'Unknown configuration name on line {number}: {name}.')
        if name in data:
            raise ConfigError(f'Duplicate configuration name: {name}.')
        # Compose receives the parsed environment directly. No shell or dotenv
        # expansion is performed. Reject expressions/quoting instead of guessing.
        if any(x in value for x in ('\x00', '\r', '\n', '$', '`')) or value.startswith(('"', "'")):
            raise ConfigError(f'{name} must be a literal single-line value, without quotes or expansion.')
        data[name] = value
    return data


def validate(data: dict[str, str]) -> dict[str, str]:
    missing = [name for name in REQUIRED if not data.get(name)]
    if missing:
        raise ConfigError('Missing required configuration names: ' + ', '.join(missing))
    for name in DOMAINS + ('SMTP_HOST',):
        if not DOMAIN.fullmatch(data[name]):
            raise ConfigError(f'{name} must be a lowercase fully qualified DNS hostname.')
    if len({data[name] for name in DOMAINS}) != len(DOMAINS):
        raise ConfigError('APP_DOMAIN, AUTH_DOMAIN, ADMIN_DOMAIN and STORAGE_DOMAIN must differ.')
    for name in IMAGES:
        if not IMAGE.fullmatch(data[name]):
            raise ConfigError(f'{name} must be pinned to an explicit sha256 manifest digest.')
    for name in IDENTIFIERS:
        if not IDENTIFIER.fullmatch(data[name]):
            raise ConfigError(f'{name} must contain 3–63 letters, digits, underscores or hyphens.')
    for name in SECRETS:
        if len(data[name]) < 32 or re.search(r'change.?me|replace|example|placeholder', data[name], re.I):
            raise ConfigError(f'{name} must be an independently generated secret of at least 32 characters.')
        if not re.fullmatch(r'[A-Za-z0-9!@#%&*+,.=:?^_~-]+', data[name]):
            raise ConfigError(f'{name} uses unsupported characters; use a generated hex or URL-safe secret.')
    if len({data[name] for name in SECRETS}) != len(SECRETS):
        raise ConfigError('Service secrets must differ; do not reuse one password across dependencies.')
    if data['APP_DB_USER'] == data['KEYCLOAK_DB_USER']:
        raise ConfigError('Application and Keycloak database users must differ.')
    if data['MONGO_ROOT_USER'] == data['MONGO_APP_USER']:
        raise ConfigError('MongoDB application and root users must differ.')
    if data['MINIO_ROOT_USER'] == data['MINIO_APP_ACCESS_KEY']:
        raise ConfigError('MinIO application and root users must differ.')
    for name in BUCKETS:
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', data[name]):
            raise ConfigError(f'{name} must be a valid 3–63 character bucket name without dots.')
    if len({data[name] for name in BUCKETS}) != len(BUCKETS):
        raise ConfigError('Public assets, shared documents and financial data need separate buckets.')
    for name in ('TLS_EMAIL', 'SMTP_FROM'):
        if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', data[name]):
            raise ConfigError(f'{name} must be an email address.')
    if not data['SMTP_PORT'].isdigit() or not 1 <= int(data['SMTP_PORT']) <= 65535:
        raise ConfigError('SMTP_PORT must be a valid TCP port.')
    if data['SMTP_PORT'] != '587':
        raise ConfigError('This candidate configures SMTP STARTTLS on port 587; review before changing transport.')
    if not re.fullmatch(r'[a-z0-9-]{2,63}', data['S3_REGION']):
        raise ConfigError('S3_REGION has an invalid format.')
    result = dict(data)
    result['DATABASE_URL'] = (
        f"postgresql://{quote(data['APP_DB_USER'], safe='')}:{quote(data['APP_DB_PASSWORD'], safe='')}"
        f"@app-db:5432/{quote(data['APP_DB_NAME'], safe='')}"
    )
    result['MONGODB_URI'] = (
        f"mongodb://{quote(data['MONGO_APP_USER'], safe='')}:{quote(data['MONGO_APP_PASSWORD'], safe='')}"
        f"@mongodb:27017/{quote(data['MONGO_APP_DB'], safe='')}?authSource={quote(data['MONGO_APP_DB'], safe='')}"
    )
    return result


def load(path: Path) -> dict[str, str]:
    if path.is_symlink() or not path.is_file():
        raise ConfigError('The runtime configuration must be an existing regular file, not a symlink.')
    details = path.stat()
    if stat.S_IMODE(details.st_mode) & 0o077:
        raise ConfigError('The runtime configuration must be private to its owner (chmod 600).')
    if details.st_uid != os.geteuid():
        raise ConfigError('The deployment user must own its runtime configuration file.')
    if details.st_size > 128 * 1024:
        raise ConfigError('The runtime configuration file is unexpectedly large.')
    return validate(parse_data(path.read_text(encoding='utf-8')))


def redact(text: str, data: dict[str, str]) -> str:
    values = {data.get(name, '') for name in SECRET_NAMES | {'DATABASE_URL', 'MONGODB_URI'}}
    for value in sorted((v for v in values if v), key=len, reverse=True):
        text = text.replace(value, '[REDACTED]')
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, required=True)
    args = parser.parse_args()
    try:
        data = load(args.env_file)
    except (OSError, ConfigError) as error:
        print(f'Configuration rejected: {error}', file=sys.stderr)
        return 1
    print(f'Configuration valid: {len(REQUIRED)} required names present. Values were not printed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
