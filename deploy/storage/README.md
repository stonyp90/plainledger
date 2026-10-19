# Pinned storage container qualification

This package builds the MinIO server and client from exact official source
commits and qualifies the resulting containers on native Linux AMD64 and ARM64
GitHub runners. It supplies no production credentials and starts no production
resources. Verification creates image artifacts; it does not publish them.

## Reviewed inputs

`pins.json` is the source of the compiler, source, runtime and publication
namespace settings. Every build and runtime image includes a manifest digest.
The image manifests were retrieved from the official registry and their response
body hashes were checked against `Docker-Content-Digest`. The chosen indices
include native Linux AMD64 and ARM64 images.

| Component | Official source | Compiler |
| --- | --- | --- |
| MinIO server | `9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a`, `RELEASE.2025-10-15T17-29-55Z` | Go 1.24.8 |
| MinIO client | `7394ce0dd2a80935aded936b09fa12cbb3cb8096`, `RELEASE.2025-08-13T08-35-41Z` | Go 1.23.10 |

The compiler versions match each source commit's `go.mod` toolchain directive.
Builds set `GOTOOLCHAIN=local`, fetch modules from the official Go proxy, verify
module checksums through `sum.golang.org`, and use the full upstream commit.
Release metadata comes from the pinned source time and revision. No `latest`,
`master`, mutable package install, legacy MinIO image or external mirror is used
by the Dockerfile.

The runtime is the digest-pinned official curl project's `curl-base:8.23.0`.
It preserves `curl`, CA certificates, `/bin/sh`, `cat` and `rm`, which the Oracle
healthcheck and initialization script require. Both resulting images run as UID
and GID 10001. The server's `/data` volume is initialized with that ownership.
Original MinIO `LICENSE`, `CREDITS`, `NOTICE` and the exact source URL are retained
under `/opt/plainledger-storage/licenses`. Module metadata, compiler metadata and
the binary checksum are retained under `/opt/plainledger-storage/provenance`.

Official references:

