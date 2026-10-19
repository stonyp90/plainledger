#!/usr/bin/env python3
"""Qualify built storage containers using the real production initializer and S3 harness."""
import argparse
import gzip
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

from build import ROOT, PINS_FILE, build_images, digest_file, run

FIXTURE = ROOT / 'fixtures/storage/isolated-packaging.json'


def fixture_environment():
    if (os.environ.get('CI') != 'true' or os.environ.get('GITHUB_ACTIONS') != 'true'
            or os.environ.get('GITHUB_REPOSITORY') != 'stonyp90/plainledger'):
        raise ValueError('Refusing storage containers outside this repository’s disposable GitHub CI')
    if os.environ.get('DOCKER_HOST') or os.environ.get('DOCKER_CONTEXT'):
        raise ValueError('Remote or alternate Docker endpoints are not permitted for qualification')
    fixture = json.loads(FIXTURE.read_text())
    environment = dict(os.environ)
    environment.update({
        'MINIO_ROOT_USER': fixture['rootAccessKey'], 'MINIO_ROOT_PASSWORD': fixture['rootSecretKey'],
        'MINIO_APP_ACCESS_KEY': fixture['appAccessKey'], 'MINIO_APP_SECRET_KEY': fixture['appSecretKey'],
        'AWS_ACCESS_KEY_ID': fixture['appAccessKey'], 'AWS_SECRET_ACCESS_KEY': fixture['appSecretKey'],
        'S3_ENDPOINT': fixture['endpoint'], 'S3_REGION': fixture['region'],
    })
    for name, bucket in fixture['buckets'].items():
        environment['S3_BUCKET_' + name] = bucket
    if not environment.get('GITHUB_RUN_ID', '').isdigit() or not environment.get('GITHUB_RUN_ATTEMPT', '').isdigit():
        raise ValueError('Qualification evidence must identify a real workflow run and attempt')
    return environment


def wait_for_container(name):
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        health = run(['docker', 'inspect', '--format', '{{.State.Health.Status}}', name], capture=True)
        if health == 'healthy':
            return
        if health == 'unhealthy':
            raise RuntimeError('Built storage container failed its curl readiness healthcheck')
        time.sleep(2)
    raise TimeoutError('Built storage container did not become ready')



def wait_for_host(environment):
    target = environment['S3_ENDPOINT'] + '/minio/health/ready'
    try:
        run(['node', 'e2e/wait-for-http.cjs', target], environment=environment, timeout=195)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        raise RuntimeError('Host storage readiness failed at ' + target +
                           '; inspect test-results/runtime/plainledger-s3.log for health and loopback port mappings') from error


