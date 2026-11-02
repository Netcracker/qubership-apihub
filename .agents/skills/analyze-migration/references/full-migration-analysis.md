# Full migration comparison

Reached from [SKILL.md](../SKILL.md) section 0 when the user chose the full comparison.
Compare the previous and current reports on one APIHub deployment, with backend/consumer code review and
error/suspicious build investigation only for the current migration (`MIG_ID`).
Use `PREV_MIG_ID` only for report comparisons. Do not fetch its suspicious samples, build archives, or DB diagnostics,
or investigate the causes of its builds. Preserve full migration IDs and build IDs in every output.
This is a detailed comparison of reports with investigation of selected builds; state the actual sample coverage.

Tools, `.env.before`/`.env.after`, and the execution boundary are already loaded per
[SKILL.md](../SKILL.md) section 1 for this mode (both files, all variables in the table required).

## 1. Retrieve and compare both reports

The existing helpers read `MIGRATION_ID`. For each request, set this process variable to `PREV_MIG_ID` or `MIG_ID`.
Reload the API key for each helper invocation; the helper clears keys in its own process.
Do not add `MIGRATION_ID` to the env files or assume it is automatically populated from the new names.

From the repository root, invoke [get-migration-report](../scripts/get-migration-report/) once for each ID:

```bash
go -C .claude/skills/analyze-migration run ./scripts/get-migration-report/
```

Save each successful JSON response with its migration ID and collection time in the run directory.
Use local JSON processing for calculations and grouping; read selected portions when output is too large.

Compare the union of stages and categories from both reports. Include:

- Status, start/end times, elapsed time, and available total/success/error/suspicious build counters.
- Stage names, statuses, counts, durations, missing or added stages, and unusual slowdowns or incomplete stages.
- Each `migrationChanges` category and its `affectedBuildsCount`.
- Error groups from `errorBuilds[].error`: new, resolved, persistent, and changed counts.

Show previous value, current value, and absolute delta. Show percentage change only when the previous value is non-zero.
Interpret omitted counters using the confirmed backend version's response contract.
In `MigrationReport`, `successBuildsCount`, `errorBuildsCount`, `suspiciousBuildsCount`,
`notMigratedVersionsCount`, and `notMigratedComparisonsCount` are integer fields with `omitempty`: omitted values mean zero.
For example, five errors followed by an omitted `errorBuildsCount` means 5 -> 0, a delta of -5.
Keep the saved JSON unchanged. Other missing fields, or counters from an unverified contract, remain unknown.
Category counts overlap; do not sum them as distinct builds.
Check whether package scope, inputs, build types, or migration options changed before attributing count or timing differences to code.
Keep failed/cancelled outcomes distinct. A running/cancelling migration permits only an interim comparison.
`errorDetails` describes the migration-level failure; use `errorBuilds[].error` for individual build errors.

## 2. Review backend and library changes, then pause

Compare each repository using its own before/after branches:

| Repository | Branch variables |
| --- | --- |
| `Netcracker/qubership-apihub-backend` | `BACKEND_BRANCH_BEFORE`, `BACKEND_BRANCH_AFTER` |
| `Netcracker/qubership-apihub-build-task-consumer` | `BUILD_TASK_CONSUMER_BRANCH_BEFORE`, `BUILD_TASK_CONSUMER_BRANCH_AFTER` |

Use [get-release-evidence](../scripts/get-release-evidence/) from the repository root. Replace the uppercase placeholders:

```bash
go -C .claude/skills/analyze-migration run ./scripts/get-release-evidence/ commit OWNER/REPO BRANCH
go -C .claude/skills/analyze-migration run ./scripts/get-release-evidence/ compare OWNER/REPO BEFORE_SHA AFTER_SHA
go -C .claude/skills/analyze-migration run ./scripts/get-release-evidence/ file OWNER/REPO SHA FILE_PATH
go -C .claude/skills/analyze-migration run ./scripts/get-release-evidence/ pulls OWNER/REPO SHA
go -C .claude/skills/analyze-migration run ./scripts/get-release-evidence/ pr OWNER/REPO NUMBER
```

Resolve branches to full SHAs once and reuse them. A branch's present head does not prove the deployed version; state any unverified mapping.
A failed compare is missing evidence, not zero changes. Report diverged histories.
The compare helper does not paginate; check returned commit count against `ahead_by`.
If incomplete, use paginated `gh api --method GET` reads for that comparison; inspect relevant commit details and source separately.

The consumer is mainly a wrapper. Compare its `package.json` and lockfile at both SHAs.
Follow changes in resolved library versions, especially `qubership-apihub-api-processor`.
Find each relevant library's repository and exact version/tag/commit in GitHub; inspect the library diff and affected functions.
Do not stop at dependency version numbers or consumer commits. If a version cannot be mapped to source, record that evidence gap.

For each relevant behavioural change, give its explanation, commit URL, and source permalink at the inspected SHA with line numbers.
Use `https://github.com/OWNER/REPO/commit/SHA` and `https://github.com/OWNER/REPO/blob/SHA/path#Lx-Ly`.
Fetch PRs and linked issues only when they help explain those changes; reuse previously fetched evidence.

