# AI assistants

How the repository configures AI coding assistants such as Cursor and Claude Code: one APM manifest, packages next to
the code they describe, and hand-written `AGENTS.md` files.

## One manifest

APM (the Agent Package Manager) installs agent packages (rules, skills, and instructions) into the folders that
the assistants read. The repository has one manifest, [`apm.yml`](../../apm.yml), and one lock file, `apm.lock.yaml`,
at the root. There is no manifest, lock file, or compiled harness tree in any module. Every module instruction has an
`applyTo` glob that starts with its module path, so it never applies to another module. The `*-using` packages are the
exception: they name the consumer modules too.

`apm.yml` lists two kinds of packages:

- **Store packages**, shared by many repositories, from
  [`qubership-apihub-ci`](https://github.com/Netcracker/qubership-apihub-ci/tree/main/agent-packages) and
  [`qubership-ai-packages`](https://github.com/Netcracker/qubership-ai-packages/tree/main/agent-packages). Examples are
  `english-developer-style`, `markdown-line-length-120`, `development-conventions`, and `go-conventions`.
- **Local packages**, which live next to the code they describe:

  | Location | Packages |
  |---|---|
  | `agent-packages/` | `apihub-deployment-authoring`, `apihub-deployment-followup`, `apihub-add-go-service`, `apihub-landing-refresh` |
  | `backend/portal-backend/agent-packages/` | `apihub-backend-developer`, `apihub-backend-self-review`, `backend-conventions`, `advanced-verification` |
  | `backend/agent/agent-packages/` | `apihub-agent-developer`, `agent-conventions` |
  | `frontend/<library>/agent-packages/` | `api-diff-*`, `api-doc-viewer-*`, `next-data-model-*`, `api-processor-*`, `api-unifier-*`, `ddlapi-*`, `json-crawl-*` |
  | `frontend/ui/agent-packages/` | `apihub-ui-authoring` |
  | `tests/postman-collections/agent-packages/` | `postman-e2e-authoring`, `postman-e2e-followup` |

The repository-level packages are described in [`agent-packages/README.md`](../../agent-packages/README.md). To add a
Go service, use the `apihub-add-go-service` skill: it lists every place that names a service.

## Change a package

1. Edit the package source under `agent-packages/` (never the deployed copy).
2. From the repository root, run:

   ```bash
   apm install --target cursor,claude --legacy-skill-paths
   ```

3. Commit the package sources together with the refreshed `.cursor/` and `.claude/` trees. The deployed trees are
   committed so that an assistant works in a fresh clone without running APM.

Never edit `.cursor/` or `.claude/` by hand: the next `apm install` overwrites the change. To add a package to the
manifest, list it in `apm.yml` and run the same command. Do not commit `apm_modules/` or `agent-packages/**/build/`;
both are ignored. To author a package, use the `apm-authoring` skill.

## Do not run `apm compile`

`apm compile` generates distributed `AGENTS.md` files. On this repository it does not finish, and it would overwrite
the hand-written `AGENTS.md` and `CLAUDE.md` files. Use `apm install` only. The `AGENTS.md` and `CLAUDE.md` files,
including those inside modules, are written and reviewed like any other documentation.

## `AGENTS.md` and `CLAUDE.md`

The root [`AGENTS.md`](../../AGENTS.md) describes the repository and its rules for assistants. Each group
(`backend/`, `frontend/`, `tests/`, `deploy/`) and each module has its own `AGENTS.md` with the build and test
commands of that module and the agent packages that apply to it. Next to the `AGENTS.md` of each group and
module sits a `CLAUDE.md` that imports it, so Claude Code and the assistants that read `AGENTS.md` see the same text.
Start from the file nearest to the code you change.

Keep these files short, factual, and specific to the module. Put knowledge that people also need in the
documentation, and let `AGENTS.md` link to it. Human documents do not depend on agent files (see
[Documentation](./documentation.md)).

## Linters

CI linters skip the deployed `.cursor/`, `.claude/`, and `.agents/` trees, `agent-packages/`, and compiled
`AGENTS.md` files, so a change to a skill or rule belongs in the package source. Wording in packages still follows
[the documentation rules](./documentation.md#linters).
