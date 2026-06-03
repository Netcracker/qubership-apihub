# Deployment-local agent packages

Repository-specific APM packages for **qubership-apihub** (umbrella Helm / Compose / docs).
Generic packages come from
[`qubership-apihub-ci/agent-packages`](https://github.com/Netcracker/qubership-apihub-ci/tree/main/agent-packages)
and [`qubership-ai-packages`](https://github.com/Netcracker/qubership-ai-packages/tree/main/agent-packages).

## Packages

| Package | Path | Scope |
|---------|------|-------|
| `apihub-deployment-authoring` | `apihub-deployment-authoring/` | Helm, Compose, `docs/` deployment guides (authors in this repo) |
| `apihub-deployment-followup` | `apihub-deployment-followup/` | Cross-repo reminders for backend developers when deploy follow-up is needed |

Consumers (e.g. `qubership-apihub-backend`) depend on `apihub-deployment-followup` via APM.

Root `apm.yml` lists CI/AI store dependencies and local authoring package. After edits, from the
repository root:

```bash
apm install --target cursor,claude --legacy-skill-paths --force
```

Sources under `agent-packages/` and deployed `.cursor/` / `.claude/` harness trees are
**committed**. Gitignore: `apm_modules/`, `agent-packages/**/build/`.
