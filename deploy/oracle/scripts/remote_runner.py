#!/usr/bin/env python3
"""Upload an exact Git source archive over pinned SSH; secrets remain on the host."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import subprocess
import sys
import tempfile


class PreflightError(ValueError):
    pass


def settings(environment: dict[str, str]) -> dict[str, str]:
    names = ('ORACLE_HOST', 'ORACLE_SSH_USER', 'ORACLE_BASE_DIR',
             'ORACLE_SSH_PRIVATE_KEY', 'ORACLE_SSH_KNOWN_HOSTS')
    if environment.get('ORACLE_DEPLOY_ENABLED') != 'true':
        raise PreflightError('ORACLE_DEPLOY_ENABLED must explicitly be true for this target.')
    missing = [name for name in names if not environment.get(name)]
    if missing:
        raise PreflightError('Missing required deployment names: ' + ', '.join(missing))
    result = {name: environment[name] for name in names}
    if not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?', result['ORACLE_HOST']):
        raise PreflightError('ORACLE_HOST must be a DNS hostname or IPv4 address, without SSH options.')
    if not re.fullmatch(r'[a-z_][a-z0-9_-]{0,31}', result['ORACLE_SSH_USER']):
        raise PreflightError('ORACLE_SSH_USER has an invalid format.')
    base = result['ORACLE_BASE_DIR']
    if not re.fullmatch(r'/[A-Za-z0-9_/-]+', base) or '..' in PurePosixPath(base).parts or base == '/':
        raise PreflightError('ORACLE_BASE_DIR must be a dedicated absolute deployment directory.')
    port = environment.get('ORACLE_SSH_PORT', '22')
    if not port.isdigit() or not 1 <= int(port) <= 65535:
        raise PreflightError('ORACLE_SSH_PORT must be a valid TCP port.')
    result['ORACLE_SSH_PORT'] = port
    return result


def checked(command: list[str], **kwargs) -> subprocess.CompletedProcess:
    result = subprocess.run(command, **kwargs)
    if result.returncode:
        raise RuntimeError(f'{command[0]} exited with status {result.returncode}.')
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase', choices=('prepare', 'activate'), default='prepare')
    parser.add_argument('--initialize-empty-database', action='store_true')
    args = parser.parse_args()
    try:
        config = settings(dict(os.environ))
        if os.environ.get('GITHUB_REF') != 'refs/heads/main':
            raise PreflightError('Production deployment requires the main branch workflow context.')
        repo = Path(__file__).resolve().parents[3]
        revision = checked(['git', 'rev-parse', 'HEAD'], cwd=repo, capture_output=True, text=True).stdout.strip()
        if not re.fullmatch(r'[a-f0-9]{40}', revision) or revision != os.environ.get('GITHUB_SHA'):
            raise PreflightError('Checked-out source revision must match the workflow commit SHA.')
        checked(['git', 'diff', '--quiet'], cwd=repo)
        checked(['git', 'diff', '--cached', '--quiet'], cwd=repo)
        for executable in ('git', 'ssh', 'scp', 'ssh-keygen'):
            if not shutil.which(executable):
                raise PreflightError(f'Required executable is unavailable: {executable}.')
        with tempfile.TemporaryDirectory(prefix='plainledger-oracle-') as temporary:
            staging = Path(temporary)
            key = staging / 'id_deploy'
            known_hosts = staging / 'known_hosts'
            key.write_text(config['ORACLE_SSH_PRIVATE_KEY'].rstrip() + '\n')
            known_hosts.write_text(config['ORACLE_SSH_KNOWN_HOSTS'].rstrip() + '\n')
            key.chmod(0o600)
            known_hosts.chmod(0o600)
            host = config['ORACLE_HOST']
            port = config['ORACLE_SSH_PORT']
            lookup = host if port == '22' else f'[{host}]:{port}'
            result = subprocess.run(['ssh-keygen', '-F', lookup, '-f', str(known_hosts)], capture_output=True)
            if result.returncode:
                raise PreflightError('Pinned known_hosts does not contain the selected host and port.')
            archive = staging / f'{revision}.tar.gz'
            print('Packaging the exact committed source revision.', flush=True)
            with archive.open('wb') as output, gzip.GzipFile(fileobj=output, mode='wb', filename='', mtime=0) as compressed:
                process = subprocess.Popen(['git', 'archive', '--format=tar', revision], cwd=repo, stdout=subprocess.PIPE)
                assert process.stdout is not None
                shutil.copyfileobj(process.stdout, compressed)
                process.stdout.close()
                if process.wait() != 0:
                    raise RuntimeError('Git source archive creation failed.')
            digest = hashlib.sha256()
            with archive.open('rb') as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                    digest.update(chunk)
            options = ['-i', str(key), '-o', f'UserKnownHostsFile={known_hosts}',
                       '-o', 'StrictHostKeyChecking=yes', '-o', 'IdentitiesOnly=yes',
                       '-o', 'BatchMode=yes', '-o', 'PasswordAuthentication=no',
                       '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=15',
                       '-o', 'ServerAliveCountMax=4']
            destination = config['ORACLE_SSH_USER'] + '@' + host
            base = config['ORACLE_BASE_DIR']
            print('Checking the pinned Oracle host and uploading the source archive.', flush=True)
            prepare = 'umask 077; mkdir -p ' + ' '.join(shlex.quote(base + '/' + name) for name in ('incoming', 'releases', 'shared'))
            checked(['ssh', *options, '-p', port, destination, prepare], timeout=30)
            checked(['scp', *options, '-P', port, str(archive), destination + ':' + base + '/incoming/' + archive.name], timeout=300)
            receiver = repo / 'deploy/oracle/scripts/receive-release.sh'
            remote_args = [base, revision, digest.hexdigest(), args.phase,
                           'true' if args.initialize_empty_database else 'false']
            command = 'sh -s -- ' + ' '.join(shlex.quote(value) for value in remote_args)
            print(f'Running the {args.phase} phase for revision {revision}.', flush=True)
            with receiver.open('rb') as stream:
                checked(['ssh', *options, '-p', port, destination, command], stdin=stream, timeout=3600)
        return 0
    except (OSError, PreflightError, RuntimeError, subprocess.SubprocessError) as error:
        # No secret values are included in these exception messages.
        print(f'Oracle deployment stopped: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
