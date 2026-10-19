"""Release authorization regression fixtures. No GitHub or provider calls are made."""
from __future__ import annotations

from copy import deepcopy
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / '.github' / 'scripts'))
import require_production_quality as gate

REPOSITORY = 'stonyp90/plainledger'
SHA = 'a' * 40


def workflow(path: str, identifier: int) -> dict:
    return dict(id=identifier, path=path, head_sha=SHA, head_branch='main',
                head_repository={'full_name': REPOSITORY}, event='push',
                status='completed', conclusion='success', run_attempt=1)


class GitHubFixture:
    def __init__(self):
        self.verification = [workflow(gate.WORKFLOWS[0], 100)]
        self.ci = [workflow(gate.WORKFLOWS[1], 200)]
        self.jobs = [dict(id=index, name=name, run_id=200, run_attempt=1, head_sha=SHA,
                          status='completed', conclusion='success')
                     for index, name in enumerate(gate.REQUIRED_CI_JOBS, start=1)]
        self.requests: list[str] = []
        self.main_reads = 0
        self.advance_main = False
        self.after_jobs = None

    def __call__(self, path: str) -> dict:
        self.requests.append(path)
        parsed = urlsplit(path)
        if parsed.path.endswith('/git/ref/heads/main'):
            self.main_reads += 1
            current = 'b' * 40 if self.advance_main and self.main_reads > 1 else SHA
            return {'object': {'type': 'commit', 'sha': current}}
        if '/actions/workflows/verify.yml/runs' in parsed.path:
            key, items = 'workflow_runs', self.verification
        elif '/actions/workflows/ci.yml/runs' in parsed.path:
            key, items = 'workflow_runs', self.ci
        elif '/actions/runs/' in parsed.path and parsed.path.endswith('/jobs'):
            if f"/200/attempts/{self.ci[-1]['run_attempt']}/jobs" not in parsed.path:
                raise AssertionError('Jobs were not requested from the latest explicit CI attempt')
            key, items = 'jobs', self.jobs
            if self.after_jobs:
                self.after_jobs(self)
        else:
            raise AssertionError('Unexpected metadata request: ' + path)
        page = int(parse_qs(parsed.query)['page'][0])
        return {'total_count': len(items), key: deepcopy(items[(page - 1) * 100:page * 100])}


