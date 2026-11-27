# AI assistants

How the repository configures AI coding assistants such as Cursor, Claude Code, and OpenCode: one APM manifest,
packages next to the code they describe, and hand-written `AGENTS.md` files.

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
  | `agent-packages/` | `apihub-deployment-authoring`, `apihub-deployment-followup`, `apihub-add-go-service`, `apihub-landing-refresh`, `apihub-release-announce`, `apihub-adr`, `apihub-design-authoring`, `apihub-autonomous-agent`, `analyze-migration` |
  | `backend/portal-backend/agent-packages/` | `apihub-backend-developer`, `apihub-backend-self-review`, `backend-conventions`, `advanced-verification` |
  | `backend/agent/agent-packages/` | `apihub-agent-developer`, `agent-conventions` |
  | `frontend/<library>/agent-packages/` | `api-diff-*`, `api-doc-viewer-*`, `next-data-model-*`, `api-processor-*`, `api-unifier-*`, `ddlapi-*`, `json-crawl-*` |
  | `frontend/ui/agent-packages/` | `apihub-ui-authoring`, `apihub-typescript-coding`, `apihub-react-coding`, `apihub-mui-coding`, `apihub-unit-testing`, `apihub-frontend-gates`, `apihub-agents-claude`, `apihub-agents-cursor`, `apihub-agents-opencode` |
  | `tests/postman-collections/agent-packages/` | `postman-e2e-authoring`, `postman-e2e-followup` |

The repository-level packages are described in [`agent-packages/README.md`](../../agent-packages/README.md). To add a
Go service, use the `apihub-add-go-service` skill: it lists every place that names a service. To announce a published
product release, invoke `apihub-release-announce` and pass the GitHub release URL.

## Change a package

Use the APM version that `apm.lock.yaml` records in `apm_version`; `pip install apm-cli==<version>` installs it.
Another version can rewrite the deployed rules and the lock file.

1. Edit the package source under `agent-packages/` (never the deployed copy).
2. From the repository root, run:

   ```bash
   apm install
   ```

   The targets are in `apm.yml`.
3. Run `apm install --frozen --dry-run`. It verifies the deployed files against `apm.lock.yaml`.
4. Commit the package sources together with `.agents/skills/`, `.claude/skills/`, `.opencode/agents/`, and the
   refreshed `.cursor/` and `.claude/` rule trees. A fresh clone then has the skills and rules without running APM.