- [Server release and source-build instructions](https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z)
- [Server compiler declaration](https://github.com/minio/minio/blob/9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a/go.mod)
- [Client compiler declaration](https://github.com/minio/mc/blob/7394ce0dd2a80935aded936b09fa12cbb3cb8096/go.mod)
- [Official curl container project and registries](https://github.com/curl/curl-container)
- [curl 8.23.0 base build source](https://github.com/curl/curl-container/blob/f4c47cab975ad3a278c64cd5b66d7b1d1da5a048/create_base_image.sh)

The community MinIO repositories are archived. Pinned provenance and passing
qualification establish the tested package; they do not establish continuing
upstream maintenance or qualify an existing production host and its data.

## What CI qualifies

`verify.yml` runs `qualify.py` in the real stack's AMD64 job and in a native ARM64
storage job. Both use a bootstrapped, disposable PostgreSQL database and Redis.
The package:

1. Builds both images from the pinned inputs and records their Docker image IDs.
2. Starts a restricted non-root server on loopback port 19000 with an isolated
   network and a new named volume. This avoids Keycloak's host health port 9000.
3. Runs the actual `deploy/oracle/init/storage.sh` unchanged, twice, using the
   built client image. This verifies its commands and idempotent initialization.
4. Runs nine checks for application bucket access, multipart permissions, scoped
   bucket enumeration, rejected policy administration, rejected access to an
   outside bucket, private financial/documents access, public asset reads,
   rejected anonymous writes and invalid credentials, and persisted data and
   policies after a server container restart.
5. Runs the existing complete accounting/storage harness with the scoped
   application credentials. Its 14 core cases retain the real PostgreSQL,
   Redis, S3, tenant isolation and transaction/snapshot failure assertions.
6. Archives the exact images only after all checks pass, recording source SHA,
   workflow run ID and attempt, architecture, pin hash, image IDs, archive hash,
   and every qualification result. Runtime logs survive a failure.

The application IAM user is separate from the root initialization identity.
No application permission is expanded to make tests pass. MinIO intentionally
filters bucket enumeration to buckets permitted by `ListBucket` or
`GetBucketLocation`; qualification checks that the outside bucket is absent.

The fixture is `fixtures/storage/isolated-packaging.json`. The scripts reject
execution outside this repository's GitHub CI and reject alternate Docker
environments. They never contact a customer accounting provider. The accounting
harness retains its loopback, disposable database credential and schema marker
guards. Resources created by qualification are removed on completion or failure.

## Evidence and publication contract

Successful native jobs upload:

- `qualified-storage-amd64-attempt-N`
- `qualified-storage-arm64-attempt-N`

Each contains `qualification.json`, `storage-images.tar.gz`, the exact pins,
accounting results, licenses, and compiler/module provenance for both images.
The run ID and attempt in the evidence must match the exact successful
verification selected by the shared production quality gate. A failed check
cannot produce a qualified artifact.

The separate `Publish qualified storage images` workflow
(`.github/workflows/publish-storage.yml`) is manually dispatched on `main`. It
runs the shared production quality gate from the immutable current-main Git
object, requiring both exact source workflows and every existing mandatory CI
quality job to pass. It downloads both artifacts from the gate's verification
run ID and attempt. A prior attempt's artifact, expired artifact, changed archive,
missing check, mismatched pin, image ID or platform blocks publication.

The publisher loads the archived images and verifies the image configuration IDs,
non-root user, entrypoints and source labels. Immediately before registry login,
it rechecks current main and both source workflows and rejects a changed
verification run or attempt. Registry authentication is scoped to the job's
`GITHUB_TOKEN`; no persistent registry credential is created. Publication pushes
the exact qualified image IDs without rebuilding, creates an index containing
only the qualified AMD64/ARM64 manifests, and pulls each platform by the final
index digest to verify the registry content. It uses no `latest` tag.

The owned namespaces are `ghcr.io/stonyp90/plainledger-minio` and
`ghcr.io/stonyp90/plainledger-mc`. A successful publication uploads
`publication.json`, both qualification records and `storage-images.env` in an
artifact named for the source SHA, verification run and attempt. Only the final
verified registry digest references may populate Oracle's `MINIO_IMAGE` and
`MINIO_CLIENT_IMAGE`. Tags, local Docker image IDs and archive hashes are not
substitutes for those registry digest references. Verification retains the image
archives for seven days; expired evidence requires a new successful verification
attempt before publication.

### Existing Oracle host registry access

A newly published GHCR package is private by default. A successful authenticated
publisher pull does **not** demonstrate anonymous pull access from an Oracle VM.
The package owner must separately confirm the intended package visibility and
that the existing deployment identity can pull both exact digest references.
The workflow does not change package visibility, create a personal access token,
copy its ephemeral `GITHUB_TOKEN` to a host, or install persistent credentials.

For public packages, the host must successfully pull both references without
registry authentication. For private packages, the host needs its existing
approved registry identity with package read access before deployment. Keep the
registry credential in the host's approved Docker credential mechanism rather
than the application environment file or repository. If no suitable identity
exists, registry access remains a deployment prerequisite for the operator.
After visibility/access is configured, verify from the actual host:

```sh
docker pull "$MINIO_IMAGE"
docker pull "$MINIO_CLIENT_IMAGE"
```

These pulls must use the published `@sha256:` references and succeed on the
host's actual architecture. Neither successful CI qualification nor publication
provisions an Oracle host or activates production. See GitHub's official
[Container registry access and visibility documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
and the existing [Oracle deployment guide](../oracle/README.md).

Changes to the inputs require new native qualification and new image evidence.
An existing Oracle volume also needs compatible ownership and a tested backup
and restore before it can be accepted as operational production storage.

## Fast configuration checks

These dependency-free checks do not start Docker or replace native qualification:

```sh
python3 -B -m unittest discover -s deploy/storage -p 'test_*.py' -v
node --check deploy/storage/qualify-permissions.cjs
```
