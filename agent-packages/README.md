# Repository-level agent packages

APM packages that are not tied to one module of the **qubership-apihub** monorepo. Module-specific packages live
next to their module, in `backend/<module>/agent-packages/` and `frontend/<module>/agent-packages/`, and
`tests/postman-collections/agent-packages/`. Generic packages come from
[`qubership-apihub-ci/agent-packages`](https://github.com/Netcracker/qubership-apihub-ci/tree/main/agent-packages)
and [`qubership-ai-packages`](https://github.com/Netcracker/qubership-ai-packages/tree/main/agent-packages).

## Packages

| Package | Path | Scope |
|---------|------|-------|
| `apihub-deployment-authoring` | `apihub-deployment-authoring/` | Helm, Compose, and `docs/` deployment guides |
| `apihub-deployment-followup` | `apihub-deployment-followup/` | Reminder to update Helm or Compose when a backend change needs it |
| `apihub-add-go-service` | `apihub-add-go-service/` | Checklist for adding a Go service under `backend/` |
| `apihub-landing-refresh` | `apihub-landing-refresh/` | Refresh versions, release cards, and links of the landing in `sites/landing/` |

## One manifest for the whole repository

The root `apm.yml` lists the store packages and every local package, from all modules. There is no module-level
`apm.yml`, `apm.lock.yaml`, or compiled harness tree. Every module instruction has an `applyTo` glob that starts
with its module path, so it never applies to another module.

After you edit a package, run from the repository root:

```bash
apm install --target cursor,claude --legacy-skill-paths
```

`apm install` deploys the rules and skills. `apm compile` (distributed `AGENTS.md` placement) does not finish
on a repository of this size, so do not run it; the `AGENTS.md` files in this repository are hand-written.

Package sources under `agent-packages/` and the deployed `.cursor/` and `.claude/` trees are **committed**.
Gitignore: `apm_modules/`, `agent-packages/**/build/`.
