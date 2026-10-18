# JSO — diffs specification

Version 1. Supersedes the "JSO Diffs Architecture (Strict Contract)" RFC draft and its
implementation-actions plan. Every rule below is implemented and verified against the codebase
on 2026-09-25 unless it is marked **Open**.

Scope: the JSO diff pipeline in `next-data-model` (`JsoTreeWithDiffsBuilder`) and `api-doc-viewer`
(`JsoDiffsViewer`). JSO is rendered standalone and embedded (JSON Schema extensions, AsyncAPI
bindings and extensions).

## Terms

| Term | Meaning |
| --- | --- |
| Arbitrary primitive | `string` \| `number` |
| Predefined primitive | `boolean` \| `null` (rendered with `isPredefinedValueSet` styling) |
| Primitive | arbitrary or predefined primitive |
| Complex | `object` \| `array` |
| Node-level diff | `node.diffs[NODE_LEVEL_DIFF_KEY]` (`""`) |

## Principles

1. **Single source of truth.** Every diff decision is made in next-data-model. The viewer renders
   prepared state and maps model styles and flags to CSS classes.
2. **Split at the property-node boundary.** Plain and with-diffs rendering use separate
   components; there is no runtime branching on diff presence inside one property viewer.
3. **Presentation follows the model.** Hidden sides, level increase, and highlight modes come from
   `ChangedPropertyMetaData.styles`, `.flags`, and `.highlightingMode`. The viewer never
   reinterprets `beforeValue` / `afterValue`.
4. **Parallel stacks.** JSO keeps a plain stack (`JsoTreeBuilder` extends `TreeBuilder`) and a
   with-diffs stack (`JsoTreeWithDiffsBuilder` extends `TreeWithDiffsBuilder`) instead of the
   plain → with-diffs inheritance used by other API types.

## Data contract

### `node.value()`

- With diffs, the value is `{ before, after }` (`JsoTreeNodeValueWithDiffs`).
- `isPredefinedValueSet` is part of each side's value metadata.

### `node.diffs`

- **All value-level diffs live under the node-level key `""`.** The aggregator never writes other
  keys. The `value` key is reserved: severity aggregation and propagation read it defensively
  (`diffs["value"] ?? diffs[""]`), but no producer sets it.
- `DiffRename` uses the same visual policy as `DiffReplace`.

### Diff inheritance (`JsoNodeDiffsAggregatorKindAny`)

A child node's `diffs[""]` is derived from its **parent** only; the container node is passed but
not consulted.

| Parent `diffs[""]` | Child receives |
| --- | --- |
| `add` of a complex value | derived metadata: `afterValue = parent.afterValue[key]`, after side visible, before side hidden, `inherited: true`, `DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY` |
| `add` of a primitive value | the parent metadata object itself (same reference) |
| `remove` | mirror of `add` (before side visible) |
| `replace` primitive → primitive | the parent metadata object itself |
| `replace` complex ↔ primitive, primitive ↔ complex, complex ↔ complex | derived metadata for the side that still contains the key, with the other side hidden |
| none | `parent.descendantDiffs[key]` when present (the child itself was added, removed, or replaced) |

Derived metadata sets `flags.<side>.increaseLevel` so nested headers indent under the transition.

### `node.descendantDiffsSummary`

Contains only `add` and `remove` diff types. `replace` is excluded because the replaced parent is
already highlighted directly.

### `node.diffsSeverities`

- The `title-row` severity comes from `diffs[""]` (or the reserved `value` key) with `causedAt`
  taken from the first declaration path of the changed side.
- A node without its own `title-row` severity inherits one through
  `resolveDiffsSeverityPropagationSourceNode`: **parent first, then container**, cycle-safe via
  visited node ids.

## Viewer contract

| Pipeline | Components |
| --- | --- |
| Plain | `JsoViewer` → `JsoPropertyNodeViewer` → `JsoValue` → `JsoValueBase` |
| With diffs | `JsoDiffsViewer` → `JsoPropertyNodeViewerWithDiffs` → `JsoValueWithDiffs` → `JsoValueBase` |

- `JsoValueBase` is a private, rendering-only component shared by both wrappers.
- Styles are computed by layered hooks: `useJsoValueStyles` (plain) and
  `useJsoValueWithDiffsStyles`, which composes the plain hook and overlays diff classes. Hooks
  are internal and not exported from the package.
- `JsoPropertyNodeViewerWithDiffs` reads only `diffs[""]`, `descendantDiffsSummary`, and
  `diffsSeverities`.
- `JsoDiffsViewer` installs its own `DiffMetaKeysContext`, `DiffTypesContext`,
  `DisplayModeContext`, and `LayoutModeContext`, overriding the host's providers.

## Acceptance criteria

1. **Split boundary** — plain and diff-aware property rendering use separate components.
2. **Renderer composition** — `JsoValueBase` is reused by exactly two wrappers.
3. **Hook layering** — the diff hook composes the plain hook; no duplicated style computation.
4. **Single key** — value-level diffs are read and written under `""` only.
5. **Parent-only inheritance** — `diffs[""]` inheritance consults the parent, never the container.
6. **Reference identity** — primitive-side inheritance reuses the parent metadata object.
7. **Summary scope** — `descendantDiffsSummary` contains only `add` / `remove`.
8. **Severity propagation** — `title-row` severity propagates parent-first, then container, and
   terminates on cycles.
9. **Observability** — no unconditional `console.log` on runtime paths; diagnostics are gated by
   `devMode`.

## Tests

- Viewer: `JSO Diffs Suite` screenshot ITs (154 stories) over `packages/samples/jso-diffs/`,
  including arbitrary → predefined primitive, primitive → object, primitive → array, and
  object → array transitions. These are the only automated checks of criteria 4–8 today.
- Data layer: `packages/next-data-model/tests/jso.test.ts` covers the plain tree only.
  **Open** — with-diffs unit tests for each row of the inheritance table, summary scope, and
  severity propagation.

## Open questions

1. **Open** — Should `styles` / `flags` (`hiddenLayoutSide`, `increaseLevel`) become first-class
   fields instead of living inside `ChangedPropertyMetaData`?
2. **Open** — Should the reserved `value` key be removed from severity aggregation and
   propagation, or start being produced for primitive → primitive replaces?
3. **Open** — Should `JsoDiffsViewer` stop overriding host contexts when embedded, so future
   host-level filters (hiding unchanged rows, diff-type filters) reach JSO subtrees?

## Out of scope

- Unifying JSO diffs with AsyncAPI or JSON Schema pipelines.
- A rename-specific visual language.
- New severity placements beyond `title-row`.
