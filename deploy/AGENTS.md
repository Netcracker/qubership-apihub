# deploy — Agent Instructions

Group of the deployment assets of the product. Follow the root [`AGENTS.md`](../AGENTS.md); the module files below
add what is specific to each.

| Module | What it is | Instructions |
|--------|------------|--------------|
| `helm-templates` | Product Helm chart and the local Kubernetes quickstart | [AGENTS.md](helm-templates/AGENTS.md) |
| `docker-compose` | Compose stacks for local development and tests | [AGENTS.md](docker-compose/AGENTS.md) |

## Shared facts

- The Helm `values.yaml` and templates are the canonical Kubernetes contract. Compose reproduces the same logical
  split. `docs/configuration-reference.md` is the map between them and must stay in sync in every change.
- Runtime config authority: `config.template.yaml` mounted as `config.yaml` for the backend, linter, and
  agents-backend; `config.yaml` for the agent; environment only for the builder and the UI.
- Linter and agents-backend URLs in the backend `extensions` must match how each stack reaches those services.
- Nothing here builds with Nx. Use `helm lint` and `helm template`, or the Compose scripts, and say which tools you
  could not run.
- The user-facing install steps are in `docs/installation-guide.md`.

## Agent packages

- `apihub-deployment-authoring` (skill and rules, root package): use for any change in `deploy/` or `docs/`.
- `apihub-deployment-followup` (skill, root package): use after a backend change that adds config, env, or ports.
- `apihub-add-go-service` (skill, root package): use when a new Go service is wired into the deployment.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
