---
name: api-doc-viewer-feature-test-plan
description: Build a manual end-to-end QA test plan for a feature or fix of the api-doc-viewer viewers in a branch, ready to hand to QA — an interview, an analysis of the change and of the host app, packed test-data packages from the fixtures, case lists with steps and expected results, a GitHub and GitLab backlog retest, a results sheet, and a QA start page. Use when the user asks for a QA or test plan of a branch, a feature, or a story that touches frontend/api-doc-viewer, or runs /api-doc-viewer-feature-test-plan.
---

# Feature test plan for QA

The skill turns a branch into a folder that QA can start from: `qa-<feature>/` at the repository root. QA runs the
cases in the host app (the APIHUB Portal, `frontend/ui/packages/portal`), not in Storybook. The automated screenshot
suites of api-doc-viewer are the catalogue of cases and the expected pictures; the plan packs their fixtures into a
few packages QA can publish, and writes a few hundred manual cases that combine them.

The templates and references are self-contained. The first full run of this skill was the OpenAPI operation viewers
plan of branch `feature/openapi-rework` (folder `qa-openapi-operation-viewers/`); when that folder exists in the
branch at hand, its `README.md`, `test-plan/README.md`, and `config/` are a complete example.

## Workflow

Run the phases in order. Report to the user at the end of each phase in a few lines and continue unless the phase
needs a decision. Every claim about behavior that reaches a case is checked against the code, the design documents,
or `apiDiff` output, never assumed.

### 1. Interview

Ask the questions of [references/interview.md](references/interview.md) before writing anything. Find every answer you
can yourself first (the branch diff, the design documents, the fixture catalogues) and ask the user to confirm or
correct it; ask only what the repository cannot tell you. Batch the questions, at most four per round, with
recommended options first.

### 2. Analyze the change and the host app

Follow [references/analysis.md](references/analysis.md): the changed components from `git diff`, the API types that
share them (the regression scope), the design documents (`display-coverage.md` decides what is a defect), and the
host-app facts that limit what QA can reach (which display modes and layouts, which flows). Write the facts into the
plan README as a numbered table (P1, P2, …): they shape every case.

### 3. Scaffold the QA folder

Create `qa-<feature>/` from [templates/](templates/):

| From | To |
| --- | --- |
| `templates/plan-README.md` | `qa-<feature>/README.md`: scope, portal facts, open decisions, the mandatory checks |
| `templates/start-page.md` | `qa-<feature>/test-plan/README.md`: the QA entry point |
| `templates/test-plan.config.mjs` | `qa-<feature>/config/test-plan.config.mjs` |
| `templates/backlog.config.json` | `qa-<feature>/config/backlog.config.json` (when the backlog is in scope) |
| `templates/tools-README.md` | `qa-<feature>/tools/README.md`: how to rebuild the data |

### 4. Build the test data

Define the packages in `config/test-plan.config.mjs` and generate them with the skill's engine
([references/test-data.md](references/test-data.md)). From the repository root, with `S` set to
`.agents/skills/api-doc-viewer-feature-test-plan/scripts`:

```bash
pnpm exec nx run-many -t build -p api-diff compatibility-suites ddlapi
node $S/packing/pack.mjs --qa qa-<feature>
node $S/packing/verify.mjs --qa qa-<feature>
```

`verify.mjs` must report 0 failures. Prove once that it can fail: change one packed file by hand, run it, and
regenerate.

### 5. Backlog retest (when in scope)

Collect, score, read, and select the issues of the configured GitHub and GitLab repositories, copy their samples,
write the samples an issue lacks, and package them ([references/backlog.md](references/backlog.md)). The result is
`test-plan/backlog-retest.md` and `samples/backlog/`.

### 6. Write the cases

Write the case lists of [references/cases.md](references/cases.md): one file per area under `test-plan/<api-type>/`,
plus `test-plan/regression.md` for the other API types. Respect the budget agreed in the interview. Every case names
the package cases to open; the results sheet rejects a name that no package has.

### 7. Build the results sheet

```bash
node $S/results-sheet.mjs --qa qa-<feature>
```

It writes `test-plan/results.csv` with one row per case, the operations to open, and the screenshot baselines, and
keeps any results already entered.

### 8. Finish and hand over

Run the checks of [references/handover.md](references/handover.md) (links, line length, counts in the documents, the
sheet), then tell the user what QA receives and how. Do not commit unless asked.

## References

| File | Read it for |
| --- | --- |
| [references/interview.md](references/interview.md) | The questions, what to find out before asking, and the defaults |
| [references/analysis.md](references/analysis.md) | Scoping the change, the regression, and the host-app facts |
| [references/test-data.md](references/test-data.md) | The packing engine, the config, the builders, and the checks |
| [references/cases.md](references/cases.md) | The case format, IDs, cells, oracles, budgets, and the mandatory checks |
| [references/backlog.md](references/backlog.md) | Collecting and selecting GitHub and GitLab issues and their samples |
| [references/handover.md](references/handover.md) | The final checks and what QA receives |
| [references/lessons.md](references/lessons.md) | What was not obvious in the first run; read before phase 4 |
