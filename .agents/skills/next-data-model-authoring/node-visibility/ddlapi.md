# Node visibility — DDL API (reference implementation)

Baseline commit: `1f1e561933f0c0d6edf84057bfc87d48bfacec48`.

Cross-spec rules: [general-approach.md](./general-approach.md). Entry and Phase 2:
[authoring.md](./authoring.md).

## File map (as committed)

| Path | Role |
| --- | --- |
| `building-service/ddlapi/node-visibility-data/types.ts` | `DdlApiColumnRowVisibility`, `DdlApiIndexRowVisibility`, list-last-row flag types |
| `building-service/ddlapi/tree/node-visibility-data/kind-column.ts` | Plain column manager + `hasDefinedValue` + module wrappers |
| `building-service/ddlapi/tree/node-visibility-data/kind-index.ts` | Plain index manager |
| `building-service/ddlapi/tree-with-diffs/node-visibility-data/kind-column.ts` | With-diffs column; delegates list-last-row / precededBy to plain manager |
| `building-service/ddlapi/tree-with-diffs/node-visibility-data/kind-index.ts` | With-diffs index; delegates list-last-row to plain manager |
| `model/abstract/display-mode.ts` | `DisplayMode`, `SIMPLE_DISPLAY_MODE`, `DETAILED_DISPLAY_MODE` |
| `model/abstract/guards/display-mode.ts` | `isDetailedDisplayMode`, `isSimpleDisplayMode` |
| `model/ddlapi/tree/node-visibility/kind-column.ts` | Public plain column API |
| `model/ddlapi/tree/node-visibility/kind-index.ts` | Public plain index API |
| `model/ddlapi/tree-with-diffs/node-visibility/kind-column.ts` | Public with-diffs column API |
| `model/ddlapi/tree-with-diffs/node-visibility/kind-index.ts` | Public with-diffs index API |
| `tests/unit-tests/ddlapi-column-node-visibility.test.ts` | Column visibility unit tests |
| `tests/unit-tests/ddlapi-index-node-visibility.test.ts` | Index visibility unit tests |
| `tests/unit-tests/display-mode.test.ts` | Abstract display-mode guards |

Viewers updated in the same commit:

- `ColumnNodeViewer.tsx`, `ColumnNodeViewerWithDiffs.tsx`
- `IndexNodeViewer.tsx`, `IndexNodeViewerWithDiffs.tsx`

## Column kind — visibility contract

### `DdlApiColumnRowVisibility`

| Field | Plain rule (detailed mode) | With-diffs extra |
| --- | --- | --- |
| `showDescription` | Merged `description` present | Or `takeColumnDescriptionDiff(node)` |
| `showEnumValuesRow` | Merged `enumValues` non-empty | Or enum value diffs present |
| `showDefaultRow` | Merged `defaultValue` defined | Or default diffs; **hidden** when whole column add/remove |
| `showGeneratedRow` | Merged `generatedExpression` defined | Or generated expression diff |
| `showAnyAdditionalInfoRow` | OR of enum/default/generated rows | Same |

### `DdlApiColumnListLastRowFlags`

Drives `ATTRIBUTE_DDL_LIST_LAST_ROW` on title, description, and each additional-info
row. Only one flag true for a given list position. Description row must be marked
list-last when it is the only follow-on row (fixes plain vs with-diffs drift from
the review).

### Other column helpers

| API | Purpose |
| --- | --- |
| `resolvePlainColumnAdditionalInfoRowUsesAfterRowPrecededBy` | Whether default/generated additional-info row uses after-row precededBy |
| `resolveColumnGeneratedExpressionSideDisplay` | Side text for generated row (with-diffs only; moved out of viewer IIFE) |
| `isWholeColumnNodeAddOrRemove` | Whole-node add/remove check for default-row suppression |
| `hasDefinedValue` | Exported from plain `kind-column.ts`; reused by with-diffs |

## Index kind — visibility contract

### `DdlApiIndexRowVisibility`

| Field | Plain rule | With-diffs extra |
| --- | --- | --- |
| `showDescription` | Detailed + merged description | Or index description diff |
| `showSubheader` | Part names non-empty or `isUnique` | Or unique flag diff |

Index has fewer rows than column — same class pattern still applies.

### List-last-row

Only title and description rows — `isTitleListLastRow` when description hidden;
`isDescriptionListLastRow` when description shown and node is list tail.

## With-diffs delegation pattern (column)

```typescript
const plainColumnNodeVisibilityManager = new PlainColumnNodeVisibilityManager()

public resolveListLastRowFlags(...) {
  return plainColumnNodeVisibilityManager.resolveListLastRowFlags(...)
}

public resolveAdditionalInfoRowUsesAfterRowPrecededBy(...) {
  return plainColumnNodeVisibilityManager.resolveAdditionalInfoRowUsesAfterRowPrecededBy(...)
}
```

Diff-aware logic stays in with-diffs protected methods (`resolveDescriptionRowVisible`
with diff args, whole-node changed checks, etc.).

## Public import paths (viewers / tests)

```typescript
// Plain column
import {
  resolvePlainColumnNodeVisibility,
  resolvePlainColumnListLastRowFlags,
} from '@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-visibility/kind-column'

// With-diffs column
import {
  resolveColumnNodeVisibility,
  resolveColumnListLastRowFlags,
} from '@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/node-visibility/kind-column'

// Index — same pattern under .../kind-index
```

## DDL-specific traps

| Trap | Guidance |
| --- | --- |
| Whole-node column add/remove | Suppress default and generated **rows** even if diffs exist on those fields |
| Generated expression side text | Use `resolveColumnGeneratedExpressionSideDisplay` — do not inline add/remove/replace in the viewer |
| PrecededBy at section level | `ColumnsNodeViewer` precededBy cascade still uses merged-value helpers — diff-only additional-info rows need a follow-up (see `composer-2.5-review.md` task 3) |
| Index subheader | With-diffs still uses `isDdlPropertySubheaderVisible` for side layout inside subheader renderer; `showSubheader` only gates whether subheader exists |
| DisplayMode duplication | Never reintroduce spec-prefixed display-mode types — use `model/abstract/display-mode` |

## Extending DDL visibility

When adding a new property-row kind (e.g. future constraint rows):

1. Extend `node-visibility-data/types.ts` with `DdlApi<Kind>RowVisibility` and list-last flags if needed.
2. Add `tree/node-visibility-data/kind-<kind>.ts` and with-diffs counterpart.
3. Add model barrels under `model/ddlapi/tree/node-visibility/kind-<kind>.ts`.
4. Wire the viewer pair to model resolvers; add unit tests before Phase 2 layout extraction.

## Phase 2 reminders (DDL column/index viewers)

Still duplicated after `1f1e561` (intentionally left for Phase 2):

- ~70% shared JSX between `ColumnNodeViewer` and `ColumnNodeViewerWithDiffs`
- Index plain vs with-diffs subheader renderers (`formatIndexPartNames` vs
  `resolveIndexPartNamesSideDisplay`)
- Target: `ColumnNodeViewerLayout` + thin diff/plain wrappers — see
  [authoring.md](./authoring.md)
