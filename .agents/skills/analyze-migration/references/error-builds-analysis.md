# Error-builds-only root cause analysis

Reached from [SKILL.md](../SKILL.md) section 0 when the user chose error-builds-only analysis.
Scope: classify and investigate the cause of **every** entry in `errorBuilds`, individually, with full build IDs
preserved. This branch skips the mandatory code-review pause and the suspicious-category sampling of
[full-migration-analysis.md](full-migration-analysis.md); it does not replace that file for a request that needs a
full stage/counter comparison or a backend/consumer code review across the whole migration.

Tools and the execution boundary are already loaded per [SKILL.md](../SKILL.md) section 1 for this mode.
This mode needs only `APIHUB_URL`, `APIHUB_API_KEY`, and `MIG_ID` from `.env.after`, plus DB connection values for the
side being queried. `PREV_MIG_ID` is required only when the user also wants a persistent/new/resolved comparison
against a previous migration.

## GitHub branches are optional in this mode — do not stop without them

`BACKEND_BRANCH_BEFORE/AFTER` and `BUILD_TASK_CONSUMER_BRANCH_BEFORE/AFTER` are **not required** here, unlike in
`full-migration-analysis.md`. Categories A–D below are resolved entirely from the migration report and the database;
only the optional code-evidence step for category E in section 3 uses them. If these variables are missing, empty, or
the user says they have no GitHub branches to give: do not ask again, do not block, and do not skip any build. Keep
investigating every build with the evidence that is available (report fields, the build notifications table via
`query-build-notifications`, `query-version`, archives), and for category E state explicitly that code-evidence against
backend/build-task-consumer is unavailable
for that reason — this is a named evidence gap, not a reason to abandon the analysis.

## 1. Retrieve the report(s)

Set process `MIGRATION_ID` to `MIG_ID`, reload the API key, and run:

```bash
go -C .claude/skills/analyze-migration run ./scripts/get-migration-report/
```

If `PREV_MIG_ID` is set and the user wants a persistent/new/resolved comparison, repeat for that ID. Save each
response with its migration ID and collection time in the run directory, as in the full-comparison flow.
Take the `errorBuilds` array (and `errorBuildsCount`) from the current report; treat an omitted `errorBuildsCount` as
zero, per the same contract as `full-migration-analysis.md` section 1.

## 2. Classify every errorBuilds entry

For each entry, normalise `error` by stripping variable numbers and document/package name lists, and assign exactly
one category. Do this for all entries before investigating any of them — the categories determine which script or
evidence to use next, not whether to investigate a build.

| Category | Normalised pattern | Nature |
| --- | --- | --- |
| A | `Cannot publish version in release status: N critical errors in following documents: ...` | Content-validation failure reported by the builder; the per-document reasons live in the build notifications table (`error_build_notification` / `build_notification` / legacy `builder_notifications` — see [database.md](database.md)). |
| B | `...cannot be published because it contains errors and is the previous version of: ...` | Cascade: this build's own cause is that its referenced previous version (`previousVersion`/`previousVersionPackageId` on the entry) already failed. |
| C | `No such version: version X, packageId Y` | The referenced previous version does not exist for this build — a scope/chain gap, not a content defect. |
| D | `Restart count exceeded limit. Details: <inner text>` | Not an independent cause. The backend wraps the build's prior `details` after the restart limit (2) is reached (`BuildRepository.go` `FindAndTakeFreeBuild`). |
| E | Anything else, especially a message seen on only one or two builds | Candidate for a code-level cause (parser, builder, consumer) rather than a per-package content issue. |

Record the assigned category and the stripped variable parts (document names, counts, referenced package/version) for
every build; they are the arguments to the scripts in section 3.
Use the Go `error-builds classify` command described in [local-tools.md](local-tools.md) to prepare the complete build list.
It resolves cascade links from the report's previous-version fields, using the specified revision when present.
Ambiguous matches remain unresolved; never select the highest revision as a substitute for missing evidence.

## 3. Resolve each category

Investigate every build individually. "Individually" means every build gets its own cause and evidence in the report,
not that every build requires a fresh, independent investigation when its cause is already established by another
build in this same report — reuse is only permitted along the specific links named below (cascade root, unwrapped
inner message), never from a merely similar-looking error text.