class ProductionQualityGateTests(unittest.TestCase):
    def setUp(self):
        self.github = GitHubFixture()

    def check(self, trigger=None):
        return gate.require_quality(self.github, REPOSITORY, SHA, trigger)

    def test_both_workflows_and_all_required_jobs_authorize_only_current_main(self):
        evidence = self.check()
        self.assertEqual(evidence, {
            'source_sha': SHA,
            'verification_run_id': '100',
            'verification_run_attempt': '1',
            'verification_url': f'https://github.com/{REPOSITORY}/actions/runs/100',
            'quality_url': f'https://github.com/{REPOSITORY}/actions/runs/200',
        })
        self.assertEqual(self.github.main_reads, 2)

    def test_verification_success_cannot_replace_missing_or_failed_existing_ci(self):
        for ci in ([], [dict(self.github.ci[0], conclusion='failure')]):
            with self.subTest(ci=ci):
                self.github.ci = ci
                with self.assertRaises(gate.QualityGateError):
                    self.check()

    def test_latest_run_is_selected_before_success_so_old_success_cannot_hide_new_failures(self):
        for name in ('verification', 'ci'):
            for status, conclusion in [('completed', 'failure'), ('completed', 'cancelled'),
                                       ('completed', 'skipped'), ('queued', None), ('in_progress', None)]:
                with self.subTest(workflow=name, status=status, conclusion=conclusion):
                    self.setUp()
                    runs = getattr(self.github, name)
                    runs.append(dict(runs[0], id=runs[0]['id'] + 1, status=status, conclusion=conclusion))
                    with self.assertRaisesRegex(gate.QualityGateError, 'must be completed successfully'):
                        self.check()

    def test_other_revisions_forks_branches_events_and_workflow_paths_are_not_evidence(self):
        for override in ({'head_sha': 'b' * 40}, {'head_branch': 'fix/candidate'},
                         {'head_repository': {'full_name': 'another/repository'}}, {'head_repository': None},
                         {'event': 'pull_request'}, {'path': '.github/workflows/unrelated.yml'}):
            with self.subTest(override=override):
                self.setUp()
                self.github.verification = [dict(self.github.verification[0], **override)]
                with self.assertRaisesRegex(gate.QualityGateError, 'No trusted exact-commit'):
                    self.check()

    def test_successful_manual_skip_run_cannot_authorize_deployment(self):
        self.github.ci[0]['event'] = 'workflow_dispatch'
        original = deepcopy(self.github.jobs)
        for name in gate.REQUIRED_CI_JOBS:
            with self.subTest(name=name):
                self.github.jobs = [dict(job, conclusion='skipped' if job['name'] == name else 'success')
                                    for job in original]
                with self.assertRaisesRegex(gate.QualityGateError, name + ' must be completed successfully'):
                    self.check()

    def test_missing_and_duplicate_required_jobs_fail_closed(self):
        original = deepcopy(self.github.jobs)
        for jobs in (original[1:], original + [deepcopy(original[0])]):
            with self.subTest(job_count=len(jobs)):
                self.github.jobs = jobs
                with self.assertRaisesRegex(gate.QualityGateError, 'exactly one Lint API'):
                    self.check()

    def test_required_jobs_must_belong_to_current_commit_run_and_attempt(self):
        for override in ({'run_id': 199}, {'run_attempt': 2}, {'head_sha': 'b' * 40}):
            with self.subTest(override=override):
                self.setUp()
                self.github.jobs[0].update(override)
                with self.assertRaisesRegex(gate.QualityGateError, 'exact current CI attempt and commit'):
                    self.check()

    def test_rerun_uses_only_the_latest_attempt_and_paginates_all_jobs(self):
        self.github.ci[0]['run_attempt'] = 2
        for job in self.github.jobs:
            job['run_attempt'] = 2
        self.github.jobs = [dict(name=f'Optional job {index}') for index in range(100)] + self.github.jobs
        self.check()
        self.assertTrue(any('/200/attempts/2/jobs?per_page=100&page=2' in path for path in self.github.requests))
        self.assertFalse(any('/attempts/1/jobs' in path for path in self.github.requests))

    def test_workflow_pagination_cannot_hide_a_later_failure(self):
        self.github.verification = [dict(self.github.verification[0], id=index) for index in range(1, 101)]
        self.github.verification.append(dict(self.github.verification[0], id=101, conclusion='failure'))
        with self.assertRaisesRegex(gate.QualityGateError, 'must be completed successfully'):
            self.check()
        self.assertTrue(any('verify.yml/runs' in path and 'page=2' in path for path in self.github.requests))

    def test_stale_main_and_main_advancing_during_checks_block_release(self):
        with self.assertRaisesRegex(gate.QualityGateError, 'Main has advanced'):
            gate.require_quality(self.github, REPOSITORY, 'b' * 40)
        self.setUp()
        self.github.advance_main = True
        with self.assertRaisesRegex(gate.QualityGateError, 'Main has advanced'):
            self.check()

    def test_a_new_run_or_attempt_during_checks_invalidates_the_observation(self):
        for field in ('id', 'run_attempt'):
            with self.subTest(field=field):
                self.setUp()
                self.github.after_jobs = lambda fixture: fixture.verification[0].update({field: fixture.verification[0][field] + 1})
                with self.assertRaisesRegex(gate.QualityGateError, 'evidence changed'):
                    self.check()

    def test_trigger_can_be_either_workflow_but_must_match_its_latest_run(self):
        for run in (self.github.verification[0], self.github.ci[0]):
            with self.subTest(workflow=run['path']):
                trigger = gate.trusted_trigger(REPOSITORY, SHA, 'workflow_run', 'refs/heads/main', {'workflow_run': run})
                self.check(trigger)
        with self.assertRaisesRegex(gate.QualityGateError, 'superseded'):
            self.check((gate.WORKFLOWS[0], 99))

    def test_untrusted_or_unsuccessful_completion_events_do_not_authorize_checkout(self):
        run = self.github.verification[0]
        for override in ({'event': 'pull_request'}, {'head_repository': {'full_name': 'fork/plainledger'}},
                         {'head_branch': 'feature'}, {'head_sha': 'b' * 40}, {'conclusion': 'failure'},
                         {'path': '.github/workflows/unrelated.yml'}):
            with self.subTest(override=override), self.assertRaises(gate.QualityGateError):
                gate.trusted_trigger(REPOSITORY, SHA, 'workflow_run', 'refs/heads/main', {'workflow_run': dict(run, **override)})
        for ref in ('refs/heads/feature', 'refs/tags/release'):
            with self.subTest(ref=ref), self.assertRaises(gate.QualityGateError):
                gate.trusted_trigger(REPOSITORY, SHA, 'workflow_dispatch', ref, {})
        self.assertIsNone(gate.trusted_trigger(REPOSITORY, SHA, 'workflow_dispatch', 'refs/heads/main', {}))

    def test_malformed_or_incomplete_metadata_fails_closed(self):
        for response in (None, [], {'total_count': 1, 'workflow_runs': []}, {'workflow_runs': []},
                         {'total_count': 1, 'workflow_runs': [None]}):
            with self.subTest(response=response), self.assertRaises(gate.QualityGateError):
                gate._collection(lambda path: response, '/fixture', 'workflow_runs')

    def test_malformed_main_or_trigger_metadata_fails_closed(self):
        for response in (None, [], {'object': None}, {'object': []}):
            with self.subTest(response=response), self.assertRaises(gate.QualityGateError):
                gate._current_main(lambda path: response, REPOSITORY, SHA)
        for event in (None, [], {}, {'workflow_run': None}, {'workflow_run': []}):
            with self.subTest(event=event), self.assertRaises(gate.QualityGateError):
                gate.trusted_trigger(REPOSITORY, SHA, 'workflow_run', 'refs/heads/main', event)

    def test_cli_writes_real_output_lines_and_does_not_expose_the_token(self):
        with tempfile.TemporaryDirectory() as directory:
            event = Path(directory) / 'event.json'
            output = Path(directory) / 'outputs'
            event.write_text('{}')
            stdout, stderr = io.StringIO(), io.StringIO()
            environment = {'GITHUB_REPOSITORY': REPOSITORY, 'GITHUB_EVENT_NAME': 'workflow_dispatch',
                           'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_PATH': str(event), 'GH_TOKEN': 'isolated-metadata-token'}
            with patch.dict(gate.os.environ, environment, clear=True), patch.object(gate, 'GitHubMetadata', return_value=self.github), \
                 patch.object(sys, 'argv', ['gate', '--sha', SHA, '--github-output', str(output)]), \
                 patch.object(sys, 'stdout', stdout), patch.object(sys, 'stderr', stderr):
                self.assertEqual(gate.main(), 0)
            self.assertEqual(len(output.read_text().splitlines()), 5)
            self.assertIn('verification_run_id=100\n', output.read_text())
            self.assertIn('verification_run_attempt=1\n', output.read_text())
            self.assertIn('quality_url=https://github.com/', output.read_text())
            self.assertNotIn('isolated-metadata-token', stdout.getvalue() + stderr.getvalue())

    def test_no_github_credential_is_a_blocking_error(self):
        with self.assertRaisesRegex(gate.QualityGateError, 'read-only GitHub token'):
            gate.GitHubMetadata('')


if __name__ == '__main__':
    unittest.main()
