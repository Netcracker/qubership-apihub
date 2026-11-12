---
name: api-doc-viewer-feature-test-plan
description: Build a manual end-to-end QA test plan for a feature or fix of the api-doc-viewer viewers in a branch, ready to hand to QA — an interview, an analysis of the change and of the host app, packed test-data packages from the fixtures, case lists with steps and expected results, a GitHub and GitLab backlog retest, a results sheet, a QA start page, and a self-contained bundle for QA. Extends its own scripts when the change brings an API type they do not cover yet (for example new plain and with-diffs viewers). Use when the user asks for a QA or test plan of a branch, a feature, or a story that touches frontend/api-doc-viewer, or runs /api-doc-viewer-feature-test-plan.
---

# Feature test plan for QA

The skill turns a branch into a folder that QA can start from: `qa-<feature>/` at the repository root. QA runs the
cases in the host app (the APIHUB Portal, `frontend/ui/packages/portal`), not in Storybook. The automated screenshot
suites of api-doc-viewer are the catalogue of cases and the expected pictures; the plan packs their fixtures into a
few packages QA can publish, and writes a few hundred manual cases that combine them.

**The plan folder is temporary.** It is generated, handed to QA once as a bundle, kept until QA reports, and then
deleted; it is not committed to the main branch and no later plan refers to it. What lasts is this skill: its scripts,
templates, and [references/lessons.md](references/lessons.md), which every run updates (phase 9).

## Workflow

Run the phases in order. Report to the user at the end of each phase in a few lines and continue unless the phase
needs a decision. Every claim about behavior that reaches a case is checked against the code, the design documents,
or `apiDiff` output, never assumed.

### 1. Interview

Ask the questions of [references/interview.md](references/interview.md) before writing anything. Find every answer you
can yourself first (the branch diff, the design documents, the fixture catalogues) and ask the user to confirm or
correct it; ask only what the repository cannot tell you. Batch the questions, at most four per round, with
recommended options first.

### 2. Analyze the change, the host app, and the skill's coverage

Follow [references/analysis.md](references/analysis.md): the changed components from `git diff`, the API types that
share them (the regression scope), the design documents (`display-coverage.md` decides what is a defect), and the
host-app facts that limit what QA can reach (which display modes and layouts, which flows). Write the facts into the
plan README as a numbered table (P1, P2, …): they shape every case.

Then run the coverage check of [references/extending.md](references/extending.md): can the skill's builders read the
fixtures of every API type in scope, keep their IDs apart, and check them? For a new API type, or a fixture shape the
builders do not know, **extend the skill first** (a builder, a format module, the references), redeploy it, and prove
it on a throwaway plan. Say so to the user before starting: it is part of the work, not a detour.

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
regenerate. For a compact budget, merge the fixtures into composite operations (`builders/composite.mjs`); its own
apiDiff check leaves out what does not merge.

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

### 8. Bundle and hand over

Run the checks of [references/handover.md](references/handover.md), then bundle the plan for QA:

```bash
node $S/bundle.mjs --qa qa-<feature>
```

It writes `qa-<feature>.zip`: the plan without `config/` and `tools/`, with every baseline the sheet names copied in.
Tell the user what QA receives, and that the folder is to be deleted once QA reports. Do not commit the plan folder.

### 9. Update the skill

Before finishing, fold what this run taught into the skill ([references/extending.md](references/extending.md),
section "Updating the skill after every plan"): general code moved out of the plan's `config/`, new lessons, gaps in
the interview, the templates, or the references. Redeploy with `apm install --target cursor,claude` and list the
changed skill files for the user, to commit separately from anything else.

## References

| File | Read it for |
| --- | --- |
| [references/interview.md](references/interview.md) | The questions, what to find out before asking, and the defaults |
| [references/analysis.md](references/analysis.md) | Scoping the change, the regression, and the host-app facts |
| [references/extending.md](references/extending.md) | The coverage check, adding an API type, and updating the skill after a run |
| [references/test-data.md](references/test-data.md) | The packing engine, the config, the builders, the formats, and the checks |
| [references/cases.md](references/cases.md) | The case format, IDs, cells, oracles, budgets, and the mandatory checks |
| [references/backlog.md](references/backlog.md) | Collecting and selecting GitHub and GitLab issues and their samples |
| [references/handover.md](references/handover.md) | The final checks, the bundle, and the life of the plan folder |
| [references/lessons.md](references/lessons.md) | What was not obvious in earlier runs; read before phase 4 |
