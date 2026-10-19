#!/usr/bin/env python3
"""Require current-main verification and existing CI quality gates before deployment.

Only read-only GitHub metadata is requested. Provider credentials are neither
needed nor accepted. Missing or changing evidence keeps deployment blocked.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import sys
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

WORKFLOWS = ('.github/workflows/verify.yml', '.github/workflows/ci.yml')
REQUIRED_CI_JOBS = ('Lint API', 'Lint Web', 'Test API', 'Test Web')
ALLOWED_EVENTS = ('push', 'workflow_dispatch')
Fetch = Callable[[str], dict]


class QualityGateError(RuntimeError):
    pass


def _identity(repository: str, sha: str) -> None:
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*', repository):
        raise QualityGateError('A valid GitHub repository is required.')
    if not re.fullmatch(r'[a-f0-9]{40}', sha):
        raise QualityGateError('The source must be a full lowercase commit SHA.')


def _positive_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _matches_source(run: dict, repository: str, sha: str, workflow: str) -> bool:
    head_repository = run.get('head_repository')
    return (isinstance(head_repository, dict)
            and run.get('path') == workflow and run.get('head_sha') == sha
            and run.get('head_branch') == 'main'
            and head_repository.get('full_name') == repository
            and run.get('event') in ALLOWED_EVENTS)


def _require_success(run: dict, label: str) -> None:
    if run.get('status') != 'completed' or run.get('conclusion') != 'success':
        raise QualityGateError(f'{label} must be completed successfully; '
                               f"observed {run.get('status')}/{run.get('conclusion')}.")


def trusted_trigger(repository: str, sha: str, event_name: str, ref: str,
                    event: dict) -> tuple[str, int] | None:
    """Independently validate the source selected by the workflow's inline preflight."""
    _identity(repository, sha)
    if event_name == 'workflow_dispatch' and ref == 'refs/heads/main':
        return None
    if event_name != 'workflow_run':
        raise QualityGateError('Deployment requires a main workflow completion or manual main dispatch.')
    run = event.get('workflow_run') if isinstance(event, dict) else None
    if not isinstance(run, dict):
        raise QualityGateError('The triggering workflow metadata is missing or malformed.')
    workflow = run.get('path')
    if workflow not in WORKFLOWS or not _matches_source(run, repository, sha, workflow):
        raise QualityGateError('The triggering run is not trusted same-repository main evidence.')
    _require_success(run, 'Triggering workflow run')
    if not _positive_int(run.get('id')):
        raise QualityGateError('The triggering workflow run has no valid ID.')
    return workflow, run['id']


def _collection(fetch: Fetch, path: str, key: str) -> list[dict]:
    items: list[dict] = []
    separator = '&' if '?' in path else '?'
    for page in range(1, 11):
        result = fetch(f'{path}{separator}per_page=100&page={page}')
        if not isinstance(result, dict):
            raise QualityGateError('GitHub returned malformed workflow/job evidence.')
        batch, total = result.get(key), result.get('total_count')
        if (not isinstance(batch, list) or any(not isinstance(item, dict) for item in batch)
                or not isinstance(total, int) or isinstance(total, bool) or total < 0):
            raise QualityGateError('GitHub returned malformed workflow/job evidence.')
        items.extend(batch)
        if len(items) >= total:
            return items
        if not batch:
            raise QualityGateError('GitHub returned incomplete workflow/job evidence.')
    raise QualityGateError('Workflow/job evidence exceeded the bounded pagination limit.')


def _latest_run(fetch: Fetch, repository: str, sha: str, workflow: str) -> dict:
    query = urlencode({'branch': 'main', 'head_sha': sha})
    path = f'/repos/{repository}/actions/workflows/{Path(workflow).name}/runs?{query}'
    candidates = [run for run in _collection(fetch, path, 'workflow_runs')
                  if _matches_source(run, repository, sha, workflow)]
    if not candidates:
        raise QualityGateError(f'No trusted exact-commit main run exists for {workflow}.')
    if any(not _positive_int(run.get('id')) or not _positive_int(run.get('run_attempt')) for run in candidates):
        raise QualityGateError(f'Invalid run identity or attempt for {workflow}.')
    # Select before checking conclusion: a prior success cannot hide a new failure.
    run = max(candidates, key=lambda candidate: candidate['id'])
    _require_success(run, f'Latest {workflow} run')
    return run


