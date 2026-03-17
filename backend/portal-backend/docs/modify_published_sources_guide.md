# How to modify published revision sources

This guide describes the end-to-end workflow for replacing API specification source files in an already-published revision. It covers two perspectives: 
the **user** who discovers the problem and prepares the fix, and the **system administrator** who performs the replacement.

- [When is this needed](#when-is-this-needed)
- [For Users — Preparing the Fixed Archive](#for-users--preparing-the-fixed-archive)
- [For System Administrators — Performing the Replacement](#for-system-administrators--performing-the-replacement)
    - [Prerequisites](#prerequisites)
    - [Step 1 — Download current sources](#step-1--download-current-sources)
    - [Step 2 — Replace sources](#step-2--replace-sources)
    - [Step 3 — Trigger operations migration](#step-3--trigger-operations-migration)
    - [Step 4 — Monitor migration progress](#step-4--monitor-migration-progress)
- [Archive Size Limits](#archive-size-limits)
- [Error Codes Reference](#error-codes-reference)
- [Audit Trail](#audit-trail)

## When is this needed

The most common scenario is a **failed migration build** — an operations migration fails for a specific revision because the originally published source files are considered as broken 
or invalid by the new api-processor version. Rather than deleting and re-publishing the entire version, the admin can surgically replace just the source archive while preserving all version metadata.

## For Users — Preparing the Fixed Archive

If you have discovered a problem with a published version (e.g. warning on the UI that version data can be incorrect), follow these steps:

1. Ask your system administrator to **download the current published sources archive** for the affected version.
2. **Extract** the downloaded ZIP archive.
3. **Fix** the problematic specification files.
4. **Re-pack** the fixed files into a new ZIP archive.
5. Provide the archive to your system administrator for replacement.

> **Warning**: Do NOT rename, add, or remove any files. The filenames inside the archive must match the original build configuration exactly.
> The backend validates archive contents against the stored build config — any mismatch will be rejected.

## For System Administrators — Performing the Replacement

### Prerequisites

- Access to Admin API endpoints

### Step 1 — Download current sources

Download the current sources archive to provide to the user for fixing, or to inspect yourself:

```
GET /api/v2/packages/{packageId}/versions/{version}/sources
```

| Parameter   | Description                                                              |
|-------------|--------------------------------------------------------------------------|
| `packageId` | The package identifier                                                   |
| `version`   | Version string. Supports two formats: `version` or `version@revision`   |

### Step 2 — Replace sources

Upload the fixed ZIP archive:

```
PUT /api/v2/admin/packages/{packageId}/versions/{version}/sources
```

| Parameter   | Description                                                              |
|-------------|--------------------------------------------------------------------------|
| `packageId` | The package identifier                                                   |
| `version`   | Version string. Supports two formats: `version` or `version@revision`   |

Request headers:
- `Content-Type: application/zip`

Request body: raw binary ZIP archive data.

On success the endpoint returns **204 No Content**.

The endpoint performs the following validations before accepting the archive:
- The version must exist
- Published source data must exist for the version
- The archive must be a valid ZIP file
- Archive file list must match the build config exactly (no missing, extra, or duplicate files)

Every successful source replacement is recorded in the `sources_update_tracking` database table.

### Step 3 — Trigger operations migration

After replacing sources, trigger an operations migration to recalculate all derived data (documents, operations, comparisons, search indices):

```
POST /api/internal/migrate/operations
```

Request body:

```json
{
  "packageIds": ["<packageId>"]
}
```

### Step 4 — Monitor migration progress

Check migration status:

```
GET /api/internal/migrate/operations/{migrationId}
```

Refer to the [Operations migration analysis guide](ops_migration_analysis_guide.md) for detailed instructions on analyzing migration results, interpreting error categories, and handling suspicious builds.
All builds should be successfully completed.x
