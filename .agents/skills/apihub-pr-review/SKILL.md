---
name: apihub-pr-review
description: Review a pull request of the qubership-apihub monorepo and assess its impact - modules, images, REST contract, database, deployment, E2E coverage, and risk. Use when asked to review a pull request or a branch diff of this repository, or to say what a change affects. The AI Autonomous agent uses it in CI; people can use it the same way.
---

# Pull request review and impact (qubership-apihub)

Review the change, not the whole repository. Find the defects a careful maintainer would block on, say what the change
affects, and stay quiet about everything else. A short review with three real findings beats a long one with twenty
guesses.

## Inputs

- The diff between the merge base and the head of the pull request: `git diff <base>...<head>`.
- The pull request title and description. They are the author's claims; check them against the diff.
- When you get `impact-facts.json`, trust its facts (changed files, affected Nx projects, module labels, flags); they
  come from tools, not from a model.

## Procedure

1. Read the title, the description, and the list of changed files. Group the files by module (table below).
2. For each module in the diff, load the skills the table names and apply their checklists to that module's files.
3. Read the changed code in full where it matters: a changed function, its callers in the diff, and its tests. Open
   files outside the diff only to confirm or reject a suspicion.
4. Answer the impact questions.
5. Write findings. Each one names a file and, when it can, a line of the new version of the file.

## Modules and their skills

| Changed paths | Load | Watch for |
|---|---|---|
| `backend/portal-backend/**` | `apihub-backend-self-review` (it starts from `apihub-go-self-review`), `apihub-backend-developer` | error codes, `main.go` wiring, SQL migrations, OpenAPI files under `docs/api/` |
| `backend/portal-backend/**` with config, env, ports, or startup changes | `apihub-deployment-followup` | Helm, Compose, and `docs/configuration-reference.md` updated in the same pull request |
| REST contract changes (`docs/api/*.yaml`, controllers) | `postman-e2e-followup` | Newman collections that need new or changed requests |
| `backend/agent/**` | `apihub-agent-developer`, `apihub-go-self-review` | discovery runners, no database |
| other Go modules under `backend/` | `apihub-go-developer`, `apihub-go-self-review` | the same Go rules |
| a new module under `backend/` | `apihub-add-go-service` | every place that lists services |
| `frontend/api-diff/**` | `api-diff-authoring`, `api-diff-testing` | classification of breaking changes |
| `frontend/api-doc-viewer/**` | `api-doc-viewer-reviewing`, `api-doc-viewer-authoring`, `api-doc-viewer-testing`, `next-data-model-authoring` | screenshot baselines, stories |
| `frontend/api-processor/**` | `api-processor-build-result`, `api-processor-notifications`, `api-processor-testing` | deterministic order of build results |
| `frontend/api-unifier/**` | `api-unifier-authoring`, `api-unifier-testing` | |
| `frontend/ddlapi/**` | `ddlapi-authoring`, `ddlapi-testing` | |
| `frontend/json-crawl/**` | `json-crawl-authoring`, `json-crawl-testing` | |
| `frontend/ui/**` | the rule `apihub-ui-authoring` and `frontend/ui/docs/dev/CODING_GUIDELINES.md` | |
| `tests/postman-collections/**` | `postman-e2e-authoring` | |
| `deploy/**`, `docs/configuration-reference.md` | `apihub-deployment-authoring` | values, templates, Compose, and the reference agree |
| `sites/landing/**` | `apihub-landing-refresh` | |
| any Markdown or English text | `english-developer-style`, `markdown-line-length-120` | only real problems: wrong facts, broken links, unreadable text |

The nearest `AGENTS.md` of each module lists its build and test commands and its rules; read it when you review that
module.

## Impact questions

Answer each one; "no" is a valid answer and says something too.

- **Modules and images.** Which modules change, and which of the images (`portal-backend`, `api-linter-service`,
  `agents-backend`, `agent`, `test-service`, `build-task-consumer`, `java-task-consumer`, `ui-portal`) get new content?
- **REST contract.** Does a public or internal API change? Is the change breaking for an existing client: a removed or
  renamed field, path, or parameter, a new required input, a narrower type, a changed status code? A breaking change
  needs `!` in the title or a `BREAKING CHANGE:` footer in the description.
- **Database.** Are there new migrations? Are they reversible, numbered without gaps or clashes, and safe on a large
  table (locks, backfills)?
- **Deployment.** Do Helm values, templates, Compose files, or `docs/configuration-reference.md` need a change that the
  pull request does not make?
- **E2E.** Which Newman collections or Playwright tests cover the change? Does a contract change break one of them?
- **Risk.** `low`, `medium`, or `high`, with one sentence of reason: what breaks, for whom, and how likely.

## Findings

- **Report:** bugs, missing error handling, data loss, security problems, contract breaks without a marker, missing
  migrations or deployment updates, tests that do not test the change, violations of a rule or skill the module uses.
- **Do not report:** style that a linter checks, personal preferences, speculation you could not confirm by reading the
  code, and anything outside the diff unless the diff breaks it.
- **Severity:** `blocker` must not merge; `major` should be fixed in this pull request; `minor` is worth fixing; `nit`
  only when it is cheap and clear. Most reviews have no blocker.
- **Body:** what is wrong, why it matters, and the fix, in a few sentences. Quote the code you mean. Address the author
  as "you".
- **Line:** a line number in the new version of the file, inside the diff. Use `null` when the finding is about a file
  as a whole or about something missing.
