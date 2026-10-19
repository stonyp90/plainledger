# PlainLedger on an Oracle VM — deployment candidate

This package runs the web app, admin app, API, Keycloak, PostgreSQL, Redis,
MongoDB and MinIO on an **already provisioned Oracle Cloud VM**. It does not
provision paid resources, modify DNS, replace the current Cloudflare site, or
establish that every application feature has passed production testing.

**Current status:** source implementation and deployment-boundary tests are
available. No Oracle host was authenticated or changed during preparation. The
full container stack and public HTTPS/authentication checks still require a real
runner/host. Two reviewed, accessible MinIO image digests are still required.

## Layout and traffic

| Component | Internal address | Persistent data | Public access |
| --- | --- | --- | --- |
| Caddy | `caddy` | Certificates/configuration | Host ports 80 and 443 only |
| Web | `web:80` | Source-built static assets | `APP_DOMAIN` via Caddy |
| Admin app | `admin:3001` | Application state is in the API | `ADMIN_DOMAIN` via Caddy |
| API | `api:3000` | Application dependencies below | `/api`, `/graphql`, `/health` via Caddy |
| Keycloak | `keycloak:8080` | Separate PostgreSQL volume | `AUTH_DOMAIN` via Caddy |
| Keycloak health/metrics | `keycloak:9000` | None | Private only |
| Application PostgreSQL | `app-db:5432` | `app-db-data` | Private only |
| Identity PostgreSQL | `keycloak-db:5432` | `keycloak-db-data` | Private only |
| Redis | `redis:6379` | Append-only log | Private, password required |
| MongoDB | `mongodb:27017` | `mongodb-data` | Private, separate application user |
| MinIO S3 API | `minio:9000` | `minio-data` | HTTPS S3 data requests on `STORAGE_DOMAIN` |
| MinIO console | `minio:9001` | None | Disabled, no published route or port |

The database, identity and storage networks are private Docker bridges. Only
Caddy publishes host ports. The application containers use a separate bridge
for proxy traffic and outbound provider connections. PostgreSQL and Redis TLS
are disabled **only on these private same-host bridges**; public traffic uses
HTTPS. A move to multiple hosts requires a new transport/network design.

The API writes to `S3_ENDPOINT=http://minio:9000`. `S3_PUBLIC_ENDPOINT` supplies
the HTTPS origin for public asset URLs and document presigning. Financial
datasets and shared documents remain private. The **separate public-assets
bucket** allows anonymous reads because the current upload service returns
unsigned logo/avatar URLs. Never place financial files in that bucket.

Keycloak uses its public HTTPS issuer inside and outside the stack. Caddy has
the matching internal network alias so backend token verification uses the same
issuer and valid certificate. Its production realm is generated from the
reviewed Keycloak source, with no human/demo users and an injected API client
secret. The API service account remains for account-management operations.

## Host prerequisites and configuration

Use a dedicated Ubuntu VM with Python 3.10+, Docker Engine, Docker Compose
2.24+, curl, working DNS/egress, and enough capacity for builds and the services.
Deployment requires at least 8 GiB free disk before building. Declared runtime
memory limits total roughly 12 GiB; this is not a load-tested sizing estimate.
Configure OCI networking and the host firewall to allow only the intended
public ports and SSH from approved operators. No database port needs public
ingress. This package does not change an existing firewall.

An authorized operator should create a dedicated directory owned by the SSH
deployment user, normally `/opt/plainledger`, and place configuration at:

```text
/opt/plainledger/shared/runtime.env
```

Copy `env.example` to that file **on the VM**, fill the blank values, and make it
owner-readable/writable only (`chmod 600`). The file must belong to the
deployment user. It never travels through GitHub or the source archive.

Configuration is parsed as literal `KEY=value` data. Do not source it as a shell
script, use `export`, wrap values in quotes, or use variable/command
substitution. Generate unique secrets of at least 32 characters for each service;
64 random hexadecimal characters fit the supported format. Production
passwords and sample placeholders are never generated in the repository.

The template pins Caddy, PostgreSQL/pgvector, Redis and MongoDB manifests resolved
from their official registries on 2026-10-19. These pins support amd64 and arm64;
pinning does not establish vulnerability status or runtime qualification.

