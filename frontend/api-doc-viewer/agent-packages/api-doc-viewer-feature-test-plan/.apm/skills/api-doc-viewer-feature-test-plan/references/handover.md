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

## What QA receives

QA works from the branch on GitHub (or GitLab): a link to `qa-<feature>/` in the branch. The baselines live outside
the folder (`frontend/api-doc-viewer/packages/api-doc-viewer/src/it/…`), and a branch link keeps them and every link
working. A zip of the folder alone loses the baselines.

| Part | QA needs it |
| --- | --- |
| `test-plan/README.md` | Yes: the start page (setup, packages, passes, how to run and record a case, known limits) |
| `test-plan/results.csv` | Yes: one row per case; QA fills `Result`, `Tester`, `Date`, `Note` |
| `test-plan/**` case lists, `performance-testing.md` | Yes: the cases |
| `samples/packages/` | Yes: the packages to publish, each with a README of its cases |
| `README.md` | Yes: scope, host-app facts, the mandatory checks, known limits |
| `config/`, `tools/README.md`, a backlog analysis | No: for whoever rebuilds the data |

Tell the user, in the final message: the folder and the start page, the number of cases per pass and in total, the
packages to publish, what is not covered and why (unreachable cells, unverified flows), and the open decisions.
