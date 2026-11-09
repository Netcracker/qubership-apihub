# QA test plan: <feature>

**QA: start at [test-plan/README.md](test-plan/README.md).** It covers the setup, the order of the passes, how to
read a case, and how to record results in [test-plan/results.csv](test-plan/results.csv).

Manual end-to-end testing of the `<branch>` branch in the APIHUB Portal (`frontend/ui/packages/portal`). <What the
branch changes, and which shared code other API types use.>

## Contents

| Path | What it holds |
| --- | --- |
| [test-plan/README.md](test-plan/README.md) | The QA start page |
| [test-plan/results.csv](test-plan/results.csv) | The results sheet (generated; QA fills Result, Tester, Date, Note) |
| [samples/packages/](samples/packages/README.md) | The test-data packages (generated) |
| [config/](config/test-plan.config.mjs), [tools/README.md](tools/README.md) | The config of the skill's scripts, and how to rebuild the data |

## Scope

| Area | In scope |
| --- | --- |
| <viewer>, plain | <host pages, display modes> |
| <viewer>, with diffs | <comparison flows> |
| Regression | <other API types> |
| Backlog | <repositories and boards> |
| Performance | <documents, thresholds> |

Out of scope: <…>.

## Facts about the portal that shape the plan

| # | Fact | Where | Effect on testing |
| --- | --- | --- | --- |
| P1 | <what the host app does> | <file> | <what QA can and cannot reach> |

## Decisions needed

1. <A cell the host cannot reach: add a control, test it elsewhere, or record it as not tested.>

## Case budget

| Area | Prefix | Plain | Diffs | Total | Source fixtures |
| --- | --- | ---: | ---: | ---: | --- |
| <area> | `<AREA>` | <n> | <n> | <n> | <suite folders> |

## Mandatory check NF: the portal does not freeze

Every case with cyclic references or deep schemas (5 or more levels) includes the check `NF`. It passes when the
portal does not freeze and does not get stuck in endless loading:

1. Open the case with a full page load: paste the URL into a new tab, or press F5. A navigation inside the portal does
   not make the browser tab icon spin.
2. The tab icon stops spinning and turns back into the APIHUB icon.
3. The viewer content appears; no loader runs without end.
4. After every action of the case, the page responds to a click or a scroll.
5. No "Page Unresponsive" dialog; no `RangeError` in the console.

`NF` fails when the tab icon still spins, or the page does not respond, 30 seconds after the click. A failed `NF`
fails the case.

## Oracles

| Oracle | Use |
| --- | --- |
| The screenshot baseline of the same fixture | The expected picture; compare content, not pixels |
| `frontend/api-doc-viewer/docs/design/` | The expected behavior; `display-coverage.md` lists intentional gaps |
| The previous release stand | The expected semantics of the portal flows |
| The browser console | No errors |
