# JSO diff fixtures — hiding unchanged nodes

Hand-written YAML pairs for `JsoDiffsViewer` with `hideUnchangedNodes` (design:
`docs/design/jso/features/hiding-unchanged-nodes.md`).

- Total cases: 16 (5 root level + 7 second level + 4 nested)
- Layout: `hiding-unchanged-nodes/<group>/<case-id>/before.yaml` and `.../after.yaml`
- Each file is a standalone JSO document. Stories wrap it as an AsyncAPI operation binding
  (`prepareJsoDiffsDocument`), as the property suites do.
- Avoid a `type` key in plain JSO values: an object with `type` is detected as an embedded JSON
  Schema (case 3.4 uses that on purpose).

`⋯N` below is one "three dots" row hiding N unchanged properties.

## Root level

Prerequisite: six primitive properties `node1` … `node6`.

| Case id | Change | Visible rows |
| --- | --- | --- |
| `1.1-two-changed-three-unchanged-one-changed` | `node1`, `node2`, `node6` replaced | `node1`, `node2`, `⋯3`, `node6` |
| `1.2-three-unchanged-one-changed-two-unchanged` | `node4` replaced | `⋯3`, `node4`, `⋯2` |
| `1.3-removed-and-added-between-unchanged` | `node2` removed, `node6` added | changed: `node2`, `node6`; the rest in blocks |
| `1.4-nothing-changed` | none | `⋯6` |
| `1.5-everything-changed` | all six replaced | all six, no `⋯` |

## Second level

Prerequisite: objects `first`, `second`, `third`, each with the six root-level properties; changes
are inside `second`. Cases 2.6–2.7 use arrays instead.

| Case id | Change | Visible rows |
| --- | --- | --- |
| `2.1-two-changed-three-unchanged-one-changed` | `second.node1`, `.node2`, `.node6` replaced | root `⋯1`, `second`, `⋯1`; in `second`: `node1`, `node2`, `⋯3`, `node6` |
| `2.2-three-unchanged-one-changed-two-unchanged` | `second.node4` replaced | in `second`: `⋯3`, `node4`, `⋯2` |
| `2.3-nested-object-added` | object `second.extra` added | in `second`: `⋯6`, `extra` with all its children |
| `2.4-nested-object-removed` | object `second.extra` removed | mirror of 2.3 |
| `2.5-nested-primitive-to-object` | `second.node4` `null` → object | in `second`: `⋯3`, `node4` with all its children, `⋯2` |
| `2.6-array-item-replaced` | `list` `[a, b, c, d, e]` → `[a, b, X, d, e]`; object `first` unchanged | `list`, `⋯1`; in `list`: `⋯2`, item `2`, `⋯2` |
| `2.7-array-object-item-changed` | `items[1].name` replaced | in `items`: `⋯1`, item `1`, `⋯1`; in item `1`: `⋯1`, `name` |

## Nested

| Case id | Change | Visible rows |
| --- | --- | --- |
| `3.1-third-level-changes-with-unchanged-siblings` | `customer.email`, `customer.address.zip` replaced | root `⋯1`, `customer`, `⋯2` (`status` and object `meta` — one member each); in `customer`: `⋯1`, `email`, `⋯1`, `address`; in `address`: `⋯1`, `zip`, `⋯1` |
| `3.2-fourth-level-change` | `a.b.c.d` replaced | `a`, `⋯1`; one `⋯` row beside the changed node at every level |
| `3.3-changes-in-two-branches-unchanged-branch-between` | `left.inner.value`, `right.inner.value` replaced | `left`, `⋯1` (`middle`, an unchanged object), `right` |
| `3.4-json-schema-value-changed` | embedded JSON Schema `schema.properties.p2.description` replaced; `version` `null` → `"2"` | `⋯1`, `schema` (the embedded schema hides `p1` and `p3`, `p4`), `version` |

## Storybook and screenshot tests

Story root `JSO Diffs Suite (Hiding Unchanged Nodes)`: `Root Level`, `Second Level`, `Nested`
(`packages/api-doc-viewer/src/stories/jso-diffs-hiding-unchanged-nodes-suite/`), control
`hideUnchangedNodes` (default `true`). ITs
`packages/api-doc-viewer/src/it/jso-diffs-hiding-unchanged-nodes-suite/<group>.it-test.ts` capture
every case collapsed and, when it has a `⋯` row, once more revealed. Unit tests:
`packages/next-data-model/tests/unit-tests/jso-changed-only.test.ts`.

## Regenerate

Hand-written fixtures; there is no generator. After visual changes run
`node bin/run-screenshot-test-suite.mjs regenerate jso-diffs-hiding-unchanged-nodes-suite` in
`packages/api-doc-viewer/`.
