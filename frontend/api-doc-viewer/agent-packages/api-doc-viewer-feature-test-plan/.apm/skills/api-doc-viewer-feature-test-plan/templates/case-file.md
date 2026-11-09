# <AREA>: <area name>

<What the area covers, in one paragraph.> How to open a case and read the columns:
[test-plan/README.md](../README.md) (section "How to run a case").

<Anything every case of the area shares, for example "the scheme under test is the second alternative: select it".>

## Plain

| Id | Cells | Case | Open | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| <AREA>-P-01 | D, S | <what is tested> | `<QA-PACKAGE>`: `<case-id>`, `<case-id>` | <actions after opening> | <what must be true; "as the baseline shows" where the picture says more> |

## With diffs

| Id | Cells | Case | Open | Steps | Expected |
| --- | --- | --- | --- | --- | --- |
| <AREA>-D-01 | DΔ | <what is tested> | `<QA-DIFFS-PACKAGE>`: `<case-id>` | Open each | <what must be true on each side> |
