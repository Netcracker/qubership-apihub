# Node visibility authoring (entry)

Read this document **first** when the task is to implement or refactor the **node
visibility** sub-layer in next-data-model, or when the user asks to refactor a
plain / with-diffs **`*NodeViewer` component pair** (Phase 1 always starts in
the data layer — see Phase 2 below).

Reference implementation (committed): `1f1e561933f0c0d6edf84057bfc87d48bfacec48`
— *refactor!: Extraction of node parts visibility logic to isolated level of data
model*.

## Related docs (read in order)

| Doc | Scope |
| --- | --- |
| [general-approach.md](./general-approach.md) | Cross–API-type layout, classes, plain → with-diffs reuse, public imports |
| [ddlapi.md](./ddlapi.md) | DDL API column/index kinds, types, tests, commit file map |

## Problem this sub-layer solves

Viewers were embedding **which rows to show** (description, additional-info
blocks, list-last-row flags, precededBy hints) inline in React. That duplicated
logic between plain and with-diffs viewers and drifted from product rules (e.g.
plain column description never received list-last-row when it was the tail row).

Node visibility moves those rules into next-data-model so viewers **consume**
precomputed flags and resolvers — same contract as diff aggregators (“data layer
prepares; viewer renders”).

## Phase 1 vs Phase 2 (current status)

| Phase | Scope | Status (DDL API) |
| --- | --- | --- |
| **Phase 1** | Row visibility, list-last-row flags, precededBy helpers, side-display resolvers that gate *whether* a row exists | **Done** for column + index (`1f1e561`) |
| **Phase 2** | Shared viewer layout shell — dedupe ~70% JSX between plain and with-diffs `*NodeViewer` pairs | **Not started** |

### Phase 2 plan (viewer layer — api-doc-viewer)

After Phase 1 is stable for a kind pair:

1. Introduce a shared layout component (e.g. `ColumnNodeViewerLayout`) that owns
   title row, description row, additional-info rows, `precededBy`, and
   `data-ddl-list-last-row` wiring.
2. Plain and with-diffs viewers become thin wrappers: compute visibility via
   model imports, pass diff props only where needed, inject kind-specific
   subheader renderers (column type label vs index part names).
3. Repeat for index (`IndexNodeViewer` / `IndexNodeViewerWithDiffs`).
4. Optionally unify section list viewers and table-level precededBy cascades
   (separate from node visibility — see `composer-2.5-review.md`).

Do **not** skip Phase 1 and jump to a shared JSX shell — visibility rules belong
in the data layer first.

## Session lessons (patterns the user corrected)

These came from the ColumnNodeViewer / ColumnNodeViewerWithDiffs deduplication
arc. Treat them as defaults unless the user says otherwise.

### Do first / do not skip

- **Phase 1 before layout dedupe.** Extract visibility to next-data-model; only
  then share viewer JSX.
- **Read dedup criteria before merging code.** Dedupe when control flow is the
  same and only parameters differ. Keep separate when product or visibility
  contracts differ (even if code looks similar).

### Structure mistakes to avoid

| Mistake | Correction |
| --- | --- |
| `node-visibility-data/shared/` with kind-specific helpers | Kind logic lives on **plain tree** `kind-*.ts` classes (protected methods), not a shared folder |
| Separate utility files next to `kind-column.ts` | Merge helpers **into** the kind class; export only narrow module-level wrappers if viewers/tests need them |
| `DdlApiViewerDisplayMode` duplicating api-doc-viewer `DisplayMode` | Use `model/abstract/display-mode.ts` + `model/abstract/guards/display-mode.ts` |
| Model barrels named `column-node-visibility.ts` mixing column + index | Mirror building-service: `model/<spec>/tree/node-visibility/kind-column.ts` and `kind-index.ts` |
| Factory for two kinds | **No factory** until a shared layout or orchestrator dispatches three or more kinds |
| With-diffs importing from with-diffs-only helpers for diff-free rules | **Plain → with-diffs only:** with-diffs delegates list-last-row / precededBy / value-presence checks to plain tree manager instances |

### Dedup guidance from the same session (keep separate)

Do **not** merge these without explicit approval — different contracts:

- Property-list-section whole-node styles vs `buildDdlPropertyNameChangedPropertyMetaDataFromDiff`
- Column vs index title-row severity helpers in `node-diffs-severities`
- `DdlTableViewer` entry shell vs property row viewers
- Aggregator chip/row highlight styling (intentionally in data layer — not viewer)

Safe dedup example from the session: `resolveColumnEnumValueSideItems` → thin
wrapper over generic `resolveListSideItems`.

## When to extend this sub-layer

Add or change node visibility when:

- A viewer uses `displayMode === DETAILED` plus merged-value checks to decide rows
- Plain and with-diffs viewers duplicate the same `useMemo` visibility block
- List-last-row or precededBy logic differs between plain and with-diffs for the
  same kind
- A row should appear when **only a diff** is present (with-diffs), not only when
  merged value exists

Keep in viewers (Phase 2+ or permanently): pure layout, diff chrome props, injected
subheader JSX, Storybook-only props.

## Tests

Add unit tests under `packages/next-data-model/tests/unit-tests/`:

- Plain visibility per display mode
- With-diffs visibility when only property diffs exist (no merged value)
- List-last-row flags (especially description as list tail)
- Kind-specific edge cases (e.g. whole-node add suppresses default row)

Do not rely on screenshot tests alone for visibility regressions.
