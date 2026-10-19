# deploy/helm-templates — Agent Instructions

The product Helm chart (`qubership-apihub/`) and the local Kubernetes quickstart (`local-k8s-quickstart/`). The
chart `values.yaml` and templates are the canonical Kubernetes contract of the product. Follow the root
[`AGENTS.md`](../../AGENTS.md) and [`deploy/AGENTS.md`](../AGENTS.md).

## Where the files are

| Area | Location |
|------|----------|
| Chart | `qubership-apihub/` (`Chart.yaml`, `values.yaml`, `templates/`, `dashboards/`) |
| Local Kind or Rancher quickstart | `local-k8s-quickstart/` (`apihub-quickstart.sh`, `apihub-with-keycloak-quickstart.sh`, `scripts/`, third-party charts) |
| Install guide and config map | `docs/installation-guide.md`, `docs/configuration-reference.md` |

## Build and test

There is no Nx project. Check a change with Helm:

```bash
helm lint deploy/helm-templates/qubership-apihub
helm template apihub deploy/helm-templates/qubership-apihub -f <values-file>
```

`helm` may not be installed on a developer machine; say so in your report instead of claiming a clean render. The
Kind end-to-end workflow (`.github/workflows/e2e-tests-kind.yml`) installs the chart and takes about 45 minutes.

## Traps

- A change to `values.yaml`, a template, or a mounted file needs `docs/configuration-reference.md` and the Compose
  stacks in the same change. Tokens and URLs must stay aligned across the backend, linter, and agents-backend
  `config.yaml` files and the builder env (configuration reference, section 4).
- The `extensions` URLs in the backend config must match how the cluster reaches the linter and agents-backend
  (cluster DNS here; `host.docker.internal` in Compose).
- `local-k8s-quickstart` is for developers only and is not production-ready.
- The agent has its own standalone chart in `backend/agent/helm-templates/`; that is not this chart.

## Agent packages

- `apihub-deployment-authoring` (skill and rule for `deploy/helm-templates/**`, root package): use for any chart,
  values, or quickstart change.
- `apihub-deployment-followup` (skill, root package): the reverse direction; it reminds backend authors to update
  this chart.
- `apihub-add-go-service` (skill, root package): use when a new Go service needs a Deployment, Service, and values.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
