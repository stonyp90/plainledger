"""Focused qualification boundaries; actual image behavior is tested in native CI."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

DIRECTORY = Path(__file__).resolve().parent
sys.path.insert(0, str(DIRECTORY))
import build
import qualify


class StoragePackageTests(unittest.TestCase):
    def setUp(self):
        self.pins = json.loads(build.PINS_FILE.read_text())

    def test_official_pins_are_complete_for_both_native_platforms(self):
        pins = build.read_pins()
        self.assertEqual(pins['platforms'], ['amd64', 'arm64'])
        self.assertEqual(pins['components']['minio']['go_version'], '1.24.8')
        self.assertEqual(pins['components']['mc']['go_version'], '1.23.10')

    def test_mirror_or_floating_image_is_rejected_before_build(self):
        invalid = []
        mirror = copy.deepcopy(self.pins)
        mirror['runtime_image'] = mirror['runtime_image'].replace('curlimages/', 'unreviewed/')
        invalid.append(mirror)
        floating = copy.deepcopy(self.pins)
        floating['components']['minio']['builder_image'] = 'golang:1.24.8-alpine'
        invalid.append(floating)
        source = copy.deepcopy(self.pins)
        source['components']['mc']['commit'] = 'master'
        invalid.append(source)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'pins.json'
            for pins in invalid:
                path.write_text(json.dumps(pins))
                with self.subTest(pins=pins), patch.object(build, 'PINS_FILE', path):
                    with self.assertRaises(ValueError):
                        build.read_pins()

    def test_wrong_checkout_cannot_claim_the_requested_revision(self):
        with patch.object(build, 'run', return_value='b' * 40) as execute:
            with self.assertRaisesRegex(ValueError, 'Checkout'):
                build.build_images('a' * 40, Path('/unused'))
            self.assertEqual(execute.call_count, 1)
            self.assertEqual(execute.call_args.args[0], ['git', 'rev-parse', 'HEAD'])

    def test_non_native_or_non_linux_qualification_is_rejected(self):
        for operating_system, machine in [('Darwin', 'arm64'), ('Linux', 's390x')]:
            with self.subTest(system=operating_system), patch.object(build.platform, 'system', return_value=operating_system), patch.object(build.platform, 'machine', return_value=machine):
                with self.assertRaises(ValueError):
                    build.native_architecture()

    def test_qualification_cannot_use_an_unrelated_repository_or_remote_docker(self):
        valid = {'CI': 'true', 'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': 'stonyp90/plainledger',
                 'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '2'}
        for changes in [{'CI': 'false'}, {'GITHUB_REPOSITORY': 'other/repository'},
                        {'DOCKER_HOST': 'ssh://production.example'}, {'DOCKER_CONTEXT': 'production'},
                        {'GITHUB_RUN_ID': ''}]:
            with self.subTest(changes=changes), patch.dict(os.environ, {**valid, **changes}, clear=True):
                with self.assertRaises(ValueError):
                    qualify.fixture_environment()

    def test_only_fixture_credentials_and_buckets_reach_qualification(self):
        environment = {'CI': 'true', 'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': 'stonyp90/plainledger',
                       'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '2',
                       'AWS_ACCESS_KEY_ID': 'unrelated-key', 'S3_ENDPOINT': 'https://unrelated.invalid'}
        with patch.dict(os.environ, environment, clear=True):
            result = qualify.fixture_environment()
        fixture = json.loads(qualify.FIXTURE.read_text())
        self.assertEqual(result['S3_ENDPOINT'], fixture['endpoint'])
        self.assertEqual(result['AWS_ACCESS_KEY_ID'], fixture['appAccessKey'])
        self.assertNotEqual(result['MINIO_ROOT_USER'], result['AWS_ACCESS_KEY_ID'])
        self.assertEqual({result['S3_BUCKET_' + name] for name in fixture['buckets']}, set(fixture['buckets'].values()))


if __name__ == '__main__':
    unittest.main()