Return the component/library refs, changes, proof links, and expected effects.
**Ask the user to confirm the code review and stop. Proceed to build investigation only after explicit confirmation.**

## 3. Investigate every failed build in MIG_ID

After confirmation, set process `MIGRATION_ID` to `MIG_ID` and analyse every build in the current report's
`errorBuilds` individually, retaining original messages and full build IDs.
Group findings by error cause only after investigating each build; a representative build cannot replace the others.
For report comparisons, match builds using only the collected report fields:
package, version, revision, build type, and comparison sides where present.
Build IDs can differ between runs; do not use them alone to identify new or resolved failures.
Matching report entries does not establish that their underlying causes are the same; do not investigate previous builds.

Use the bundled scripts to investigate each failure. Where needed, inspect its source/result archives using section 4.1
and use [targeted DB diagnostics](database.md) with `MIG_ID` and the connection from `.env.after`.
Trace the error from the offending input and build configuration to the parser/processor/backend code.
Explain why the current build failed and what action follows. Describe previous occurrences only from the collected reports.
Distinguish an input problem, configuration issue, code regression, or unresolved cause using evidence.
A repeated error text does not prove a shared root cause. Current DB rows do not establish historical state.
For every failed build, report the cause and cite evidence: migration/build ID, JSON field, archive member/lines, or DB query result.
Link the causal PR or commit and source permalink when established, using the code review from section 2.
If no code change caused the failure, explain why no causal PR or commit applies.
If the cause remains unproven, report **insufficient data**, the evidence inspected, and the specific missing evidence for that build.

If this request is actually about understanding the causes behind a large `errorBuilds` list rather than comparing two
migrations end to end, consider [error-builds-analysis.md](error-builds-analysis.md) instead — it classifies every
error build by message pattern and resolves most of them from the database without the code-review gate above.

### 3.1. Expand critical errors from sources

For every current `errorBuilds` entry containing a number followed by `critical errors`, including inside a restart-limit
message, perform these steps. Apply this to every matching build, regardless of its assigned category; do not sample builds.

