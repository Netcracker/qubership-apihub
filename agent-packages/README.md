# Deployment-local agent packages

Repository-specific APM packages for **qubership-apihub** (umbrella Helm / Compose / docs).
Generic packages come from
[`qubership-apihub-ci/agent-packages`](https://github.com/Netcracker/qubership-apihub-ci/tree/apm_migration/agent-packages)
and [`qubership-ai-packages`](https://github.com/Netcracker/qubership-ai-packages/tree/main/agent-packages).

## Packages

| Package | Path | Scope |
|---------|------|-------|
| `apihub-deployment-authoring` | `apihub-deployment-authoring/` | Helm, Compose, `docs/` deployment guides |

Root `apm.yml` lists CI/AI store dependencies and this local path. After edits, from the
repository root:

```bash
apm install --target cursor,claude --legacy-skill-paths --force
```

Sources under `agent-packages/` and deployed `.cursor/` / `.claude/` harness trees are
**committed**. Gitignore: `apm_modules/`, `agent-packages/**/build/`.
