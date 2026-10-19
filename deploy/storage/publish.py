#!/usr/bin/env python3
"""Validate or publish the exact storage images qualified by current-main CI."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil

from build import ROOT, PINS_FILE, digest_file, read_pins, run

COMPONENTS = ('minio', 'mc')
ARCHITECTURES = ('amd64', 'arm64')
DIGEST = re.compile(r'sha256:[a-f0-9]{64}')


def require_publication_context(source_sha):
    expected = {'CI': 'true', 'GITHUB_ACTIONS': 'true',
                'GITHUB_REPOSITORY': 'stonyp90/plainledger',
                'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_REF': 'refs/heads/main'}
    if any(os.environ.get(name) != value for name, value in expected.items()):
        raise ValueError('Storage publication requires manual main dispatch in the owned repository')
    if os.environ.get('DOCKER_HOST') or os.environ.get('DOCKER_CONTEXT'):
        raise ValueError('Alternate Docker endpoints are not permitted for publication')
    if not re.fullmatch(r'[a-f0-9]{40}', source_sha) or run(['git', 'rev-parse', 'HEAD'], capture=True) != source_sha:
        raise ValueError('Publication must use the exact trusted source checkout')


def read_json(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError('Qualification evidence must be a regular file: ' + path.name)
    return json.loads(path.read_text())


def require_checks(checks, minimum, exact=False):
    if not isinstance(checks, list) or len(checks) < minimum or (exact and len(checks) != minimum):
        raise ValueError('Required qualification checks are missing')
    names = []
    for check in checks:
        if (not isinstance(check, dict) or check.get('status') != 'passed'
                or not isinstance(check.get('name'), str) or not check['name'].strip()):
            raise ValueError('Every qualification check must have passed')
        names.append(check['name'])
    if len(set(names)) != len(names):
        raise ValueError('Duplicate check names cannot stand in for missing qualification')


def validate_artifacts(directory, source_sha, run_id, run_attempt):
    if (not re.fullmatch(r'[a-f0-9]{40}', source_sha)
            or type(run_id) is not int or run_id < 1
            or type(run_attempt) is not int or run_attempt < 1):
        raise ValueError('A full source revision, verification run and attempt are required')
    pins, pins_sha = read_pins(), digest_file(PINS_FILE)
    records = {}
    for architecture in ARCHITECTURES:
        folder = directory / architecture
        if folder.is_symlink() or not folder.is_dir():
            raise ValueError('Both native qualification artifacts are required')
        record = read_json(folder / 'qualification.json')
        expected = {'schema': 1, 'source_sha': source_sha, 'architecture': architecture,
                    'run_id': run_id, 'run_attempt': run_attempt, 'qualified': True,
                    'pins_sha256': pins_sha, 'pins': pins, 'archive': 'storage-images.tar.gz'}
        if (type(record.get('run_id')) is not int or type(record.get('run_attempt')) is not int
                or record.get('qualified') is not True
                or any(record.get(key) != value for key, value in expected.items())):
            raise ValueError('Qualification does not match the exact source, attempt, architecture or reviewed pins')
        if read_json(folder / 'pins.json') != pins or digest_file(folder / 'pins.json') != pins_sha:
            raise ValueError('Artifact pins differ from the trusted source checkout')
        archive = folder / record['archive']
        if archive.is_symlink() or not archive.is_file() or digest_file(archive) != record.get('archive_sha256'):
            raise ValueError('The qualified image archive was changed or is missing')
        require_checks(record.get('runtime_checks'), 2, exact=True)
        require_checks(record.get('permission_checks'), 9, exact=True)
        require_checks(record.get('accounting_checks'), 14)
        accounting = read_json(folder / 'accounting-results.json')
        if accounting.get('liveProviderCalls') is not False or accounting.get('checks') != record['accounting_checks']:
            raise ValueError('Real accounting evidence is missing or was replaced')
        if set(record.get('images', {})) != set(COMPONENTS):
            raise ValueError('Both qualified storage images are required')
        for name in COMPONENTS:
            component, image = pins['components'][name], record['images'][name]
            if (image.get('tag') != f'plainledger-storage-{name}:{source_sha}-{architecture}'
                    or not DIGEST.fullmatch(image.get('id', ''))
                    or image.get('upstream_commit') != component['commit']):
                raise ValueError('Unrecognized qualified image identity or upstream revision')
            for filename in ('LICENSE', 'CREDITS', 'NOTICE', 'SOURCE'):
                path = folder / name / 'licenses' / filename
                if path.is_symlink() or not path.is_file() or path.stat().st_size == 0:
                    raise ValueError('Upstream license/source evidence is incomplete')
            source = (folder / name / 'licenses/SOURCE').read_text().strip()
            if source != f"https://{component['module']}/tree/{component['commit']}":
                raise ValueError('Artifact upstream source differs from the reviewed source')
            module = read_json(folder / name / 'provenance/module.json')
            if module.get('Path') != component['module'] or not module.get('Version', '').endswith(component['commit'][:12]):
                raise ValueError('Go module provenance differs from the reviewed upstream commit')
            for filename in ('go-build.txt', 'binary.sha256'):
                path = folder / name / 'provenance' / filename
                if path.is_symlink() or not path.is_file() or path.stat().st_size == 0:
                    raise ValueError('Compiler/binary provenance is missing')
        records[architecture] = record
    return records


def validate_loaded_image(image, record, name, info):
    pins = record['pins']
    labels = {'org.opencontainers.image.source': 'https://github.com/stonyp90/plainledger',
              'org.opencontainers.image.revision': record['source_sha'],
              'org.opencontainers.image.licenses': 'AGPL-3.0-or-later',
              'org.plainledger.storage.upstream': pins['components'][name]['commit'],
              'org.plainledger.storage.pins': record['pins_sha256'],
              'org.plainledger.storage.component': name}
    config = info.get('Config', {})
    if (info.get('Id') != image['id'] or info.get('Architecture') != record['architecture']
            or info.get('Os') != 'linux' or config.get('User') != '10001:10001'
            or config.get('Entrypoint') != [name]
            or any(config.get('Labels', {}).get(key) != value for key, value in labels.items())):
        raise ValueError('Loaded image differs from the native qualified image and its provenance')


def verify_images(directory, records, load):
    for architecture, record in records.items():
        if load:
            run(['docker', 'load', '--input', str(directory / architecture / record['archive'])], capture=True)
        for name, image in record['images'].items():
            info = json.loads(run(['docker', 'image', 'inspect', image['tag']], capture=True))
            if not isinstance(info, list) or len(info) != 1:
                raise ValueError('The exact qualified image is unavailable')
            validate_loaded_image(image, record, name, info[0])


def push_digest(output):
    matches = re.findall(r'\bdigest: (sha256:[a-f0-9]{64})\b', output)
    if len(set(matches)) != 1:
        raise ValueError('Registry push did not return one verifiable image manifest digest')
    return matches[0]


def validate_registry_index(index, manifests):
    descriptors = index.get('manifests')
    if index.get('schemaVersion') != 2 or not isinstance(descriptors, list) or len(descriptors) != 2:
        raise ValueError('Published index must contain both qualified native platforms')
    actual = {}
    for item in descriptors:
        platform = item.get('platform', {})
        architecture = platform.get('architecture')
        if platform.get('os') != 'linux' or architecture not in ARCHITECTURES or architecture in actual:
            raise ValueError('Published index has an unexpected or duplicate platform')
        actual[architecture] = item.get('digest')
    if actual != manifests:
        raise ValueError('Published index references images that were not qualified')


def publish(directory, records, output):
    # Called only after the workflow rechecks current-main quality and exact run/attempt.
    # These are the already loaded qualified images. This script never builds an image.
    sample = records['amd64']
    release = f"sha-{sample['source_sha']}-verify-{sample['run_id']}-{sample['run_attempt']}"
    published = {'schema': 1, 'source_sha': sample['source_sha'], 'verification_run_id': sample['run_id'],
                 'verification_run_attempt': sample['run_attempt'], 'pins_sha256': sample['pins_sha256'],
                 'qualification_archives': {arch: data['archive_sha256'] for arch, data in records.items()}, 'images': {}}
    for name in COMPONENTS:
        repository = sample['pins']['components'][name]['repository']
        manifests = {}
        for architecture, record in records.items():
            image = record['images'][name]
            tag = f'{repository}:{release}-{architecture}'
            run(['docker', 'tag', image['id'], tag])
            digest = push_digest(run(['docker', 'image', 'push', tag], capture=True))
            remote = json.loads(run(['docker', 'manifest', 'inspect', repository + '@' + digest], capture=True))
            if remote.get('config', {}).get('digest') != image['id']:
                raise ValueError('Registry image configuration differs from the qualified image ID')
            manifests[architecture] = digest
        tag = repository + ':' + release
        run(['docker', 'manifest', 'create', tag, *[repository + '@' + manifests[arch] for arch in ARCHITECTURES]], capture=True)
        pushed = run(['docker', 'manifest', 'push', '--purge', tag], capture=True)
        digests = re.findall(r'^sha256:[a-f0-9]{64}$', pushed, re.MULTILINE)
        if len(set(digests)) != 1:
            raise ValueError('Registry did not return one immutable platform index digest')
        reference = repository + '@' + digests[0]
        index = json.loads(run(['docker', 'manifest', 'inspect', reference], capture=True))
        validate_registry_index(index, manifests)
        # Pull each platform by the final index digest. Docker verifies content hashes;
        # the configuration ID must still be the exact ID qualified on that native runner.
        for architecture, record in records.items():
            run(['docker', 'pull', '--platform', 'linux/' + architecture, reference], capture=True)
            info = json.loads(run(['docker', 'image', 'inspect', record['images'][name]['id']], capture=True))[0]
            validate_loaded_image(record['images'][name], record, name, info)
        published['images'][name] = {'reference': reference, 'platform_manifests': manifests,
                                    'qualified_image_ids': {arch: record['images'][name]['id'] for arch, record in records.items()}}
    output.mkdir(parents=True, exist_ok=True)
    (output / 'publication.json').write_text(json.dumps(published, indent=2) + '\n')
    (output / 'storage-images.env').write_text('MINIO_IMAGE=' + published['images']['minio']['reference'] + '\n'
                                              + 'MINIO_CLIENT_IMAGE=' + published['images']['mc']['reference'] + '\n')
    for architecture in ARCHITECTURES:
        shutil.copyfile(directory / architecture / 'qualification.json', output / (architecture + '-qualification.json'))
    for name, image in published['images'].items():
        print(name + ': ' + image['reference'])
    return published


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('verify', 'publish'))
    parser.add_argument('--artifacts', required=True, type=Path)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--verification-run-id', required=True, type=int)
    parser.add_argument('--verification-run-attempt', required=True, type=int)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    require_publication_context(args.source_sha)
    records = validate_artifacts(args.artifacts, args.source_sha, args.verification_run_id, args.verification_run_attempt)
    verify_images(args.artifacts, records, load=args.mode == 'verify')
    if args.mode == 'publish':
        if args.output is None:
            raise ValueError('Publication evidence output is required')
        publish(args.artifacts, records, args.output)
    else:
        print('Both native image archives match the exact source, verification run/attempt, pins and passed checks.')


if __name__ == '__main__':
    main()