def _current_main(fetch: Fetch, repository: str, sha: str) -> None:
    metadata = fetch(f'/repos/{repository}/git/ref/heads/main')
    target = metadata.get('object') if isinstance(metadata, dict) else None
    if not isinstance(target, dict) or target.get('type') != 'commit' or target.get('sha') != sha:
        raise QualityGateError('Main has advanced or its commit cannot be verified; deployment remains blocked.')


def require_quality(fetch: Fetch, repository: str, sha: str,
                    trigger: tuple[str, int] | None = None) -> dict[str, str]:
    _identity(repository, sha)
    _current_main(fetch, repository, sha)
    runs = {workflow: _latest_run(fetch, repository, sha, workflow) for workflow in WORKFLOWS}
    if trigger is not None and (trigger[0] not in runs or runs[trigger[0]]['id'] != trigger[1]):
        raise QualityGateError('The triggering run has been superseded by a newer run.')

    ci = runs['.github/workflows/ci.yml']
    jobs = _collection(fetch, f"/repos/{repository}/actions/runs/{ci['id']}/attempts/{ci['run_attempt']}/jobs", 'jobs')
    for name in REQUIRED_CI_JOBS:
        matches = [job for job in jobs if job.get('name') == name]
        if len(matches) != 1:
            raise QualityGateError(f'Expected exactly one {name} job in the latest CI attempt.')
        job = matches[0]
        if (job.get('run_id') != ci['id'] or job.get('run_attempt') != ci['run_attempt']
                or job.get('head_sha') != sha):
            raise QualityGateError(f'{name} does not belong to the exact current CI attempt and commit.')
        _require_success(job, name)

    # A re-run or new run during metadata reads invalidates this observation.
    for workflow, selected in runs.items():
        current = _latest_run(fetch, repository, sha, workflow)
        if (current['id'], current['run_attempt']) != (selected['id'], selected['run_attempt']):
            raise QualityGateError('Quality evidence changed during preflight; rerun the gate.')
    _current_main(fetch, repository, sha)
    return {
        'source_sha': sha,
        'verification_run_id': str(runs[WORKFLOWS[0]]['id']),
        'verification_run_attempt': str(runs[WORKFLOWS[0]]['run_attempt']),
        'verification_url': f"https://github.com/{repository}/actions/runs/{runs[WORKFLOWS[0]]['id']}",
        'quality_url': f"https://github.com/{repository}/actions/runs/{ci['id']}",
    }


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


class GitHubMetadata:
    def __init__(self, token: str):
        if not token:
            raise QualityGateError('A read-only GitHub token is required.')
        self.token = token
        self.opener = build_opener(_NoRedirect())

    def __call__(self, path: str) -> dict:
        request = Request('https://api.github.com' + path, headers={
            'Authorization': 'Bearer ' + self.token,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'PlainLedger-production-quality-gate',
        })
        try:
            with self.opener.open(request, timeout=20) as response:
                payload = response.read(5_000_001)
            if len(payload) > 5_000_000:
                raise QualityGateError('GitHub metadata response exceeded the size limit.')
            result = json.loads(payload)
            if not isinstance(result, dict):
                raise QualityGateError('GitHub metadata response was not an object.')
            return result
        except HTTPError as error:
            raise QualityGateError(f'GitHub metadata request failed with HTTP {error.code}.') from None
        except (URLError, TimeoutError, OSError, ValueError) as error:
            raise QualityGateError(f'GitHub metadata could not be verified ({type(error).__name__}).') from None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository', default=os.environ.get('GITHUB_REPOSITORY', ''))
    parser.add_argument('--sha', required=True)
    parser.add_argument('--github-output', type=Path)
    args = parser.parse_args()
    try:
        event_path = os.environ.get('GITHUB_EVENT_PATH')
        event = json.loads(Path(event_path).read_text()) if event_path else {}
        trigger = trusted_trigger(args.repository, args.sha, os.environ.get('GITHUB_EVENT_NAME', ''),
                                  os.environ.get('GITHUB_REF', ''), event)
        evidence = require_quality(GitHubMetadata(os.environ.get('GH_TOKEN', '')), args.repository, args.sha, trigger)
        if args.github_output:
            with args.github_output.open('a') as output:
                for key, value in evidence.items():
                    output.write(f'{key}={value}\n')
        print(f"Verified current main {args.sha}: {evidence['verification_url']} and {evidence['quality_url']}")
        return 0
    except (QualityGateError, OSError, ValueError) as error:
        print(f'Production quality gate blocked deployment: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
