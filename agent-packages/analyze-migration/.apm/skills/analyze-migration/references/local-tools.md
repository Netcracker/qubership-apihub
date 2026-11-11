# Local Go helpers

Run these commands from the repository root. Replace angle-bracket placeholders and use absolute input/output paths:
`go -C` changes the working directory to the skill. Create a new run directory under this skill's `migration-reports/`
before writing evidence or reports. Helpers refuse to overwrite existing files and return a non-zero exit code on failure.

The helpers belong to this skill's own Go module. Run `go -C .claude/skills/analyze-migration mod tidy` once in a new
checkout before compiling them. Excel generation uses `github.com/xuri/excelize/v2`, pinned to the version already used
by the main service. It does not require Microsoft Excel, PowerShell, or a separate Python package.

## Classify error builds and resolve cascades

```bash
go -C .claude/skills/analyze-migration run ./scripts/error-builds classify -in "<run>/report.json" -migration-id <MIG_ID> -out "<run>/classified.json"
```

The input is either the saved `get-migration-report` response (`report` envelope) or the raw migration report.
The helper checks `errorBuildsCount` against the full build list, classifies A–E, unwraps category D, and resolves
cascade links from `previousVersion` and `previousVersionPackageId`. An omitted previous package means the same package.
An exact revision is honoured; multiple matches without enough identifying data remain unresolved.
Do not infer the cascade root from the dependent versions listed after `previous version of:` in an error message.

The output contains `migrationId`, the original `errorBuildsCount`, and a `builds` array with identifiers, error text, categories, and
cascade references. Causes are still empty at this stage. JSON replaces the temporary PowerShell scripts' intermediate CSV files.

## Assemble findings from collected evidence

```bash
go -C .claude/skills/analyze-migration run ./scripts/error-builds build-report -in "<run>/classified.json" -notifications "<run>/notifications.jsonl" -findings "<run>/findings.json" -out "<run>/analysed.json"
```

Both `-notifications` and `-findings` are optional. Omit a flag when that evidence has not been collected.
`notifications.jsonl` contains successful JSON outputs from `query-build-notifications`, one object per build.
Each object must identify this migration, confirm the build and migration match, and name the notifications table.
Duplicate or unrelated build IDs and mismatched migrations are errors, not evidence to ignore.

Write English per-build findings after investigating the relevant sources, database results, and code:

```json
{
  "migrationId": "<MIG_ID>",
  "builds": [
    {
      "buildId": "<BUILD_ID>",
      "cause": "The input document contains an invalid schema type.",
      "evidence": "sources.zip:spec.yaml:42; notifications.jsonl: rows[].message",
      "classification": "input issue"
    }
  ]
}
```

Replace the example with observed findings and exact evidence references. A finding needs all three fields: `cause`,
`evidence`, and `classification`. Findings are applied only to their full build ID; no category-wide cause is assumed.
Use this file for archive/code findings, query-version conclusions, previous/current classifications, and explicit evidence gaps.

Without a supplied finding, category A uses the actual notification messages and records truncation; empty notifications
remain `insufficient data` pending further investigation. Categories C and E also remain unresolved without evidence.
Category B reuses its root's finding and retains missing-evidence limits; a cycle is an error. These are draft findings:
investigate the remaining builds as required by [error-builds-analysis.md](error-builds-analysis.md).

## Export the English report and workbook

```bash
go -C .claude/skills/analyze-migration run ./scripts/error-builds render-report -in "<run>/analysed.json" -out "<run>/error-builds-<MIG_ID>-<UTC_TIMESTAMP>-en.md"
go -C .claude/skills/analyze-migration run ./scripts/error-builds build-xlsx -in "<run>/analysed.json" -out "<run>/error-builds-<MIG_ID>-<UTC_TIMESTAMP>.xlsx"
```

Both exports require a cause, evidence, and classification for every build, including explicit `insufficient data`
findings. The workbook contains English `Summary` and `Builds` sheets: all category explanations A–E, outer and effective
category counts, and one detail row per build. IDs, versions, revisions, and other cell values are stored as text.
Text exceeding Excel's cell limit causes an error instead of silent truncation. Preserve full evidence in the collected
artifacts and use a concise finding with an exact evidence reference before retrying with a new output path.

The Markdown report contains the same category legend and build findings, plus a list of category-E builds.
Review the exports against the source report and collected evidence before returning them to the user.

## Download a build archive

```bash
go -C .claude/skills/analyze-migration run ./scripts/download-archive <BUILD_ID> sources "<run>/<MIG_ID>/<BUILD_ID>/sources.zip"
```

Use `result` instead of `sources` for the result archive. Create the destination directory first.
The helper reads `APIHUB_URL` and `APIHUB_API_KEY` from the environment and clears process keys after loading them.
It preserves a deployment path prefix, refuses redirects, and saves only a successful response with a valid ZIP structure.
HTTP errors, malformed ZIPs, and write failures return errors; incomplete files are removed. Inspect archive members as
described in [full-migration-analysis.md](full-migration-analysis.md#41-download-decompress-and-read-build-archives).

## Verify the helpers

```bash
go -C .claude/skills/analyze-migration test ./internal/... ./scripts/...
go -C .claude/skills/analyze-migration vet ./internal/... ./scripts/...
```
