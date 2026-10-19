# Node visibility — general approach (all API types)

Applies when adding a **node visibility** sub-layer for any spec under
`building-service/<spec>/` (ddlapi, async-api, …). For the DDL API reference
tree, see [ddlapi.md](./ddlapi.md).

## Naming and placement

Parallel **node-diffs-data** (what changed) and **node-visibility-data** (what
to show):

```text
packages/next-data-model/src/
├── model/abstract/
│   ├── display-mode.ts              # simple | detailed (cross-spec)
│   └── guards/display-mode.ts       # isSimpleDisplayMode, isDetailedDisplayMode
├── building-service/<spec>/
│   ├── node-visibility-data/
│   │   └── types.ts                 # *RowVisibility, *ListLastRowFlags per kind
│   ├── tree/node-visibility-data/
│   │   └── kind-<kind>.ts           # plain tree — implementation
│   └── tree-with-diffs/node-visibility-data/
│       └── kind-<kind>.ts           # with-diffs — diff-aware visibility only
└── model/<spec>/
    ├── tree/node-visibility/
    │   └── kind-<kind>.ts           # public re-exports (consumer imports)
    └── tree-with-diffs/node-visibility/
        └── kind-<kind>.ts
```

**Do not** put kind-specific algorithms in `node-visibility-data/shared/`. **Do
not** add trailing utility files (`list-last-row-flags.ts`, `has-defined-value.ts`)
next to kind files — keep logic on the kind class.

## Kind manager class (required shape)

One class per node kind per tree flavour (plain / with-diffs):

```typescript
export class <Spec>NodeVisibilityManagerKind<Kind> {
  public resolveNodeVisibility(node, displayMode: DisplayMode): <Kind>RowVisibility
  public resolveListLastRowFlags(isLastInList, visibility): <Kind>ListLastRowFlags
  // other public helpers the viewer needs (precededBy, side display, …)

  protected resolveDescriptionRowVisible(...): boolean
  protected resolveListLastRowFlagsFromVisibility(...): <Kind>ListLastRowFlags
  // one protected method per visibility rule
}
```

Conventions:

| Rule | Detail |
| --- | --- |
| Class, not free functions | Protected mini-algorithms on the class; matches encapsulation rules in the main next-data-model-authoring skill |
| Module wrappers | Optional `resolvePlain<Kind>NodeVisibility(...)` functions delegating to a default instance — stable functional API for viewers |
| Export `hasDefinedValue` | Only from the kind module that owns it (e.g. column); with-diffs imports from **plain** kind file |
| No factory yet | Skip `<Spec>NodeVisibilityManagerFactory` until a shared viewer layout or multi-kind orchestrator needs dispatch |

## Plain → with-diffs inheritance direction

```text
building-service/<spec>/tree/node-visibility-data/kind-column.ts   (authority for diff-free rules)
        ↑
        │ import plain manager / hasDefinedValue / delegate list-last-row + precededBy
        │
building-service/<spec>/tree-with-diffs/node-visibility-data/kind-column.ts
```

With-diffs `resolveNodeVisibility`:

- Reads merged value **and** property-row diffs (via existing model accessors)
- Applies diff-only visibility (row visible when diff exists without merged value)
- Applies with-diffs-only suppressions (e.g. whole-node add hides default row)

With-diffs **must not** duplicate plain list-last-row or precededBy logic — delegate
to a `Plain*NodeVisibilityManager` instance for those methods.

## Types (`node-visibility-data/types.ts`)

Keep **visibility result shapes** here — readonly flags the viewer reads:

- `showDescription`, `showSubheader`, `showEnumValuesRow`, …
- `*ListLastRowFlags` for `data-ddl-list-last-row` attributes

Do **not** put `DisplayMode` in spec types — import from `model/abstract/display-mode`.

## Model layer barrels (`model/<spec>/tree/node-visibility/kind-*.ts`)

Thin re-exports only:

- Kind visibility types from `building-service/.../node-visibility-data/types`
- `DisplayMode` constants/guards from `model/abstract/`
- Manager class + resolver functions from `building-service/.../kind-*.ts`

Consumers (api-doc-viewer) import:

```typescript
import { resolvePlainColumnNodeVisibility } from
  '@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-visibility/kind-column'
```

Never import `building-service/...` paths from viewers unless you are extending
the building service itself.

## Viewer integration (Phase 1)

In `*NodeViewer.tsx` / `*NodeViewerWithDiffs.tsx`:

```typescript
const displayMode = useDisplayMode() // structurally DisplayMode
const visibility = useMemo(
  () => resolvePlainColumnNodeVisibility(node, displayMode),
  [node, displayMode],
)
const listLastRowFlags = useMemo(
  () => resolvePlainColumnListLastRowFlags(isLastInList, visibility),
  [isLastInList, visibility],
)
```

- Pass `displayMode` directly — no cast to a spec-specific display-mode type.
- Branch JSX on `visibility.show*` flags, not inline `displayMode === DETAILED && value?.field`.
- Apply `listLastRowFlags.is*ListLastRow` on the correct row components.

## Adding a new API type (checklist)

1. Add `building-service/<spec>/node-visibility-data/types.ts` with per-kind
   visibility flag types.
2. For each property-row kind with non-trivial follow-on rows, add
   `tree/node-visibility-data/kind-<kind>.ts` (class + protected rules).
3. Add matching `tree-with-diffs/node-visibility-data/kind-<kind>.ts` (diff-aware
   `resolveNodeVisibility`; delegate diff-free helpers to plain).
4. Add `model/<spec>/tree/node-visibility/kind-<kind>.ts` (and with-diffs) barrels.
5. Wire viewers to model imports; add unit tests before Phase 2 layout work.
6. Document kind-specific traps in `<spec>.md` under this folder.

## Relationship to diff aggregators

| Concern | Layer |
| --- | --- |
| Diff metadata, severities, chip/row colours | `node-diffs-data` aggregators |
| Whether a row exists; list tail; precededBy | `node-visibility-data` managers |
| Side text for a row that is shown | Model accessors (`property-row-diffs`, `list-side-display`, …) |

Visibility may **call** diff accessors inside with-diffs managers; it does not
replace aggregators.
