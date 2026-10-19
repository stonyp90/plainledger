#!/usr/bin/env python3
"""Build official pinned storage sources on this native CI architecture."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PINS_FILE = Path(__file__).with_name('pins.json')


def digest_file(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def run(arguments, *, capture=False, environment=None, timeout=900):
    result = subprocess.run(arguments, cwd=ROOT, env=environment, check=True,
                            text=True, stdout=subprocess.PIPE if capture else None,
                            timeout=timeout)
    return result.stdout.strip() if capture else None


def read_pins():
    pins = json.loads(PINS_FILE.read_text())
    if pins.get('schema') != 1 or pins.get('platforms') != ['amd64', 'arm64']:
        raise ValueError('Unreviewed storage platform configuration')
    if not re.fullmatch(r'curlimages/curl-base:[0-9.]+@sha256:[a-f0-9]{64}', pins['runtime_image']):
        raise ValueError('Storage runtime must be a digest-pinned official curl base')
    if set(pins['components']) != {'minio', 'mc'}:
        raise ValueError('Only the reviewed MinIO server and client can be built')
    for name, component in pins['components'].items():
        if component['module'] != f'github.com/minio/{name}' or not re.fullmatch(r'[a-f0-9]{40}', component['commit']):
            raise ValueError('Storage source must be an exact official MinIO commit')
        expected = 'golang:' + component['go_version'] + '-alpine@sha256:'
        if not component['builder_image'].startswith(expected) or not re.fullmatch(r'[a-f0-9]{64}', component['builder_image'][len(expected):]):
            raise ValueError('Compiler must use the reviewed version and official image digest')
        if component['repository'] != f'ghcr.io/stonyp90/plainledger-{name}':
            raise ValueError('Unexpected storage publication namespace')
    return pins


def native_architecture():
    architecture = {'x86_64': 'amd64', 'aarch64': 'arm64'}.get(platform.machine())
    if platform.system() != 'Linux' or architecture is None:
        raise ValueError('Qualification requires a native Linux amd64 or arm64 runner')
    return architecture


def build_images(source_sha, output):
    if not re.fullmatch(r'[a-f0-9]{40}', source_sha):
        raise ValueError('A full source revision is required')
    if run(['git', 'rev-parse', 'HEAD'], capture=True) != source_sha:
        raise ValueError('Checkout does not match the requested source revision')
    pins = read_pins()
    architecture = native_architecture()
    output.mkdir(parents=True, exist_ok=True)
    images = {}
    for name, component in pins['components'].items():
        tag = f'plainledger-storage-{name}:{source_sha}-{architecture}'
        arguments = ['docker', 'build', '--pull', '--progress=plain', '--platform', 'linux/' + architecture,
                     '--target', component['target'], '--tag', tag,
                     '--label', 'org.opencontainers.image.source=https://github.com/stonyp90/plainledger',
                     '--label', 'org.opencontainers.image.revision=' + source_sha,
                     '--label', 'org.opencontainers.image.licenses=AGPL-3.0-or-later',
                     '--label', 'org.plainledger.storage.upstream=' + component['commit'],
                     '--label', 'org.plainledger.storage.pins=' + digest_file(PINS_FILE),
                     '--label', 'org.plainledger.storage.component=' + name]
        build_args = {
            'BUILDER_IMAGE': component['builder_image'], 'RUNTIME_IMAGE': pins['runtime_image'],
            'MODULE': component['module'], 'SOURCE_COMMIT': component['commit'],
            'SOURCE_RELEASE': component['release'], 'SOURCE_TIME': component['source_time'],
            'GO_VERSION': component['go_version'], 'COMPONENT': name,
        }
        for key, value in build_args.items():
            arguments.extend(['--build-arg', f'{key}={value}'])
        arguments.append(str(Path(__file__).parent))
        run(arguments)
        info = json.loads(run(['docker', 'image', 'inspect', tag], capture=True))[0]
        if info['Architecture'] != architecture or info['Os'] != 'linux':
            raise ValueError('Built image architecture does not match this native runner')
        images[name] = {'tag': tag, 'id': info['Id'], 'upstream_commit': component['commit']}
        # Only controlled files are copied out; never collect container environment values.
        container = run(['docker', 'create', tag], capture=True)
        try:
            destination = output / name
            destination.mkdir()
            run(['docker', 'cp', container + ':/opt/plainledger-storage/provenance', str(destination)])
            run(['docker', 'cp', container + ':/opt/plainledger-storage/licenses', str(destination)])
        finally:
            run(['docker', 'rm', '-v', container], capture=True)
    manifest = {'schema': 1, 'source_sha': source_sha, 'architecture': architecture,
                'pins_sha256': digest_file(PINS_FILE), 'pins': pins, 'images': images}
    (output / 'build.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    build_images(arguments.source_sha, arguments.output.resolve())


if __name__ == '__main__':
    main()
