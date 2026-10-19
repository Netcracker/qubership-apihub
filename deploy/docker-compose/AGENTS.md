# deploy/docker-compose — Agent Instructions

Docker Compose stacks of APIHUB for local development and tests. They reproduce the logical split of the Helm
chart; they do not replace it for production. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`deploy/AGENTS.md`](../AGENTS.md).

## Where the files are

| Stack | Path | Notes |
|-------|------|-------|
| Generic | `apihub-generic/` | Postgres only, no integrations; the default local rig |
| Keycloak | `with-keycloak/` | SAML SSO with Keycloak; the same file layout as the generic stack |
| GitLab | `with-gitlab/` | Only a backend config example (`qubership-apihub-backend-config.yaml`) |

Each full stack has `docker-compose.yml`, `generate_env_and_up_compose.sh`, `generate_jwt_pkey.sh`, the three
`config.yaml` sources (`qubership-apihub-backend-config.yaml`, `qubership-api-linter-service-config.yaml`,
`qubership-apihub-agents-backend-config.yaml`), and the env files `qubership-apihub-ui.env` and
`qubership-apihub-build-task-consumer.env`.

## Build and test

There is no Nx project. Start a stack from its directory:

```bash
cd deploy/docker-compose/apihub-generic
sh generate_env_and_up_compose.sh
```

The script substitutes the placeholders (`${JWT_PRIVATE_KEY}`, `${APIHUB_ACCESS_TOKEN}`, `${OPENAI_TOKEN}`) and
runs Compose. On Windows run it from Git Bash or WSL. The Compose end-to-end workflow
(`.github/workflows/e2e-tests-compose.yml`) uses these stacks.

## Traps

- Keep both stacks in step: a knob added to one `config.yaml` usually belongs in the other.
- `APIHUB_API_KEY` of the builder must equal `zeroDayConfiguration.accessToken` of the backend.
- `technicalParameters.apihub.url` of the linter and agents-backend is the Portal URL as reachable from their
  containers (often `host.docker.internal` plus the published UI port). `extensions[].baseUrl` in the backend config
  must be reachable from the browser and from the backend process.
- Config changes need `docs/configuration-reference.md` and the Helm chart updated in the same change.
- Do not commit real secrets or generated private keys; `certs/` and `data/` hold local material only.

## Agent packages

- `apihub-deployment-authoring` (skill and rule for `deploy/docker-compose/**`, root package): use for any Compose
  change.
- `apihub-deployment-followup` (skill, root package): the reverse direction; it reminds backend authors to update
  the stacks.
- `apihub-add-go-service` (skill, root package): use when a new Go service needs a Compose service and config.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
