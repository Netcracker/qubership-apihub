# Finishing and handing over

## Final checks

- `verify.mjs` reports 0 failures; the results sheet builds without errors.
- Every relative link resolves, and no link points at a section of another file (IDE previews do not follow
  `other.md#anchor`): write `[file](path) (section "Heading")`.
- Markdown prose lines stay within 120 characters (tables and code are exempt); one H1 per file.
- The counts in the documents agree: packages and cases in the plan README, the tools README, the start page, and the
  budget table; the number of rows in `results.csv`.
- No case asserts something unverified: search for claims about colors, rows, or counts and check each against the
  design, a baseline, or `apiDiff`.
- Generated folders are not edited by hand (`samples/packages/`, `results.csv` except its four result columns).

## The bundle

```bash
node .agents/skills/api-doc-viewer-feature-test-plan/scripts/bundle.mjs --qa qa-<feature> [--out <dir>]
```

`qa-<feature>.zip` holds everything QA needs and nothing it does not:

| Part | In the bundle |
| --- | --- |
| `test-plan/README.md` | The start page: setup, packages, passes, how to run and record a case, known limits |
| `test-plan/results.csv` | One row per case; QA fills `Result`, `Tester`, `Date`, `Note`. Its `Baselines` column points into `baselines/` |
| `test-plan/**` case lists, `performance-testing.md` | The cases |
| `samples/packages/` | The packages to publish, each with a README of its cases |
| `baselines/` | The screenshot baselines the sheet names, copied from the repository |
| `README.md` | Scope, host-app facts, the mandatory checks, known limits |
| Not included | `config/` and `tools/`: they only rebuild the plan |

The zip is several megabytes (13 MB for about 450 cases); share it the way the team shares large files.

## The life of the plan folder

1. **Generate** it in the feature branch, without committing it to the main branch.
2. **Hand it over once**, as the bundle. Rebuild and resend only when the cases or the test data change.
3. **Keep it** locally (or in a temporary commit of the feature branch that is dropped before the merge) while QA
   runs the passes: `results.csv` comes back with results, and the backlog retest may need follow-up issues.
4. **Delete it** when QA reports and the issues are filed. Nothing outside the folder refers to it, and no later plan
   reuses it; anything worth keeping went into the skill in phase 9.

Tell the user, in the final message: the bundle and its size, the number of cases per pass and in total, the packages
to publish, what is not covered and why (unreachable cells, unverified flows), the open decisions, and the skill files
phase 9 changed.