For every build whose error contains `N critical errors`, including a wrapped message, also follow
[Expand critical errors from sources](full-migration-analysis.md#31-expand-critical-errors-from-sources).
Download and inspect that build's sources and include all established individual errors in this report, preserving its existing structure.
This procedure applies in this mode without the full-comparison code-review pause.

**Category A.** Run:

```bash
go -C .claude/skills/analyze-migration run ./scripts/query-build-notifications/ "$MIGRATION_ID" "$BUILD_ID"
```

This returns the notification rows (`severity`, `category`, `message`, `document_id`) behind the document list in
the error, from whichever of the three known table names actually exists on this deployment — the script reports
which one in `notifications_table`; cite that field alongside the row(s) as evidence (see [database.md](database.md)
for why the name varies). If `PREV_MIG_ID` is set, check whether the same package/version/document
had the same message in the previous report's matching build; classify the build **persistent** when it did and
**new** when it did not, using the same build-matching rule as `full-migration-analysis.md` section 3 (package,
version, revision, build type — not build ID). An empty `rows` result with `build_found: true` is not an unexplained
error; fall back to `build.details` from the same query output, or to the result archive (section 4.1 of
[full-migration-analysis.md](full-migration-analysis.md)) before reporting insufficient data.

**Category B.** Using the stripped `previousVersion`/`previousVersionPackageId` from section 2, find the build in the
*same* report whose `packageId`/`version` match. If found, this build's cause is that root build's cause (classify
the root first if not already done); report this build as **cascade of `<root build ID>`**, with the root's evidence
cited, not re-derived. If no matching build exists in this report (it may belong to a different migration or be out
of scope), report **insufficient data** and name exactly which package/version/revision is missing.

**Category C.** Run:

```bash
go -C .claude/skills/analyze-migration run ./scripts/query-version/ unmigrated-version "$MIGRATION_ID" "$PACKAGE_ID" "$PREVIOUS_VERSION" "$PREVIOUS_REVISION"
```

Use `release-status` instead when the question is specifically that version's status rather than its migration
scope. Determine whether the referenced version was ever in scope for this migration (expected skip) or should have
existed and does not (chain-building defect, worth a category-E-style code look if it recurs).

**Category D.** Parse the inner text after `Details:` and re-run this section's classification (A/B/C/E) on that
inner text as if it were the build's own `error`. Report the build as **D → `<inner category>`**, with the inner
category's cause and evidence, plus the retry exhaustion itself as a separate infrastructure fact — it is not a
backend or consumer code defect.

**Category E.** Use the same archive procedure as `full-migration-analysis.md` section 4.1: download `sources.zip`
and/or `result.zip` for the specific build, locate the file/line named by the error. When GitHub branches are
available (see the note above), use [get-release-evidence](../scripts/get-release-evidence/) against the backend
and/or build-task-consumer repository to check whether the parser/validator path named by the error changed between
`BACKEND_BRANCH_BEFORE`/`AFTER` or `BUILD_TASK_CONSUMER_BRANCH_BEFORE`/`AFTER`. When they are not available, state
that this step was skipped for that reason and give the verdict from archive evidence alone. Use **code regression**,
**pre-existing input issue**, or **insufficient data**, each with its cited evidence.

## 4. Report findings

Write one English Markdown report in the run directory, with one
row per `errorBuilds` entry — no exceptions, no sampling:

| Build ID (full) | Package / Version / Revision | Original error text | Category | Cause and evidence | Persistent / new / cascade-of / insufficient data |
| --- | --- | --- | --- | --- | --- |

Precede the table with a per-category count summary, and separately list every category-E build (they are typically
few and are the ones worth a code-level conclusion). State explicitly whenever GitHub branches were unavailable and
which category-E verdicts are therefore limited to archive evidence only.

### 4.1. Export a separate Excel workbook

Alongside the Markdown report, create `error-builds-<MIG_ID>-<UTC_TIMESTAMP>.xlsx` in the same run directory.
The Excel workbook is a required deliverable. Write sheet names, headings, findings, and category explanations
in English only; preserve original error text and quoted evidence verbatim. Include:

- One English detail sheet with one row per current `errorBuilds` entry, without sampling or omissions.
  Use separate columns for full build ID, package ID, version, revision, category, original error text,
  cause and supporting evidence, and classification/notes. Preserve IDs, versions, and revisions as text.
- A summary sheet with the full migration ID, total analysed build count, and counts by category.
  Include English explanations of all categories A–E from section 2, even if a category has no builds.
  Explain `D -> <inner category>` and distinguish the restart-limit wrapper from the underlying cause.

The workbook must be understandable without opening the Markdown report: category letters alone are insufficient.
Give each build its specific cause and evidence, not just the category description. For cascades, include the full
root build ID and its established cause; for unresolved builds, retain `insufficient data` and name the missing evidence.

Before returning the files, reopen the workbook and verify that the detail sheet contains every analysed build,
the category totals match the detail rows, and the category explanations are present. Keep the workbook and Markdown
findings consistent. Return links to the Excel workbook and the English Markdown report.

Use `error-builds build-report`, `render-report`, and `build-xlsx` from [local-tools.md](local-tools.md).
The commands reuse collected notifications and per-build findings; they do not replace the investigation in section 3.
Review generated findings and supply missing evidence before the final export. Keep unresolved causes explicit.

## Keep context small

Classify all entries once, in one pass, before calling any script. Reuse a root build's evidence for every build that
cascades from it (category B) and an inner category's evidence for every build that wraps it (category D) — this is
reuse of already-obtained evidence per build, not a reduction in how many builds get a reported cause.
Reuse each downloaded archive and DB query result; do not re-run `query-build-notifications` for a build already
resolved in this run.
