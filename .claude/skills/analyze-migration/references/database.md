# Targeted database diagnostics

Read this reference only when an identified category or unmigrated object lacks evidence for a verdict.
Use the migration ID and database side for the investigated build. Require that side's connection values before querying.
Do not run queries just because DB access is available. Do not run this reference as a checklist over every build.

## Connect through the scripts

Use an existing PostgreSQL account restricted to SELECT on the required tables and schema access.
The scripts never create accounts, change grants, or repair data. Never substitute an account with write access.
The skill's initial tool check covers Go and `psql`; ask the user to install missing tools.
Read the gitignored env files only to load the selected connection. Do not print, create, or edit them.

Connection variables are loaded from `.env.before` or `.env.after` in `.claude/skills/analyze-migration/`.
Load only the selected connection values into the query process; do not pass APIHub keys to DB commands.
Set process `MIGRATION_ID` to the investigated `PREV_MIG_ID` or `MIG_ID` from `.env.after`.
Both migration reports use one APIHub deployment, independently of which DB snapshot is queried.
Do not print the file contents; do not write to it.

Bind only in the process running the query. The required names are:
`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `DB_SCHEMA`, `PGSSLMODE`,
and either `PGPASSWORD` (plain-text password from the env file) or `PGPASSFILE` (path to an existing password file) — not both.
Set `PGSSLROOTCERT`, `PGSSLCERT`, and `PGSSLKEY` only to paths supplied in the env file when the connection requires them.
Do not weaken TLS after a connection failure or store a password on the command line.
Clear process variables after the analysis.
On PowerShell, process environment variables use `$env:PGHOST`, etc.; `go run` works natively on Windows without Git Bash.

For example, with the actual IDs from the report bound to the variables:

```bash
go -C .claude/skills/analyze-migration run ./scripts/query-suspicious-build/ \
    operation.PreviousReleaseVersions "$MIGRATION_ID" "$BUILD_ID" "$OPERATION_ID"
