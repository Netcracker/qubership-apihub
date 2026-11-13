# QA start page: <feature>

Start here to test the `<branch>` branch in the APIHUB Portal. <One or two sentences: what the branch changes, and
which other API types share the changed code.> The plan has <N> cases in [results.csv](results.csv); this page says
what to set up, in which order to run them, how to read a case, and how to record the result. The background of the
plan is in the [main README](../README.md).

## Before you start

- The stand with the branch build<, and the stand of the previous release for the performance pass>.
- Chrome, the window at 1920 × 1080 unless a case says otherwise, DevTools open on the Console tab.
- Edit rights in a workspace where you can create packages.

## Publish the test data

Each folder of [samples/packages/](../samples/packages/README.md) is one package: create a package with the folder's
name and publish its files. A diffs package has two folders: publish `1.0/` as version `1.0`, then `2.0/` as version
`2.0` with `1.0` as the previous version. The package README says the same and lists every case of the package.

| Priority | Packages | Needed by |
| --- | --- | --- |
| 1 | `<QA-…>` | <areas> |

## Passes

Run the passes in this order. A pass stops when it finds a blocker; report it before going on.

| Pass | Case list | Cases |
| --- | --- | ---: |
| 1. <name> | [<file>](<path>) | <n> |

## How to run a case

A case is one row of a case list, and one row of [results.csv](results.csv) with the same ID.

| Column | Meaning |
| --- | --- |
| Cells | Where to check it. `D`: the operation page in `Doc`. `S`: the operation page in `Simple`. `DΔ`: the operation in a comparison. |
| Open | The package and the case IDs to open. A case ID is a path prefix: `dsec-11` is every operation whose path starts with `/dsec-11/`; type the prefix into the operation search. In a package of one document per case, a case ID names the document. "Version `1.0`" means the operation page of that version, not the comparison. |
| Steps | What to do after you open it. Nothing written means: open it and look. |
| Expected | What must be true. Where it says "as the baseline shows", compare with the picture in the `Baselines` column of the sheet (a path in this folder, `baselines/…`). The portal is narrower than the baseline, so compare the content (rows, texts, colors, markers), not the pixels. |

<When the plan uses composite operations, keep this paragraph:> **Composite operations.** Most cases open a
composite: one operation that merges the operations of many fixture cases (its members). The composite table at the
end of the package README lists the members of each composite, with the fixture and the baseline of each. A name that
another member already uses with a different value carries the member's case ID (a parameter `status_dqp-07`, a media
type `application/vnd.drsb-02+json`). To check a member, find its rows by the case ID and compare them with its
baseline.

To open a case in a comparison: open the package, version `2.0`, compare it with `1.0`, then open the operation from
the list of changed operations (search the prefix there too).

Reading a comparison: the left side is version `1.0`, the right side `2.0`. Added content is on the right only and
removed content on the left only, with a grey placeholder on the other side; a changed row is yellow on both sides.
A colored bar on the left edge of a row shows the severity of its change.

Cases marked "(marker)" in a package README have no change that the comparison engine reports, so their operation
gets a description "QA marker: …" in version `2.0` to make the comparison list it. Ignore that description.

## Mandatory checks

<Each mandatory check in one paragraph, with a link to its section in the main README, for example:> Every case with
`yes` in the `NF` column of the sheet also checks that the portal does not freeze and the browser tab icon does not
spin without end: [main README](../README.md) (section "Mandatory check NF: the portal does not freeze").

## Record the result

Open [results.csv](results.csv) in Excel or Google Sheets (File → Import, comma separated, UTF-8). Fill in four
columns only:

| Column | Values |
| --- | --- |
| Result | `OK`, `Not OK`, `Blocked` (the case cannot be run), or `Not tested` (the default) |
| Tester | Your name |
| Date | The date of the run, `YYYY-MM-DD` |
| Note | For `Not OK`: what differs, and the link to the issue you filed. For `Blocked`: why. |

A case is `Not OK` when any of its expected points, or a mandatory check, fails; it is `OK` when all of them hold.
Save the sheet back as CSV (UTF-8, comma separated): a rebuild keeps the four columns.

## Report a failure

File an issue with the case ID and title, the package, the operation (prefix), the versions, the cell and the window
width, a screenshot and the baseline you compared it with, and the console errors. For a backlog case, comment on the
original issue, or link it from the new one when the original is closed.

## Known limits

These are not defects of the branch; do not file them.

| Limit | Why |
| --- | --- |
| <A cell the host app cannot reach> | <The host-app fact> |