`MINIO_IMAGE` and `MINIO_CLIENT_IMAGE` are intentionally blank. Public manifest
requests to Docker Hub and Quay returned HTTP 401 in the preparation environment,
including the standard anonymous-token exchange. No existing verified MinIO
digest was found in retained local handoffs. Supply **accessible, reviewed image
references ending in `@sha256:<64 hex characters>`**. Do not replace them with an
unverified third-party mirror or remove the pin requirement. The CLI image must
support `mc admin policy create/attach`, `mc admin user add` and `mc anonymous set`.

Validate without starting containers:

```bash
python3 deploy/oracle/scripts/env_config.py \
  --env-file /opt/plainledger/shared/runtime.env

python3 deploy/oracle/scripts/deploy.py \
  --env-file /opt/plainledger/shared/runtime.env \
  --release FULL_40_CHARACTER_COMMIT_SHA \
  --preflight-only
```

Validation reports missing names and safe failure reasons. It does not print
configuration values or run `docker compose config` in a way that dumps secrets.

## GitHub delivery

The manual **Deploy Oracle candidate** workflow accepts only the current `main`
commit. Before checkout it verifies that source against GitHub; then the shared
`.github/scripts/require_production_quality.py` gate requires the newest
same-repository, exact-commit `verify.yml` and `ci.yml` runs to be completed
successfully. Only main-branch push or manual runs qualify. The latest CI
attempt must contain exactly one successful **Lint API**, **Lint Web**,
**Test API** and **Test Web** job. Missing, pending, failed, cancelled or skipped
runs/jobs block deployment, including CI runs with manual skip inputs. A prior
successful run cannot hide a newer failure.

The workflow repeats the complete gate immediately before the SSH deployment.
Both checks read the gate from the selected immutable Git commit and use only
`contents: read` and `actions: read` GitHub permissions; SSH credentials are
scoped to the remote deployment step. Existing lint and coverage requirements
remain in force. Use **Re-run all jobs** when a failed-only CI retry would omit
required jobs from the latest attempt. The gate's isolated metadata fixtures
are included in the deployment helper tests below and make no network calls.

Set these repository or `production` environment **variables** only after the
correct pre-provisioned Oracle host has been confirmed:

| Variable | Meaning |
| --- | --- |
| `ORACLE_DEPLOY_ENABLED` | Must explicitly equal `true`; unset/false causes failure |
| `ORACLE_HOST` | Confirmed hostname or IPv4 address of the OCI VM |
| `ORACLE_SSH_USER` | Dedicated deployment user with Docker access |
| `ORACLE_SSH_PORT` | SSH port; defaults to 22 |
| `ORACLE_BASE_DIR` | Dedicated absolute directory, normally `/opt/plainledger` |

Set these **secrets**:

| Secret | Meaning |
| --- | --- |
| `ORACLE_SSH_PRIVATE_KEY` | Authorized SSH deployment identity |
| `ORACLE_SSH_KNOWN_HOSTS` | Host key entry verified through a trusted Oracle/operator channel |

For nondefault SSH ports the known-hosts identity is `[hostname]:port`. The
runner checks that the pinned entry matches the selected host and port, then
requires `StrictHostKeyChecking=yes`, `IdentitiesOnly=yes`, and noninteractive
authentication. It never calls `ssh-keyscan` to trust a newly observed key or
disables host verification.

The runner archives the exact Git commit, computes SHA256, uploads it over SSH,
and verifies the hash before extraction. Archives containing traversal paths,
links, runtime `.env` files, `.git` or `node_modules` are rejected. A release is
stored under `/opt/plainledger/releases/<commit SHA>`. A different archive cannot
overwrite an existing release under the same identity.

No currently configured PlainLedger GitHub secret supplies Oracle SSH access.
The deployment fails with the missing configuration names until those values
and the host-only configuration exist.

## Prepare first, then activate

**Prepare** pulls pinned dependencies, builds images tagged with the source SHA,
starts private dependencies, checks the schema, initializes scoped storage
policies, and starts the application. It verifies real database/cache readiness,
Keycloak discovery and application-credential access to each storage bucket.
Its result is `prepared_public_verification_pending`; this is not a production
end-to-end certificate.

For an empty application database, enable the workflow's
`initialize_empty_database` input once. This invokes:

```text
node scripts/bootstrap-empty-database.cjs --apply
```

