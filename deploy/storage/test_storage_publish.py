"""Publication must reject stale, incomplete or substituted qualification evidence."""
import copy
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build
import publish


class StoragePublicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.sha = 'a' * 40
        self.run_id, self.attempt = 123456, 2
        self.pins = build.read_pins()
        self.records = {}
        for offset, architecture in enumerate(publish.ARCHITECTURES):
            folder = self.directory / architecture
            folder.mkdir()
            archive = folder / 'storage-images.tar.gz'
            archive.write_bytes(b'unit fixture for archived native images ' + architecture.encode())
            (folder / 'pins.json').write_bytes(build.PINS_FILE.read_bytes())
            images = {}
            for index, name in enumerate(publish.COMPONENTS):
                component = self.pins['components'][name]
                images[name] = {'id': 'sha256:' + str(1 + offset * 2 + index) * 64,
                                'tag': f'plainledger-storage-{name}:{self.sha}-{architecture}',
                                'upstream_commit': component['commit']}
                licenses, provenance = folder / name / 'licenses', folder / name / 'provenance'
                licenses.mkdir(parents=True)
                provenance.mkdir()
                for filename in ('LICENSE', 'CREDITS', 'NOTICE'):
                    (licenses / filename).write_text('Synthetic license evidence for validator unit tests.\n')
                (licenses / 'SOURCE').write_text(f"https://{component['module']}/tree/{component['commit']}\n")
                (provenance / 'module.json').write_text(json.dumps({'Path': component['module'],
                    'Version': 'v0.0.0-20250101000000-' + component['commit'][:12]}))
                (provenance / 'go-build.txt').write_text('/out/bin/' + name + ': go' + component['go_version'] + '\n')
                (provenance / 'binary.sha256').write_text('0' * 64 + '  /out/bin/' + name + '\n')
            record = {'schema': 1, 'source_sha': self.sha, 'architecture': architecture,
                      'run_id': self.run_id, 'run_attempt': self.attempt, 'qualified': True,
                      'pins_sha256': build.digest_file(build.PINS_FILE), 'pins': self.pins,
                      'archive': archive.name, 'archive_sha256': build.digest_file(archive), 'images': images}
            for key, count in [('runtime_checks', 2), ('permission_checks', 9), ('accounting_checks', 14)]:
                record[key] = [{'name': f'{key} case {index + 1}', 'status': 'passed'} for index in range(count)]
            (folder / 'accounting-results.json').write_text(json.dumps({'liveProviderCalls': False, 'checks': record['accounting_checks']}))
            self.records[architecture] = record
            self.write_record(architecture, record)

    def write_record(self, architecture, record):
        (self.directory / architecture / 'qualification.json').write_text(json.dumps(record))

    def validate(self):
        return publish.validate_artifacts(self.directory, self.sha, self.run_id, self.attempt)

    def image_info(self, architecture, name):
        record = self.records[architecture]
        return {'Id': record['images'][name]['id'], 'Architecture': architecture, 'Os': 'linux',
                'Config': {'User': '10001:10001', 'Entrypoint': [name], 'Labels': {
                    'org.opencontainers.image.source': 'https://github.com/stonyp90/plainledger',
                    'org.opencontainers.image.revision': self.sha,
                    'org.opencontainers.image.licenses': 'AGPL-3.0-or-later',
                    'org.plainledger.storage.upstream': self.pins['components'][name]['commit'],
                    'org.plainledger.storage.pins': record['pins_sha256'],
                    'org.plainledger.storage.component': name}}}

    def test_both_native_artifacts_match_the_exact_source_and_attempt(self):
        self.assertEqual(set(self.validate()), {'amd64', 'arm64'})

    def test_other_repositories_refs_and_checkouts_cannot_publish(self):
        expected = {'CI': 'true', 'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': 'stonyp90/plainledger',
                    'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_REF': 'refs/heads/main'}
        for changes in [{'GITHUB_REPOSITORY': 'other/repository'}, {'GITHUB_REF': 'refs/heads/fix/test'},
                        {'GITHUB_EVENT_NAME': 'pull_request'}, {'DOCKER_HOST': 'ssh://production.invalid'}]:
            with self.subTest(changes=changes), patch.dict(os.environ, {**expected, **changes}, clear=True), patch.object(publish, 'run') as execute:
                with self.assertRaises(ValueError):
                    publish.require_publication_context(self.sha)
                execute.assert_not_called()
        with patch.dict(os.environ, expected, clear=True), patch.object(publish, 'run', return_value='b' * 40):
            with self.assertRaisesRegex(ValueError, 'checkout'):
                publish.require_publication_context(self.sha)

    def test_stale_run_attempt_source_pins_and_wrong_platform_are_rejected(self):
        for changes in [{'source_sha': 'b' * 40}, {'run_id': self.run_id - 1}, {'run_attempt': 1},
                        {'run_attempt': True}, {'architecture': 'amd64'}, {'pins_sha256': 'b' * 64},
                        {'qualified': 1}, {'archive': '../other-images.tar.gz'}]:
            record = {**self.records['arm64'], **changes}
            with self.subTest(changes=changes):
                self.write_record('arm64', record)
                with self.assertRaises(ValueError):
                    self.validate()
        self.write_record('arm64', self.records['arm64'])

    def test_altered_image_archive_cannot_be_substituted(self):
        (self.directory / 'arm64/storage-images.tar.gz').write_bytes(b'changed image')
        with self.assertRaisesRegex(ValueError, 'archive'):
            self.validate()

    def test_failed_missing_or_duplicate_checks_cannot_qualify(self):
        variations = []
        failed = copy.deepcopy(self.records['arm64'])
        failed['permission_checks'][0]['status'] = 'failed'
        variations.append(failed)
        missing = copy.deepcopy(self.records['arm64'])
        missing['accounting_checks'].pop()
        variations.append(missing)
        repeated = copy.deepcopy(self.records['arm64'])
        repeated['permission_checks'] = [repeated['permission_checks'][0]] * 9
        variations.append(repeated)
        for record in variations:
            with self.subTest(record=record['permission_checks'][0]):
                self.write_record('arm64', record)
                with self.assertRaises(ValueError):
                    self.validate()

    def test_licenses_and_official_module_provenance_are_required(self):
        path = self.directory / 'arm64/mc/licenses/NOTICE'
        original = path.read_text()
        path.write_text('')
        with self.assertRaisesRegex(ValueError, 'license'):
            self.validate()
        path.write_text(original)
        module = self.directory / 'arm64/mc/provenance/module.json'
        module.write_text(json.dumps({'Path': 'github.com/other/mc', 'Version': 'unreviewed'}))
        with self.assertRaisesRegex(ValueError, 'module provenance'):
            self.validate()

    def test_loaded_image_configuration_must_match_native_qualification(self):
        record = self.records['arm64']
        info = self.image_info('arm64', 'minio')
        publish.validate_loaded_image(record['images']['minio'], record, 'minio', info)
        variations = [{'Id': 'sha256:' + 'f' * 64}, {'Architecture': 'amd64'}, {'Os': 'windows'},
                      {'Config': {**info['Config'], 'User': '0'}},
                      {'Config': {**info['Config'], 'Entrypoint': ['other-binary']}},
                      {'Config': {**info['Config'], 'Labels': {}}}]
        for changes in variations:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                publish.validate_loaded_image(record['images']['minio'], record, 'minio', {**info, **changes})

    def test_registry_index_rejects_missing_wrong_duplicate_and_unqualified_platforms(self):
        manifests = {'amd64': 'sha256:' + '5' * 64, 'arm64': 'sha256:' + '6' * 64}
        correct = {'schemaVersion': 2, 'manifests': [
            {'digest': digest, 'platform': {'architecture': arch, 'os': 'linux'}} for arch, digest in manifests.items()]}
        publish.validate_registry_index(correct, manifests)
        for descriptors in [correct['manifests'][:1], [correct['manifests'][0]] * 2,
                            [{**correct['manifests'][0], 'digest': 'sha256:' + 'f' * 64}, correct['manifests'][1]],
                            [correct['manifests'][0], {**correct['manifests'][1], 'platform': {'architecture': 'arm64', 'os': 'windows'}}]]:
            with self.subTest(descriptors=descriptors), self.assertRaises(ValueError):
                publish.validate_registry_index({'schemaVersion': 2, 'manifests': descriptors}, manifests)

    def test_registry_push_requires_an_unambiguous_digest(self):
        digest = 'sha256:' + 'd' * 64
        self.assertEqual(publish.push_digest('tag: digest: ' + digest + ' size: 1234\n'), digest)
        for output in ['no digest', 'digest: ' + digest + '\ndigest: sha256:' + 'e' * 64]:
            with self.subTest(output=output), self.assertRaises(ValueError):
                publish.push_digest(output)

    def test_publication_uses_qualified_ids_and_preserves_both_native_manifest_digests(self):
        manifests = {name: {arch: 'sha256:' + str(5 + component * 2 + platform) * 64
                            for platform, arch in enumerate(publish.ARCHITECTURES)}
                     for component, name in enumerate(publish.COMPONENTS)}
        indices = {'minio': 'sha256:' + 'b' * 64, 'mc': 'sha256:' + 'c' * 64}
        calls = []
        def execute(arguments, **kwargs):
            calls.append(arguments)
            if arguments[:3] == ['docker', 'image', 'push']:
                name = 'minio' if '/plainledger-minio:' in arguments[3] else 'mc'
                arch = arguments[3].rsplit('-', 1)[1]
                return 'published: digest: ' + manifests[name][arch] + ' size: 1234\n'
            if arguments[:3] == ['docker', 'manifest', 'inspect']:
                reference = arguments[3]
                name = 'minio' if '/plainledger-minio@' in reference else 'mc'
                digest = reference.split('@')[1]
                if digest == indices[name]:
                    return json.dumps({'schemaVersion': 2, 'manifests': [
                        {'digest': value, 'platform': {'architecture': arch, 'os': 'linux'}}
                        for arch, value in manifests[name].items()]})
                arch = next(arch for arch, value in manifests[name].items() if value == digest)
                return json.dumps({'config': {'digest': self.records[arch]['images'][name]['id']}})
            if arguments[:3] == ['docker', 'manifest', 'push']:
                return indices['minio' if '/plainledger-minio:' in arguments[-1] else 'mc'] + '\n'
            if arguments[:3] == ['docker', 'image', 'inspect']:
                for arch, record in self.records.items():
                    for name, image in record['images'].items():
                        if image['id'] == arguments[3]:
                            return json.dumps([self.image_info(arch, name)])
            if arguments[:2] == ['docker', 'tag'] or arguments[:2] == ['docker', 'pull'] or arguments[:3] == ['docker', 'manifest', 'create']:
                return ''
            raise AssertionError('Unexpected command, including any rebuild: ' + repr(arguments))
        with patch.object(publish, 'run', side_effect=execute), patch('builtins.print'):
            result = publish.publish(self.directory, self.records, self.directory / 'published')
        for name in publish.COMPONENTS:
            self.assertEqual(result['images'][name]['platform_manifests'], manifests[name])
            self.assertTrue(result['images'][name]['reference'].endswith('@' + indices[name]))
        tagged_ids = {arguments[2] for arguments in calls if arguments[:2] == ['docker', 'tag']}
        self.assertEqual(tagged_ids, {image['id'] for record in self.records.values() for image in record['images'].values()})
        self.assertEqual(len([arguments for arguments in calls if arguments[:2] == ['docker', 'pull']]), 4)
        self.assertTrue((self.directory / 'published/storage-images.env').is_file())


if __name__ == '__main__':
    unittest.main()
