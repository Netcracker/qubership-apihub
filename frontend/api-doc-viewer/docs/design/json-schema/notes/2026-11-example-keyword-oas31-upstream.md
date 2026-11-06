# Upstream: api-unifier drops schema `example` in OAS 3.1 (2026-11-02)

**Status:** reported here, not fixed — belongs to
the [`frontend/api-unifier`](../../../../../api-unifier/README.md) module.

## Observation

`normalize(source, { unify: true, … })` on an **OAS 3.1** document removes the `example` keyword
from Schema Objects (it is deprecated in OAS 3.1 but still valid). On OAS 3.0 it is kept. Checked
with the parameters of one operation:

| Input schema | OAS 3.0 normalized | OAS 3.1 normalized |
| --- | --- | --- |
| `{ type: string, example: 'Bearer <TOKEN>' }` | `example` kept | `example` gone (no `examples` either) |

## Consequences in api-doc-viewer

- **OAS 3.1 → 3.1:** no Examples row for such schemas, in the plain and the diffs viewers alike.
- **OAS 3.1 → 3.0 (a version upgrade / downgrade between two documents):** `apiDiff` reports
  `example: add` on every schema that has an `example` on both sides. Since the `example` diff now
  drives the Examples row ([../features/validation-rows.md](../features/validation-rows.md)), these
  schemas show a green Examples row on the changed side and are not hidden by "hide unchanged
  nodes" — correct for the merged document, misleading against the sources.

Seen in a host integration: query / header parameters with schema `example` stayed visible
while the path parameter (no `example`) was hidden behind the three-dots row.

## Proposed upstream fix

Keep schema `example` in OAS 3.1, or convert it to `examples: [example]` in both dialects
consistently — either way both sides of a 3.0 ↔ 3.1 comparison carry the same value and the false
`example` add disappears.
