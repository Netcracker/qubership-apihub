# Writing the cases

## Files

| File | Holds |
| --- | --- |
| `test-plan/<api-type>/NN-<area>.md` | One area of the changed viewer per file, with a `README.md` index of the folder |
| `test-plan/regression.md` | The other API types and the shared styles |
| `test-plan/backlog-retest.md` | The backlog issues ([backlog.md](backlog.md)) |
| `performance-testing.md` | The performance pass, when in scope |

An area file opens with one paragraph on what it covers and the line "How to open a case and read the columns:
[test-plan/README.md](../README.md) (section "How to run a case")", then a `## Plain` and a `## With diffs` table.
Start from `templates/case-file.md`.

## Table

```markdown
| Id | Cells | Case | Open | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| SEC-D-06 | DΔ | Required scope added and removed | `QA-DIFFS-SECURITY`: `dsec-11`, `dsec-12` | Open each | The scope row changes on the card; the toolbar option of the alternative has a change marker |
```

| Column | Rule |
| --- | --- |
| Id | `<AREA>-P-NN` (plain) or `<AREA>-D-NN` (diffs); other lists `<AREA>-NN`. Two-digit numbers. The results sheet reads only rows whose ID matches `^[A-Z][A-Z0-9]{1,3}(-[A-Z])?-\d{2}$` |
| Cells | `D` (plain, detailed), `S` (plain, simple), `DΔ` (diffs, detailed), `SΔ` (diffs, simple) — only the cells the host app reaches |
| Case | What is tested, in a few words |
| Open | The package and the backticked package case IDs, exactly as the manifest has them; "version `1.0`" for a plain look at one side of a diffs package |
| Steps | The actions after opening; empty means "open it and look" |
| Expected | What must be true, from the fixture catalogue, the design, or `apiDiff` output; name the baseline ("as the baseline shows") where the picture says more than words |

## How many and how to combine

- Agree the budget in the interview (200–300 for a large change). Spread it over the areas by the size of their
  fixture suites and by risk, and write the budget table into the plan README.
- One manual case covers several fixture cases that differ only in a value (added, removed, changed; three scheme
  kinds; four parameter groups). Whole-section and whole-operation adds and removes, and selector options, get cases
  of their own: they repaint the view.
- For a compact budget (30–60 cases), open composites (test-data.md, "Composite cases"): one case per section of a
  composite (query parameters of `cprm-01`, response codes of `crsp-01`), the members listed by group in Expected,
  each "as its member's baseline shows". Whole-operation adds and removes and the evicted members join the case of
  their section. Sample a large programmatic matrix evenly (every n-th combiner case) rather than dropping it.
- Give `S` only to cases with annotations (descriptions, external docs), plus one sanity case per area.
- Portal-flow cases (preview pane, deep links, every comparison flow, filters, swap, navigation) are written from the
  host-app analysis; mark flows you could not verify as such.

## Expected results

- Read `display-coverage.md` before asserting a row: an intentional gap is not a defect, and the case says "not shown
  (intentional gap)".
- For a new sample, run `apiDiff` on it and write the expected result from what it reports. A change that `apiDiff`
  reports but the viewer cannot show (an unsupported keyword) becomes "record what you see per keyword".
- Where the expected picture is uncertain (a flow not verified, a value only a default changes), write "record what
  you see" instead of a guess.
- Never copy a claim from an issue or an earlier draft without checking it against the code or the design.

## Mandatory checks

A check that applies to a kind of case (for example NF: the portal does not freeze, and the browser tab icon stops
spinning within 30 seconds) is written once, in the plan README, and named in each case's Expected (`**NF.**`) or
listed in `nfCases`. The tab icon spins only on a full page load: the check opens the case in a new tab or with F5.

## Links

Link files, not sections of other files: `[test-plan/README.md](../README.md) (section "How to run a case")`. IDE
previews do not follow `other.md#anchor`, and a link to a folder does not resolve; give a folder a `README.md` index
and link that.