1. Download `GET /api/v2/admin/builds/{buildId}/sources` for that exact build using the
   [download-archive helper](local-tools.md#download-a-build-archive) with the `sources` argument.
   Reuse that build's archive if already downloaded. Follow section 4.1 for credentials, storage, and safe ZIP handling.
   This source investigation is required even if the aggregate error or existing evidence already explains why release publication was blocked.
2. Read `apihub_build_config.json`. Match the document names in the error to `files[].slug` and their archive members
   through `files[].fileId`. Inspect the actual documents and follow relevant `$ref` references, including referenced schemas.
   Downloading the archive or confirming that the files exist is not the analysis.
3. Identify the specific violations using the source contents, build settings, and relevant processor rules.
   For suspected cross-document conflicts, compare the affected operations and their referenced schemas; matching operation IDs
   or differing text alone do not establish an error. Use available processor code to establish which differences matter.
   Keep investigating the available documents when historical notifications are absent; their absence does not prevent source analysis.
4. Add a numbered list of all established errors for that build to the existing report. Give each error's explanation,
   document, and archive path with a line or JSON pointer. Identify the package, version, revision, and full build ID.
   Preserve the report's sections, build tables, cause explanations, and conclusions; use a supplied previous report as the layout reference.
   Put long error lists below the existing build table and link them from the corresponding rows in the same report.
   This is an addition to the report, not a replacement with a separate report or a new classification scheme.
5. Check the findings against the reported N. Include every established error, not a representative example or another aggregate summary.
   Distinguish source-analysis findings from verbatim historical builder messages. Do not invent messages, count each textual
   difference as a violation, or duplicate findings merely to reach N. If all N cannot be established, show the confirmed findings
   and explicitly state how many reported errors remain unaccounted for, or why their count cannot yet be reconciled.
   If the archive is unavailable, report the request outcome for that build and continue with the other builds.

## 4. Investigate every suspicious category in MIG_ID

For every suspicious category with affected builds in the current report, retrieve up to five samples from `MIG_ID` only.
Categories found only in the previous report remain in the count comparison; do not investigate their builds.
Set process `MIGRATION_ID` to `MIG_ID`, reload API credentials, then run:

```bash
go -C .claude/skills/analyze-migration run ./scripts/get-suspicious-builds/ CATEGORY
```

These are the first samples returned by the API, not random samples. Do not fetch additional sample pages.
If fewer than five builds are returned, analyse all available builds and state the actual count; record request failures explicitly.
Analyse every returned build in each category individually, preserving category, object keys, full build ID, and old/new values.
Use the code changes established in section 2 to explain each difference, consulting source/result archives and DB diagnostics where needed.

For each observed change or error cause, cite data evidence (migration/build ID, JSON field or archive member)
and the causal commit plus source permalink when established. A PR title or hash change alone is insufficient.
When the cause is unproven, mark it **insufficient data** and name the missing evidence; never invent a commit.
Use **expected**, **unexpected / possible defect**, or **insufficient data** for suspicious changes.
Prefer grouping categories when evidence shows that the same code change and mechanism explain their samples.
List every category in each group and give its evidence and an explicit group verdict; otherwise report categories separately.
Split groups where causes or verdicts differ. An **expected** verdict requires evidence that the observed values follow the intended code behaviour.
Every current category with affected builds must have an explicit verdict, individually or through its named group,
including categories with unavailable evidence.
Do not generalise sampled findings to all builds or classify all suspicious builds as errors.

If a specific fact still needs SQL, use [targeted DB diagnostics](database.md).
Use `MIG_ID` and the connection from `.env.after`. Current rows do not establish historical state.

### 4.1. Download, decompress, and read build archives

For steps 3 and 4, first use the collected reports, JSON samples, and code evidence.
In full comparison mode, download archives only for builds from `MIG_ID`.
Download an archive only when it is needed to establish a cause or verdict; identify the specific missing evidence before the request.
Choose `sources`, `result`, or both according to that need. Do not download archives for every build or category by default.
Skip archive downloads when the available evidence already supports the finding; analysing every sample does not require downloading every archive.
The source analysis for each `N critical errors` build in section 3.1 is required and takes precedence over this general download guidance.

The bundled Go [download-archive helper](../scripts/download-archive/) uses `APIHUB_API_KEY` for these exact GETs:

- `/api/v2/admin/builds/{buildId}/sources`
- `/api/v2/admin/builds/{buildId}/result`

Replace `{buildId}` with the full validated UUID from the report. These endpoints return binary ZIP data;
do not use `get-apihub`, which decodes JSON and selects the viewer key for these paths.
Load `APIHUB_URL` and `APIHUB_API_KEY` into the process environment, then use the command in
[local-tools.md](local-tools.md#download-a-build-archive). The helper validates the URL and UUID, refuses redirects,
verifies TLS, applies a timeout, and clears process keys. It checks the HTTP status and ZIP structure before saving
and refuses to overwrite existing files.

Save a successful response as `<run>/<migrationId>/<buildId>/sources.zip` or `result.zip`; reuse it if the build appears again.
Check HTTP status and ZIP validity before reading. Record 404 as unavailable evidence; a failed build may have no result archive.
Record 401/403 as an access limitation with the existing key, without requesting a different key or broader permissions.
Continue analysing available sources and code when an archive is unavailable; do not treat the absent archive as an empty successful result.

List ZIP member names and sizes first. Decompress only the relevant members to memory, or extract them under that build's directory.
Use `zipfile.ZipFile` in Python or `ZipArchive` in .NET; no external unzip tool is required.
Reject absolute/traversal paths and symlinks when extracting. Check expanded sizes before reading to avoid unbounded extraction.
Read `apihub_build_config.json`, the input named by the error, and relevant generated documents/operations or comparison data.
Cite archive member paths and relevant fields or lines. Do not execute archived files or read bundled logs.

## 5. Report findings

Write one complete, self-contained report in English with findings, evidence, and verdicts in the run directory:
`migration-report-<PREV_MIG_ID>-<MIG_ID>-<UTC_TIMESTAMP>-en.md`. Do not create a Russian version.
Preserve original error text and quoted evidence verbatim.

Include:

- APIHub URL without credentials, both full migration IDs, collection times, statuses, counter and stage comparisons.
- Backend/consumer branches, pinned SHAs, changed library versions, and the confirmed code review with commit/source links.
- A finding for every failed build in `MIG_ID`: original error, full build ID, new/persistent classification from report fields where established, cause, evidence, and action.
  Include resolved failures only in the report comparison, without investigating their causes.
- Current suspicious categories grouped as described in section 4, with every inspected build, old/new values, causes, and data/code evidence.
- A summary table listing every suspicious category, its group if any, PREV/CUR counts and delta, sample coverage, verdict, and evidence links.
  Sample coverage and verdicts apply to `MIG_ID`; mark these fields as not applicable for categories with no current affected builds.
- Missing archives or other evidence, hypotheses, coverage limits, and concrete next actions.

Before finalising, check that the report covers every failed build and returned suspicious sample from `MIG_ID`,
and count comparisons for every category from either migration. State that previous builds were not investigated.
Keep unresolved cases visible with **insufficient data** and the missing evidence; do not omit categories or replace their analysis with future tasks.
Never shorten build IDs, including in tables, captions, filenames, or the conversational summary.
Use full commit SHAs in proof URLs. For data/configuration causes without a code change, explain why no causal commit applies.
Keep credentials and sensitive source contents out of the report; use the necessary excerpt and a local evidence path.
Return the main findings and the path to the English report.

## Keep context small

Fetch each report once and reuse evidence across the confirmation pause.
Calculate deltas and group errors locally; show compact summaries and only the source/archive excerpts needed for a verdict.
Read the DB reference only when needed. Reuse each downloaded archive, inspected source file, PR, and issue.
Keep complete IDs and original evidence in saved results; reduce repeated text, not analysis coverage.