`apm install` writes the same skills to `.agents/skills/` and `.claude/skills/`. Commit both, so a clone works
without `apm install`. Claude Code reads `.claude/skills/`. Cursor reads that directory and `.agents/skills/`.
OpenCode 2.x keeps the `.agents/skills/` copy when the same skill name exists in both trees. OpenCode 1.x reads
the skill files concurrently and keeps the copy that it finishes reading last. So the two trees have to stay
identical and land in the same commit. `.cursor/skills/` stays gitignored. Rules stay in
`.cursor/rules/` and `.claude/rules/`. OpenCode loads the Claude rules through the root `opencode.json`, and the AI
Autonomous agent through `tools/agent/opencode/opencode.json` (see [OpenCode](#opencode)).

Never edit `.agents/`, `.cursor/`, `.claude/`, or `.opencode/` by hand: the next `apm install` overwrites the
change. To add a package to the manifest, list it in `apm.yml` and run the same command. Do not commit
`apm_modules/` or `agent-packages/**/build/`; both are ignored. To author a package, use the `apm-authoring` skill.

### Store packages

A rule or skill of a store package changes in its source repository, `qubership-apihub-ci` or
`qubership-ai-packages`, through a pull request there. After the merge, update the package here and keep the other
store packages where they are:

```bash
apm update <alias> --yes
apm install
```

The alias joins the repository and the package name, such as `qubership-apihub-ci-development-conventions`. The
second command must report no changes. `apm install --refresh`
moves every store package to its latest commit, so do not use it for one package.

### Rules in `.claude/rules/`

APM writes the always-on and directory rules for Claude Code to `.claude/rules/` only while it does not manage a
section in the root `AGENTS.md`. Every `apm install` warns that `AGENTS.md` is hand-authored; that is expected. Leave
`compilation.agents_md.mode: managed_section` unset in `apm.yml`. With it, APM moves those rules into `AGENTS.md`,
which this repository writes by hand. Keep the root `AGENTS.md` as well: without it, APM deletes the five
rules that apply to every file (`applyTo: "**"`), and `apm install --frozen --dry-run` still passes.

## OpenCode

OpenCode reads the root [`opencode.json`](../../opencode.json), which is written by hand: APM deploys no rules for
OpenCode, because it would merge them into `AGENTS.md` with `apm compile`. The file sets two things:

- `instructions` loads every rule in `.claude/rules/`. OpenCode reads a rule file whole and ignores its `paths:`
  header, so the root `AGENTS.md` tells the model that a rule applies only to the files its `paths:` list matches.
- `permission` guards shell commands as `.claude/settings.json` does, and the two files change together: it allows
  the Go commands and the gate script, asks before destructive commands, and denies the commands that break the pnpm
  workspace. OpenCode reads the global config before this file and applies the last rule that matches a command, so
  a rule here wins over a global rule for the same command. The file sets no rule for `"*"`: whether OpenCode asks
  before any other command is up to the global config, and without a rule there OpenCode runs it. The file uses the
  `permission` format of OpenCode 1.x, which OpenCode 2.x reads too.

OpenCode also reads the root `AGENTS.md` and the `AGENTS.md` of a module when it reads a file below it, and the skills
in `.agents/skills/` and `.claude/skills/`. The package `apihub-agents-opencode` deploys the `frontend-verifier`
subagent to `.opencode/agents/`: it names no model, so it runs on the model of the session, edits no file, and runs
no command but the gate script of `apihub-frontend-gates`.

The AI Autonomous agent does not read this file. Its runs point `OPENCODE_CONFIG` and `OPENCODE_CONFIG_DIR` to its
own config and roles in `tools/agent/opencode/`, and set `OPENCODE_DISABLE_PROJECT_CONFIG=1`. The flag makes
OpenCode skip `opencode.json`, `opencode.jsonc`, `.opencode/`, and the root `AGENTS.md` of the working tree, so a
pull request cannot change them, and the agent's config lists the root `AGENTS.md` and the rules in `instructions`.

## Do not run `apm compile`

`apm compile` generates distributed `AGENTS.md` files. On this repository it does not finish, and it would overwrite
the hand-written `AGENTS.md` and `CLAUDE.md` files. Use `apm install` only. The `AGENTS.md` and `CLAUDE.md` files,
including those inside modules, are written and reviewed like any other documentation.

## `AGENTS.md` and `CLAUDE.md`

The root [`AGENTS.md`](../../AGENTS.md) describes the repository and its rules for assistants. Each group
(`backend/`, `frontend/`, `tests/`, `deploy/`) and each module has its own `AGENTS.md` with the build and test
commands of that module and the agent packages that apply to it. Next to every `AGENTS.md`, the root one included,
sits a `CLAUDE.md` that imports it (`@AGENTS.md`), so Claude Code and the assistants that read `AGENTS.md` see the
same text. Claude Code reads an `AGENTS.md` on its own only where no `CLAUDE.md` is in the folder or above it, so a
new `AGENTS.md` gets its `CLAUDE.md` in the same change. Start from the file nearest to the code you change.

Keep these files short, factual, and specific to the module. Put knowledge that people also need in the
documentation, and let `AGENTS.md` link to it. Human documents do not depend on agent files (see
[Documentation](./documentation.md)).

## Linters

CI linters skip the deployed `.cursor/`, `.claude/`, `.agents/`, and `.opencode/` trees, `agent-packages/`, and compiled
`AGENTS.md` files, so a change to a skill or rule belongs in the package source. Wording in packages still follows
[the documentation rules](./documentation.md#linters).
