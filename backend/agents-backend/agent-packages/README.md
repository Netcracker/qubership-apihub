# Agents-backend local agent packages

Repository-specific APM packages for `qubership-apihub-agents-backend`. Generic packages come from
[`qubership-apihub-ci/agent-packages`](https://github.com/Netcracker/qubership-apihub-ci/tree/apm_migration/agent-packages);
this folder holds content that applies **only** to this service.

Packages follow the [apm-authoring](https://github.com/Netcracker/qubership-ai-packages/tree/main/agent-packages/apm-authoring)
layout (`agent-packages/<name>/.apm/...`).

## Packages

| Package | Path | Depends on (CI store) |
|---------|------|------------------------|
| `apihub-agents-backend-developer` | `apihub-agents-backend-developer/` | `apihub-go-developer` |
| `agents-backend-conventions` | `agents-backend-conventions/` | — |

Root `apm.yml` lists both CI store dependencies and these local paths. After edits, run from
repository root:

```bash
apm install --target cursor,claude --legacy-skill-paths
```

Sources in `agent-packages/` and deployed `.cursor/` / `.claude/` harness trees are **committed**.
Only `apm_modules/` is gitignored.
