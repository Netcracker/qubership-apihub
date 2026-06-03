# Qubership APIHUB (deployment) — Agent Instructions

Instructions for AI assistants working on **qubership-apihub** (Cursor, Claude Code, and
compatible tools).

## Repository role

This repository is the **umbrella deployment project** only:

- **Helm charts** — `helm-templates/qubership-apihub/` (production-oriented delivery)
- **Docker Compose** — `docker-compose/apihub-generic/`, `docker-compose/with-keycloak/`
- **Local Kubernetes quickstart** — `helm-templates/local-k8s-quickstart/` (dev/R&D, not production)
- **Product documentation** — `docs/` (installation, admin, configuration map, guides)

**Application source code is not here.** Implement features in sibling repositories and
update deployment assets here when install shape, env vars, or documented configuration change.

## Primary edit targets

| Area | Path | Purpose |
|------|------|---------|
| Helm chart | `helm-templates/qubership-apihub/` | `values.yaml`, templates, Secrets, ingress |
| Compose stacks | `docker-compose/` | Local rigs, env files, backend config YAML mounts |
| Configuration map | `docs/configuration-reference.md` | Files vs env vs Helm; cross-component consistency |
| Installation | `docs/installation-guide.md` | Helm and Compose procedures |
| Quickstart | `helm-templates/local-k8s-quickstart/` | Kind/Rancher local cluster workflows |
| Doc hub | `docs/README.md` | Index to layered guides |

## Sibling component repositories

| Component | Repository | Runtime config authority |
|-----------|------------|---------------------------|
| API Registry (backend) | [qubership-apihub-backend](https://github.com/Netcracker/qubership-apihub-backend) | `config.template.yaml` → mounted `config.yaml` |
| Builder | [qubership-apihub-build-task-consumer](https://github.com/Netcracker/qubership-apihub-build-task-consumer) | Environment only |
| Portal UI | [qubership-apihub-ui](https://github.com/Netcracker/qubership-apihub-ui) | Environment only |
| API Linter (extension) | [qubership-api-linter-service](https://github.com/Netcracker/qubership-api-linter-service) | Environment only |
| Agents backend (extension) | [qubership-apihub-agents-backend](https://github.com/Netcracker/qubership-apihub-agents-backend) | Environment only |
| Kubernetes agent (extension) | [qubership-apihub-agent](https://github.com/Netcracker/qubership-apihub-agent) | `config.yaml` (file-based) |
| Reusable CI / generic agent packages | [qubership-apihub-ci](https://github.com/Netcracker/qubership-apihub-ci) | Workflows and `agent-packages/` store |

When a task requires REST, business logic, or UI behaviour changes, **stop** and direct the
user to the appropriate component repo; return here only for deployment and documentation updates.

## Clarification before coding

- Do **not** change deployment files until requirements (environment, SSO mode, extensions on/off,
  target cluster vs Compose) are clear.
- For GitHub ticket work, use `github-ticket-implementation-planner` before implementation.
- State assumptions explicitly when greenfield vs upgrade paths differ.

## Configuration discipline

- **Helm `values.yaml` + templates** are the canonical Kubernetes contract.
- **`docs/configuration-reference.md`** must stay in sync when knobs, env names, or mount paths change.
- **Compose** reproduces the same logical split; keep tokens and URLs aligned across backend YAML,
  builder env, linter env, and agents-backend env (see configuration reference §4).
- **Extensions** — linter and agents-backend URLs in backend `extensions` must match how each stack
  reaches those services (cluster DNS vs `host.docker.internal`).

## GitHub CLI

- Use **`gh`** for issues, pull requests, checks, and releases on this repository.

## Cross-platform development

- Scripts and docs may be used on **Linux** and **Windows** (WSL, Git Bash, or PowerShell).
- Prefer repo-relative paths (`helm-templates/...`, `docker-compose/...`).

## Documentation

- Write and update technical docs in **English**.
- Markdown prose: **≤ 120 characters** per line where the deployed linter applies.
- Update `docs/README.md` index links when adding significant new guides.

## CI (super-linter / link checker)

Pull requests may run linters on changed Markdown and YAML. Keep links repo-relative and resolvable
from the editing file; avoid trailing whitespace on changed YAML lines.

## Project skills (Cursor / Claude)

Generic and deployment-specific skills are provisioned by APM:

```bash
apm install --target cursor,claude --legacy-skill-paths
```

- **Deployment workflow** — `apihub-deployment-authoring` (local `agent-packages/`)
- **Ticket planning** — `github-ticket-implementation-planner` (CI store)
- **Always-on conventions** — `common-conventions`, `english-developer-style`, `markdown-line-length-120`

See [README — AI agent configuration (APM)](README.md#ai-agent-configuration-apm),
root `apm.yml`, and [`agent-packages/README.md`](agent-packages/README.md).

**No Go agent packages** are installed for this repository.
