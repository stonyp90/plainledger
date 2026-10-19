#!/bin/sh
# Runs over an authenticated SSH session on the pre-provisioned Oracle VM.
# Arguments and the archive are validated before extraction or deployment.
set -eu
umask 077

python3 - "$@" <<'PY'
import hashlib
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

if len(sys.argv) != 6:
    raise SystemExit('Expected base directory, commit SHA, archive SHA256, phase and initialization flag.')
base_arg, revision, expected, phase, initialize = sys.argv[1:]
if not re.fullmatch(r'/[A-Za-z0-9_/-]+', base_arg) or '..' in PurePosixPath(base_arg).parts:
    raise SystemExit('Unsafe deployment base directory.')
if not re.fullmatch(r'[a-f0-9]{40}', revision) or not re.fullmatch(r'[a-f0-9]{64}', expected):
    raise SystemExit('Invalid release identity.')
if phase not in ('prepare', 'activate') or initialize not in ('true', 'false'):
    raise SystemExit('Invalid deployment phase or initialization flag.')
base = Path(base_arg)
archive = base / 'incoming' / f'{revision}.tar.gz'
if archive.is_symlink() or not archive.is_file():
    raise SystemExit('Source archive is absent or is a symlink.')
hasher = hashlib.sha256()
with archive.open('rb') as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b''):
        hasher.update(chunk)
if hasher.hexdigest() != expected:
    raise SystemExit('Source archive SHA256 does not match; nothing was extracted.')
releases = base / 'releases'
releases.mkdir(mode=0o700, parents=True, exist_ok=True)
release = releases / revision
marker = release / '.source-archive-sha256'
if release.exists():
    if release.is_symlink() or not marker.is_file() or marker.read_text().strip() != expected:
        raise SystemExit('Existing release identity differs; immutable release will not be overwritten.')
else:
    staging = Path(tempfile.mkdtemp(prefix=f'.{revision}-', dir=releases))
    try:
        with tarfile.open(archive, 'r:gz') as source:
            members = source.getmembers()
            if len(members) > 50000 or sum(item.size for item in members) > 2 * 1024 ** 3:
                raise SystemExit('Source archive exceeds the deployment size limit.')
            for member in members:
                name = PurePosixPath(member.name)
                if name.is_absolute() or '..' in name.parts or not (member.isfile() or member.isdir()):
                    raise SystemExit('Source archive contains an unsafe path or link.')
                if any(part in ('.git', 'node_modules', '.env', 'runtime.env') for part in name.parts):
                    raise SystemExit('Source archive contains runtime material that must not be shipped.')
            # All entries are now checked as ordinary files/directories under staging.
            # Extract individually for Python 3.10 compatibility; do not follow links.
            for member in members:
                target = staging / member.name
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                    target.chmod(0o755)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    stream = source.extractfile(member)
                    if stream is None:
                        raise SystemExit('Unable to read source archive member.')
                    with stream, target.open('xb') as output:
                        shutil.copyfileobj(stream, output)
                    target.chmod(0o755 if member.mode & 0o111 else 0o644)
        if not (staging / 'deploy/oracle/scripts/deploy.py').is_file():
            raise SystemExit('Source archive does not contain the Oracle deployment implementation.')
        (staging / '.source-archive-sha256').write_text(expected + '\n')
        staging.rename(release)
    finally:
        if staging.exists():
            shutil.rmtree(staging)

command = [sys.executable, str(release / 'deploy/oracle/scripts/deploy.py'),
           '--env-file', str(base / 'shared/runtime.env'), '--release', revision, '--phase', phase]
if initialize == 'true':
    command.append('--initialize-empty-database')
raise SystemExit(subprocess.call(command))
PY