def qualify(source_sha, output):
    environment = fixture_environment()
    manifest = build_images(source_sha, output)
    architecture = manifest['architecture']
    suffix = f"{environment['GITHUB_RUN_ID']}-{environment['GITHUB_RUN_ATTEMPT']}-{architecture}"
    server = 'plainledger-storage-ci-' + suffix
    network, volume = server + '-net', server + '-data'
    started = []
    evidence = output / 'qualified'
    evidence.mkdir()
    runtime_checks = []
    try:
        # The SDK/accounting harness runs on the host. Internal-only bridge
        # networks do not supply the localhost published-port path it requires.
        # Every published port stays restricted to this disposable runner's loopback.
        run(['docker', 'network', 'create', '--driver', 'bridge', '--opt',
             'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', network], capture=True)
        started.append(('network', network))
        run(['docker', 'volume', 'create', volume], capture=True)
        started.append(('volume', volume))
        arguments = ['docker', 'run', '-d', '--name', server, '--network', network,
                     '--network-alias', 'minio', '--publish', '127.0.0.1:19000:9000',
                     '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--read-only',
                     '--tmpfs', '/tmp:rw,nosuid,noexec,size=64m,uid=10001,gid=10001',
                     '--mount', f'type=volume,source={volume},target=/data',
                     '--env', 'MINIO_ROOT_USER', '--env', 'MINIO_ROOT_PASSWORD', '--env', 'MINIO_BROWSER=off',
                     '--health-cmd', 'curl -fsS --connect-timeout 2 --max-time 4 http://127.0.0.1:9000/minio/health/ready',
                     '--health-interval', '2s', '--health-timeout', '5s', '--health-retries', '30',
                     '--health-start-period', '5s', manifest['images']['minio']['tag']]
        run(arguments, capture=True, environment=environment)
        started.append(('container', server))
        wait_for_container(server)
        wait_for_host(environment)
        for name, image in manifest['images'].items():
            check = ['docker', 'run', '--rm', '--network', 'none', '--read-only',
                     '--entrypoint', '/bin/sh', image['tag'], '-ec',
                     'test "$(id -u)" = 10001; command -v curl; command -v cat; command -v rm; '
                     'test -s /opt/plainledger-storage/licenses/LICENSE; '
                     'test -s /opt/plainledger-storage/licenses/CREDITS; '
                     'test -s /opt/plainledger-storage/licenses/NOTICE; '
                     'test -s /opt/plainledger-storage/licenses/SOURCE; '
                     'test -s /opt/plainledger-storage/provenance/module.json; ' + name + ' --version']
            run(check, capture=True)
        runtime_checks.append({'name': 'native images run without root and preserve utilities, licenses and build evidence', 'status': 'passed'})
        init = ['docker', 'run', '--rm', '--network', network, '--read-only', '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges:true',
                '--tmpfs', '/tmp:rw,nosuid,noexec,size=32m,uid=10001,gid=10001',
                '--mount', 'type=bind,source=' + str(ROOT / 'deploy/oracle/init/storage.sh') + ',target=/init/storage.sh,readonly',
                '--entrypoint', '/bin/sh']
        for name in ['MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD', 'MINIO_APP_ACCESS_KEY', 'MINIO_APP_SECRET_KEY']:
            init.extend(['--env', name])
        for name in ['BRONZE', 'SILVER', 'GOLD', 'UPLOADS', 'DOCUMENT_SHARE']:
            init.extend(['--env', 'S3_BUCKET_' + name])
        init.extend([manifest['images']['mc']['tag'], '/init/storage.sh'])
        # The production script must succeed unchanged, including an idempotent rerun.
        run(init, environment=environment)
        run(init, environment=environment)
        runtime_checks.append({'name': 'production storage.sh initializes buckets and application IAM idempotently', 'status': 'passed'})
        checks = []
        for stage in ['before-restart', 'after-restart']:
            if stage == 'after-restart':
                run(['docker', 'restart', server], capture=True)
                wait_for_container(server)
                wait_for_host(environment)
            result_file = output / (stage + '.json')
            run(['node', 'deploy/storage/qualify-permissions.cjs', stage, str(result_file)], environment=environment)
            checks.extend(json.loads(result_file.read_text())['checks'])
        if len(checks) != 9 or any(check['status'] != 'passed' for check in checks):
            raise ValueError('All nine container policy/persistence checks are required')
        run(['node', 'e2e/datalake-real-storage.cjs'], environment=environment)
        accounting_path = ROOT / 'test-results/datalake-storage-results.json'
        accounting = json.loads(accounting_path.read_text())
        if len(accounting['checks']) < 14 or any(check['status'] != 'passed' for check in accounting['checks']):
            raise ValueError('The complete real accounting/storage harness is required')
        if accounting.get('liveProviderCalls') is not False:
            raise ValueError('Qualification must not invoke customer accounting providers')
        archive = evidence / 'storage-images.tar.gz'
        # Stream the exact qualified images; no rebuild can be substituted during publication.
        process = subprocess.Popen(['docker', 'save', *[image['tag'] for image in manifest['images'].values()]], stdout=subprocess.PIPE)
        try:
            with archive.open('wb') as raw, gzip.GzipFile(filename='', fileobj=raw, mode='wb', mtime=0, compresslevel=1) as compressed:
                shutil.copyfileobj(process.stdout, compressed)
            if process.wait(timeout=120) != 0:
                raise RuntimeError('Unable to archive qualified storage images')
        finally:
            if process.poll() is None:
                process.kill()
            process.stdout.close()
        qualification = {**manifest, 'run_id': int(environment['GITHUB_RUN_ID']),
                         'run_attempt': int(environment['GITHUB_RUN_ATTEMPT']),
                         'archive': archive.name, 'archive_sha256': digest_file(archive),
                         'runtime_checks': runtime_checks, 'permission_checks': checks,
                         'accounting_checks': accounting['checks'], 'qualified': True}
        (evidence / 'qualification.json').write_text(json.dumps(qualification, indent=2) + '\n')
        shutil.copyfile(PINS_FILE, evidence / 'pins.json')
        shutil.copyfile(accounting_path, evidence / 'accounting-results.json')
        for name in manifest['images']:
            shutil.copytree(output / name, evidence / name)
        print(f'Qualified exact {architecture} storage images: 2 runtime, 9 permission/persistence and {len(accounting["checks"])} accounting checks.')
    finally:
        if ('container', server) in started:
            log = ROOT / 'test-results/runtime/plainledger-s3.log'
            log.parent.mkdir(parents=True, exist_ok=True)
            with log.open('w') as stream:
                subprocess.run(['docker', 'inspect', '--format',
                                'status={{.State.Status}} health={{.State.Health.Status}} ports={{json .NetworkSettings.Ports}}', server],
                               stdout=stream, stderr=subprocess.STDOUT, check=False)
                subprocess.run(['docker', 'logs', server], stdout=stream, stderr=subprocess.STDOUT, check=False)
        for kind, name in reversed(started):
            command = ['docker', 'rm', '-f', name] if kind == 'container' else ['docker', kind, 'rm', name]
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    qualify(arguments.source_sha, arguments.output.resolve())


if __name__ == '__main__':
    main()
