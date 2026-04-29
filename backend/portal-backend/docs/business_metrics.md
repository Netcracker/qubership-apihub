# Business metrics

This document describes how the API registry collects **usage-oriented business metrics**: event counters for API calls and user actions, associated with user identifiers and package identifiers. Data is stored in PostgreSQL and supports reporting and export through the administrative API.

Metric name constants are defined in the `metrics` package (`qubership-apihub-service/metrics/BusinessMetrics.go`). Writes are performed by the monitoring service (`MonitoringService`).

---

## Database table

| Object | Description |
|--------|-------------|
| **Schema and name** | `public.business_metric` |
| **Primary key** | `(year, month, day, metric, user_id)` |
| **Columns** | |

- `year`, `month`, `day` — calendar date for aggregated events in the row (month and day are integers, per the SQL model).
- `metric` — string metric identifier (see below).
- `data` — `jsonb` object: **keys** are dimension labels (typically `package_id`, sometimes composite keys), **values** are integer counters.
- `user_id` — user identifier; when the user cannot be resolved, the default `'unknown'` applies (see migrations).

Each row represents **one user**, **one metric type**, and **one calendar day**: all dimensions for that metric on that day are merged into a single `data` JSON object.

### Querying data with SQL

Counters are stored inside `data`. To obtain rows with date, dimension, metric, and totals, expand the JSON—for example:

```sql
SELECT
    to_date(b.year || '-' || b.month || '-' || b.day, 'YYYY-MM-DD') AS date,
    d.key AS package_or_key,
    b.metric,
    coalesce(u.name, b.user_id) AS username,
    sum(d.value::int) AS value
FROM business_metric b
LEFT JOIN user_data u ON b.user_id = u.user_id
CROSS JOIN LATERAL jsonb_each_text(b.data) AS d(key, value)
WHERE d.key LIKE 'YOUR_PARENT_PREFIX%'  -- optional filter by package id prefix
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2;
```

The administrator report uses the same approach, with optional grouping across the package hierarchy via `parentPackageId` and `hierarchyLevel` — see `BusinessMetricRepository.GetBusinessMetrics`.

---

## Metric identifiers

The following table lists constants (values stored in `metric`), their meaning, and typical keys in `data`.

| Constant (`metric` value) | What is counted |
|---------------------------|-----------------|
| `comparisons_called` | Successful API version comparison. Keys in `data` are `package_id` values; when comparing against a version from another package, an additional entry may be recorded for `previousVersionPackageId`. |
| `exports_called` | Export operations (various export endpoints); key is `package_id`. |
| `deprecated_operations_called` | Access to a deprecated operation; key is `package_id`. |
| `documents_called` | Document retrieval for a version (documentation views); key is `package_id`. |
| `packages_and_dashboards_created` | Package or dashboard creation; key is the parent identifier (`ParentId` of the new object in the hierarchy). |
| `release_versions_published` | Publication of a **release** version; key is `package_id`. Recorded on successful publish (`PublishedService`) and when a version is moved to `release` via metadata patch (`VersionService`): increments use **`PublishedAt`** as the date and **`CreatedBy`** as the user. |
| `release_versions_deleted` | Deletion of a release version or cleanup flows; key is `package_id`. Background jobs may use a synthetic `user_id` such as `job_revisions_cleanup\|<jobId>`. |
| `global_search_called` | Global search. The key combines search level with a suffix (`searchLevel`, workspace, or the first `package_id` in the request, depending on the endpoint). |
| `global_search_default_publication_date_modified` | The publication date interval differs from the default range; key is `searchLevel` (string). |
| `mcp_session_initialized` | MCP session initialization; key is a client label such as `<name>/<version>` or `"unknown"`. |
| `mcp_search_rest_operations_tool_called` | MCP search-operations tool invocation; key is `"<MCP client label>|<group or packageId>"`. |
| `mcp_get_rest_operation_spec_tool_called` | MCP operation specification tool; key is `"<MCP client label>|<package_id>"`. |
| `mcp_get_rest_operation_diff_tool_called` | MCP operation diff tool; key is `"<MCP client label>|<package_id>"`. |
| `ai_chat_called` | AI chat messages; aggregated under the key `"chat messages"`; user identity is taken from chat/MCP context when tools run. |

Authoritative constant definitions remain in `metrics/BusinessMetrics.go`.

---

## Administrative API

- Endpoint: `GET /api/v2/businessMetrics` — see [`docs/api/Admin_API_internal.yaml`](api/Admin_API_internal.yaml), operation `getBusinessMetrics`.
- Restricted to **system administrators** (others receive `Forbidden`).
- Query parameters: `parentPackageId`, `hierarchyLevel` (depth for grouping package identifiers), `format` — `json` (default) or `xlsx` for Excel export.

---

## Implementation notes

1. **Two write paths**
   - **Primary path**: `IncreaseBusinessMetricCounter(userId, metric, key)` accumulates counters **in memory** (`map[userId][metric][key]`), avoiding an INSERT per HTTP request.
   - **Periodic flush**: a background task runs every **five minutes** and executes `flushBusinessMetrics()`: a transaction with `INSERT ... ON CONFLICT` into `business_metric`, merging JSON `data` with accumulated increments for the **current calendar date** at flush time.

2. **Historical date updates**
   - `IncreaseBusinessMetricCounterForDate` and `DecreaseBusinessMetricCounterForDate` read and write rows **directly** for the specified date. This supports `release_versions_published`: the stored row date must align with `PublishedAt`, and demoting a release decreases the counter for that date and author.

3. **Memory versus database when decreasing**
   - When a version leaves `release`, `DecreaseBusinessMetricCounterForDate` runs. If the increment has not yet been flushed, the decrease is applied to the **in-memory** buffer first to avoid inconsistent totals (see `MonitoringService.DecreaseBusinessMetricCounterForDate`).

4. **Package relocation**
   - During `MoveAllData` (changing `package_id`), keys in `business_metric.data` are updated in SQL so metrics remain valid after the package moves (`TransitionRepository`).

5. **Migrations and backfill**
   - `SoftMigrations` contains corrective logic for `release_versions_published` driven by status history; this is a migration-time path, not normal runtime behavior.

6. **Related data (different table)**
   - Some flows also persist `endpoint_calls` (request parameters aggregated by API path). That mechanism lives in the same `MonitoringService` but is stored separately from `business_metric`.

---

## Quick reference

| Need | Location |
|------|----------|
| Table DDL | `resources/migrations/1_init.up.sql`, table `business_metric`. |
| Metric names | `qubership-apihub-service/metrics/BusinessMetrics.go`. |
| Persistence and flush | `qubership-apihub-service/service/MonitoringService.go`. |
| Instrumentation call sites | Search for `IncreaseBusinessMetricCounter`. |
| Report and export | `BusinessMetricRepository`, `BusinessMetricController`. |
