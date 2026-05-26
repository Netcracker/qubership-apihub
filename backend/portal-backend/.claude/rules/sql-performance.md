---
description: SQL performance review for repository changes
globs: "**/repository/**"
alwaysApply: false
---

# SQL Performance

When adding or changing non-trivial SQL in repositories:

- Consider required indexes for filters, joins, and sort columns.
- Avoid N+1 query patterns; prefer joins or batch loads where appropriate.
- Note expected cardinality (rows scanned/returned) for hot paths.
- Flag full table scans, missing indexes, and unbounded result sets.
- Document performance assumptions in the PR or commit message when risk is non-obvious.