```

The shared helper runs `psql` without startup files or interactive password prompts, stops on SQL errors,
and wraps the fixed SELECT in a repeatable-read, read-only transaction. It also forces read-only sessions and timeouts.
These transient settings do not change server configuration. No script accepts SQL text, a SQL filename, or arbitrary `psql` options.
Statements and parameters are separated: SQL literals use `:'name'`, and the validated schema uses `:"db_schema"`.
Result JSON is emitted only after `psql` completes successfully. No query writes an output file.

## Choose one query

Use [query-suspicious-build](../scripts/query-suspicious-build/) only for the categories listed below.
Its first three arguments are always `CATEGORY MIGRATION_ID BUILD_ID`.

| Category | Remaining arguments | Evidence returned |
| --- | --- | --- |
| `operation.PreviousReleaseVersions` | `OPERATION_ID` | Saved field diff, current operation list, publication time, and current builder/migration metadata |
| `operation_comparison.NotFound`, `.Unexpected`, `.Changes`, `.ChangesSummary`, `.TotalChangesSummary`, `.ComparisonInternalDocumentId` | `COMPARISON_ID OPERATION_ID PREVIOUS_OPERATION_ID` | Saved change for that category, current comparison sides, operation-comparison presence and document/hash links |
| `comparison_internal_document.NotFound`, `.Unexpected`, `.Hash` | `DOCUMENT_ID PACKAGE VERSION REVISION PREVIOUS_PACKAGE PREVIOUS_VERSION PREVIOUS_REVISION` | Saved change for that category, current document/hash, and whether its data exists |

Pass an empty operation ID as `""` when one side is absent; at least one operation ID must be non-empty.
Take comparison IDs and both operation IDs from the saved composite change key. Do not infer the previous revision from the current latest revision.
Documents may belong to referenced comparisons rather than the build's own package. Establish the exact document comparison tuple first.
If it is unavailable, report the missing tuple instead of searching all documents or guessing based on the document name.

For a missing status or dependency fact, use [query-version](../scripts/query-version/):

| Arguments | When to use |
| --- | --- |
| `release-status MIGRATION_ID PACKAGE VERSION REVISION` | A specific revision's status is needed to explain an unresolved `PreviousReleaseVersions` change |
| `unmigrated-version MIGRATION_ID PACKAGE VERSION REVISION` | A post-check object lacks an explanation: inspect its current version, package kind, and tasks in this migration |
| `dependencies MIGRATION_ID PACKAGE VERSION REVISION` | Reference dependencies of that exact object are the missing evidence |

For an unresolved post-check comparison, use [query-comparison](../scripts/query-comparison/) with
`MIGRATION_ID PACKAGE VERSION REVISION PREVIOUS_PACKAGE PREVIOUS_VERSION PREVIOUS_REVISION`.
Query each side with `query-version` only if its status, tasks, or dependencies are also needed.
Do not call every mode for every object. Identify the missing fact before each call and reuse results already obtained.

For an `errorBuilds` entry whose message counts or names content-validation failures (for example
"N critical errors in following documents"), use [query-build-notifications](../scripts/query-build-notifications/)
with `MIGRATION_ID BUILD_ID`:

```bash
go -C .claude/skills/analyze-migration run ./scripts/query-build-notifications/ "$MIGRATION_ID" "$BUILD_ID"
```

This table has had three names so far on `Netcracker/qubership-apihub-backend`, same per-notification shape
throughout (one row per severity/message/document, keyed by `build_id`):

| Name | Introduced | Columns |
| --- | --- | --- |
| `builder_notifications` | `1_init.up.sql` (original schema) | `build_id, severity, message, file_id` — no `category` |
| `build_notification` | commit `e3b51675` on `tolerant_publication` | `build_id, severity, category, message, document_id` |
| `error_build_notification` | commit `035107e` on `tolerant_publication` (renamed from `build_notification`, same columns) | `build_id, severity, category, message, document_id` |

A deployment's actual table name depends on exactly which commit of its backend branch is running, not on where
that branch's head currently is — the branch may have moved past the deployed build. The script tries
`error_build_notification`, then `build_notification`, then the legacy `builder_notifications` in that order, and
reports which one it used in the `notifications_table` field of its output; cite that field in the report. If none
exist, it reports which three names it tried and stops — treat that as a schema evidence gap, do not add a fourth
guess or improvise an alternate query.

`severity` is stored as `character varying` in every one of these schemas, not the integer that the superseded Go
entity (`entity/BuilderNotificationsEntity.go`, matching only the original `builder_notifications` name) declares;
report the raw value rather than assuming an unverified numeric mapping. An empty `rows` array with `build_found: true`
means the build left no notifications in whichever table matched, not that the error is unexplained — the cause may
be in `build.details` itself or require the result archive (section 4.1 of
[full-migration-analysis.md](full-migration-analysis.md)).

## Interpret the evidence

- Confirm that the installed backend schema matches the script's tables and fields using source at the established release.
  If a query fails due to a schema difference, report it; do not alter the database or improvise replacement SQL.
- `migrated_version_changes` contains the saved comparison; the other tables describe the state at collection time.
  The schema may store its revision as text, so the script casts it when joining published objects.
- `rows: []` means the query returned no matching rows. It is not proof of expected behaviour or a historical absence.
- Presence flags distinguish an absent current object from an absent saved sample. A SQL/connection failure is not an empty result.
- Where a result may contain multiple rows, the scripts fetch at most 101 and return 100 with a truncation flag.
  Do not claim full coverage when `truncated` or `builds_truncated` is true; report the missing coverage.
- Suspicious queries filter by build ID (indexed by schema migration 18); version/document queries use exact object keys,
  and operation comparisons filter by the comparison ID indexed in migration 2. Verify these against the deployed schema.
  Task filtering also reads JSON metadata and may scan more rows than it returns. A row limit does not bound scan cost;
  keep the timeout, query only unresolved objects, and do not retry repeatedly or add indexes during analysis.
- A task absent from `build` may never have been scheduled or may no longer be retained. Current rows alone do not establish which.
  Dashboard references matter even when the version has no `previousVersion`.
- The initial scripts return metadata and links, not document bytes, full build configurations, or archives.
  An absent archive entry, semantic hash change, or original builder behaviour may require source/result archives or pinned code.
  Follow the archive instructions in [full-migration-analysis.md](full-migration-analysis.md) section 4.1
  (used from either branch); do not fetch or request logs.
  Retain **insufficient data** and name that evidence rather than widening the query or making a verdict from a hash alone.

Record the selected script/mode, category, exact object keys, collection time, and limitations in the report.
Keep connection details, password-file paths/contents, and API keys out of the report. Save evidence and reports only in the run directory defined in [SKILL.md](../SKILL.md).
