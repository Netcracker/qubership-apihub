# Data Maintenance

This document describes various data maintenance features available in the APIHUB backend.

## Revisions TTL

APIHUB backend implements an automatic cleanup mechanism for old package revisions to reduce migration size. The system runs a scheduled job that removes revisions older than a configured time-to-live (TTL) period and meet the configured conditions.

### Configuration

The revisions cleanup job is configured through environment variables:

| Environment Variable | Default Value | Description |
|---------------------|---------------|-------------|
| `REVISIONS_TTL_DAYS` | `365` (1 year) | Number of days to keep revisions before they become eligible for deletion |
| `REVISIONS_CLEANUP_DELETE_LAST_REVISION` | `false` | Whether to delete the last revision of a version even if it's the only one |
| `REVISIONS_CLEANUP_DELETE_RELEASE_REVISIONS` | `false` | Whether to delete revisions with "release" status |

Note that it is not possible to configure the job schedule, it starts every Saturday at 01:00 AM.

### How job works

The revisions cleanup job performs the following steps:

1. Checks if any migrations are running - if so, it skips execution to avoid conflicts.
2. Processes packages in batches, examining each version's revisions.
3. For each revision, checks:
   - If it's older than the TTL value
   - If it's the last revision (and whether deletion of last revisions is enabled)
   - If it has "release" status (and whether deletion of release revisions is enabled)
   - If it has any valid references from dashboards
4. Deletes eligible revisions and tracks the deletion in the activity log.
5. Cleans up related data like ad-hoc comparisons, default release version and previous version for other versions (in case of version deletion).

### Deletion modes

The cleanup job has different modes that can be configured:

#### Standard mode
By default (`REVISIONS_CLEANUP_DELETE_LAST_REVISION=false` and `REVISIONS_CLEANUP_DELETE_RELEASE_REVISIONS=false`), the job will delete revisions that are:
- Older than the configured TTL (default: 365 days)
- Not the last revision of a version
- Not in "release" status
- Not referenced by dashboards

#### Last Revision Cleanup mode
When `REVISIONS_CLEANUP_DELETE_LAST_REVISION=true` and `REVISIONS_CLEANUP_DELETE_RELEASE_REVISIONS=false`:
- Deletes revisions older than the TTL, including the last revision of a version
- Preserves revisions with "release" status
- Can completely remove versions if all revisions meet deletion criteria and none are releases
- Never deletes revisions referenced by dashboards

#### Release Revisions Cleanup mode
When `REVISIONS_CLEANUP_DELETE_LAST_REVISION=false` and `REVISIONS_CLEANUP_DELETE_RELEASE_REVISIONS=true`:
- Deletes revisions older than the TTL, including those with "release" status
- Preserves the last revision of each version
- Never deletes revisions referenced by dashboards

This should be used with caution as release revisions often represent important milestones.

#### Delete All mode
When both `REVISIONS_CLEANUP_DELETE_LAST_REVISION=true` and `REVISIONS_CLEANUP_DELETE_RELEASE_REVISIONS=true`:
- Deletes any revision older than the TTL regardless of whether it's the last revision or has "release" status
- Can completely remove versions if all revisions meet deletion criteria
- Never deletes revisions referenced by dashboards

> **WARNING**: Delete All mode is not recommended for use with short TTL and should only be used with recent database backups. The job in this mode can potentially delete all published versions in the system if the TTL is too short.

## Ad-hoc comparisons TTL

APIHUB backend implements an automatic cleanup mechanism for version/operation comparisons to reduce database size and migration size. The system runs a scheduled job that removes old and irrelevant comparisons, primarily focusing on "ad-hoc" comparisons that are created for temporary analysis.

### Configuration

The comparisons cleanup job is configured through an environment variable:

| Environment Variable | Default Value | Description |
|---------------------|---------------|-------------|
| `COMPARISONS_TTL_DAYS` | `30` | Number of days to keep ad-hoc comparisons before they become eligible for deletion. |

Note that it is not possible to configure the job schedule; it starts every Sunday at 11:00 PM.

### How job works

The comparisons cleanup job performs the following steps:

1. Checks if any migrations are running - if so, it skips execution to avoid conflicts.
2. Iterates through all version comparisons in the system.
3. For each comparison, it checks for several deletion criteria. A comparison is deleted if any of the following are true:
   - It is an ad-hoc comparison older than the configured TTL. An ad-hoc comparison is one that was created between two arbitrary versions, not as part of a version's changelog.
   - It is an outdated changelog comparison, meaning it does not point to the latest revision of the previous version.
   - It is a comparison for a revision that no longer exists.
4. Deletes eligible version comparisons and related operation comparisons.