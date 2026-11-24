# Tools

The scripts that build the data of this plan belong to the `api-doc-viewer-feature-test-plan` skill
(`.agents/skills/api-doc-viewer-feature-test-plan/`). This plan keeps only its config in
[config/](../config/test-plan.config.mjs). Run every command from the repository root, with
`S=.agents/skills/api-doc-viewer-feature-test-plan/scripts`.

## Packing generator

```bash
pnpm exec nx run-many -t build -p api-diff compatibility-suites ddlapi
node $S/packing/pack.mjs --qa qa-<feature>
node $S/packing/verify.mjs --qa qa-<feature>
```

## Results sheet

```bash
node $S/results-sheet.mjs --qa qa-<feature>
```

It keeps the `Result`, `Tester`, `Date`, and `Note` columns already filled in.

## Bundle for QA

```bash
node $S/bundle.mjs --qa qa-<feature>
```

It writes `qa-<feature>.zip` with the baselines copied in. Delete this folder once QA has reported.

## Backlog collection

```bash
node $S/backlog/collect-issues.js "$WORK" --config qa-<feature>/config/backlog.config.json
```

The remaining steps are in the skill's `references/backlog.md`.