The reviewed bootstrap refuses any existing user tables, obtains a database
lock, builds the initial schema and entity metadata, and does not seed tenants
or human users. A failed/incomplete bootstrap leaves the database for inspection.
It is never followed by an automatic drop/reset. Existing application databases
need reviewed migrations or a restored schema, followed by `schema-check`; the
deployment does not turn on TypeORM synchronization for them.

After private preparation succeeds, complete the intended hostname routing and
certificate prerequisites through the authorized DNS/hosting workflow. This
package never changes the currently working DNS or Cloudflare Worker. Caddy uses
automatic HTTPS; public certificate issuance requires the configured domains
to reach the VM, or a separately reviewed certificate/DNS challenge setup.

**Activate** repeats readiness checks and verifies both the origin at
`127.0.0.1` using the configured HTTPS hostnames and the actual public DNS route.
Certificate and hostname verification remain enabled. The checks require:

- The exact source SHA at `/__deployment/release`.
- HTTP 200 **JSON** readiness with connected database and cache; an HTML SPA
  fallback or a website-only 503 cannot pass.
- Working web/admin HTML entry points.
- The correct HTTPS OIDC issuer, endpoints and signing key set.
- A real API service-account token issued through public HTTPS with the expected
  issuer and a future expiry; token contents are not printed.
- Private Keycloak/MinIO management routes and rejected anonymous financial
  bucket listings.

Only successful activation updates `shared/current`. A timestamped receipt is
written to `shared/<sha>-<phase>.json`, with no credential values. A failure
preserves data volumes and the previous `current` link. **Containers may already
have changed before a later check fails**; this is a single-stack Compose rollout,
not an atomic traffic switch. No automatic rollback, database downgrade, DNS
change or volume deletion is attempted. Plan a reviewed rollback with a schema
compatible release and verified backups before a production update.

Changing environment passwords does not rotate existing PostgreSQL/MongoDB
users automatically: their first-start initialization runs only on an empty
volume. Rotate database identities deliberately before updating the matching
configuration. Do not delete persistent volumes to repair credentials.

## What remains to qualify

The deployment probes cover infrastructure and specific authentication/storage
boundaries. They do not replace the browser/API end-to-end suite for customer
registration, email verification/reset delivery, user/tenant permissions,
financial calculations, imports, charts, reports, billing or large datasets.

Keycloak requires authorized SMTP configuration. The API's transactional email
adapter currently targets AWS SES and derives credentials from the general AWS
environment, which the MinIO adapters also use. **An API SMTP adapter or distinct
SES credential configuration is still needed and delivery must be tested.**
Do not infer working API email from Keycloak SMTP or container readiness.

QuickBooks, Stripe, AI providers, Power BI and the existing AWS-specific
Athena/Glue/Bedrock/SageMaker adapters remain external integrations. Empty
optional keys do not make those features operational. The owned application and
data containers run on OCI with this package; moving AWS-specific service
behavior to Oracle needs its own implemented and verified adapters. No backup
restore rehearsal, capacity benchmark, automatic scaling or production billing
transaction was performed while preparing this candidate.

## Verification performed on this package

```bash
python3 -m unittest discover -s deploy/oracle/tests -v
python3 -m py_compile deploy/oracle/scripts/*.py
sh -n deploy/oracle/scripts/receive-release.sh
sh -n deploy/oracle/init/storage.sh
```

The 16 boundary tests cover secret-safe diagnostics, literal configuration
parsing, credential separation/encoding, host-file permissions, image pinning,
SSH argument validation, archive hash/traversal/link rejection, stale revisions,
wrong OIDC issuer, false HTTP 200 readiness and publicly listed financial data.
They use fixtures and make no Docker, SSH or cloud calls. Compose YAML parsing
and whitespace checks also passed. Full Docker builds and the live Oracle
prepare/activate phases remain separate required evidence.

## Official configuration references

- [Docker Compose startup order and healthy/completed dependency conditions](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Engine installation on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Caddy reverse proxy, forwarded headers and active health checks](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy automatic HTTPS requirements](https://caddyserver.com/docs/automatic-https)
- [Keycloak container configuration and management port](https://www.keycloak.org/server/containers)
- [Keycloak reverse proxy and public hostname configuration](https://www.keycloak.org/server/reverseproxy)
- [MinIO policy attachment](https://docs.min.io/aistor/reference/cli/admin/mc-admin-policy/mc-admin-policy-attach/)
- [MinIO anonymous access policy commands](https://docs.min.io/aistor/reference/cli/mc-anonymous/mc-anonymous-set/)
