# JSO Diffs: Implementation Actions Plan

## Purpose

This document defines concrete implementation actions for the RFC in `jso-diffs-rfc-draft.md`.
It is action-oriented: exact files, components, methods/functions, and algorithms to implement.

## Scope

- In scope: JSO diffs flow in `next-data-model` and `api-doc-viewer`.
- Out of scope (current iteration): cross-API unification, dedicated rename visualization, JSON Schema / Multi Schema expansion.

## Entity Catalog

Each entity has an ID used later in action steps.

### Viewer layer (`packages/api-doc-viewer`)

- **[E-V-1]** `src/components/JsoViewer/JsoDiffsViewer.tsx`
  - Current role: entrypoint for diffs mode, builds tree with `JsoTreeWithDiffsBuilder`.
  - Planned role: route property rendering to dedicated diff-aware property viewer.

- **[E-V-2]** `src/components/JsoViewer/JsoViewer.tsx`
  - Current role: entrypoint for non-diff mode.
  - Planned role: keep routing to non-diff property viewer only.

- **[E-V-3]** `src/components/JsoViewer/JsoPropertyNodeViewer.tsx`
  - Current role: mixed logic for diff and non-diff rendering.
  - Planned role: non-diff property viewer only.

- **[E-V-4] (new)** `src/components/JsoViewer/JsoPropertyNodeWithDiffsViewer.tsx`
  - Planned role: diff-aware property viewer with recursion, key-resolution, severity/highlight orchestration.

- **[E-V-5]** `src/components/JsoViewer/JsoValue/JsoValue.tsx`
  - Current role: rendering value element from prepared side state.
  - Planned role: becomes plain wrapper over base renderer.

- **[E-V-6] (new)** `src/components/JsoViewer/JsoValue/JsoValueWithDiffs.tsx`
  - Planned role: diff-aware wrapper over base renderer.

- **[E-V-7] (new)** `src/components/JsoViewer/JsoValue/BaseJsoValue.tsx`
  - Planned role: low-level private renderer only; receives resolved value and style classes.

- **[E-V-8]** `src/components/JsoViewer/resolve-jso-side-state.ts`
  - Current role: side-state resolving and helper utilities.
  - Planned role: host deterministic diff key resolver and side-state derivation helpers.

- **[E-V-9] (new)** `src/components/JsoViewer/JsoValue/useJsoValueStyles.ts`
  - Planned role: base style hook for plain value rendering.

- **[E-V-10] (new)** `src/components/JsoViewer/JsoValue/useJsoValueWithDiffsStyles.ts`
  - Planned role: diff-aware style hook extending base hook behavior.

- **[E-V-11]** `src/components/JsoViewer/resolve-jso-side-state.test.ts`
  - Current role: tests for side-state helpers.
  - Planned role: extended with key-resolution matrix tests.

- **[E-V-12] (new)** `src/it/jso-suite.jso-diffs-property-viewer.it-test.ts` (or generated equivalent)
  - Planned role: IT/screenshot coverage for diff-aware property viewer behavior.

### Data layer (`packages/next-data-model`)

- **[E-D-1]** `src/building-service/jso/tree-with-diffs/builder.ts`
  - Current role: creates tree nodes, assigns diffs/summaries/severities, propagates severities.
  - Planned role: keep current responsibilities and additionally enforce parent-first severity-source traversal and strict propagation contract.

- **[E-D-2]** `src/building-service/jso/tree-with-diffs/node-diffs-data/node-diffs/kind-any.ts`
  - Current role: aggregates node diffs and inherited add/remove context.
  - Planned role: keep current aggregation semantics and additionally enforce parent-first inheritance for `nodeDiffs[""]`, plus remove noisy logs.

- **[E-D-3]** `src/building-service/jso/tree-with-diffs/node-diffs-data/node-descendant-diffs/kind-any.ts`
  - Current role: builds descendant diffs map.
  - Planned role: keep current map-building role and additionally align style/flag semantics for propagated context while preserving replace entries.

- **[E-D-4]** `src/building-service/jso/tree-with-diffs/node-diffs-data/node-diffs-summary/kind-any.ts`
  - Current role: summarizes all node diff types.
  - Planned role: keep current summarization role and additionally guarantee deterministic behavior compatible with key-resolution semantics.

- **[E-D-5]** `src/building-service/jso/tree-with-diffs/node-diffs-data/node-descendant-diffs-summary/kind-any.ts`
  - Current role: summarizes descendant diffs.
  - Planned role: keep current summary role and additionally constrain contract to `add/remove` only (exclude replace).

- **[E-D-6]** `src/building-service/jso/tree-with-diffs/node-diffs-data/node-diffs-severities/kind-any.ts`
  - Current role: computes `title-row` severity from `""` or `title`.
  - Planned role: keep current severity computation role and additionally enforce deterministic `title-row` source for propagated complex transition context.

- **[E-D-7]** `tests/jso-diffs.test.ts` (new test file in `packages/next-data-model/tests`)
  - Planned role: builder-level tests for parent-first inheritance, identity, summary scope, severity propagation.

## Algorithm Catalog

Each algorithm has an ID and is referenced from implementation actions.

- **[A-1] Key resolution matrix**
  - Input: node diffs (`""`, `value`, `title`), candidate diff action/type.
  - Rules:
    1. `DiffAdd` / `DiffRemove` -> use key `""`.
    2. `DiffReplace` with primitive->primitive -> use key `"value"`.
    3. `DiffReplace` where one or both sides are complex -> use key `""`.
  - Output: deterministic key for value diff rendering.

- **[A-2] Parent-first inherited root diff**
  - Input: `parentNode`, `containerNode`, `nodeKey`.
  - Rules:
    1. Try parent `diffs[""]` (add/remove), then parent `descendantDiffs[nodeKey]`.
    2. If nothing found, try container in the same order.
    3. Reuse source diff object reference (no clone).
  - Output: optional inherited `nodeDiffs[""]`.

- **[A-3] Split property rendering pipeline**
  - Plain pipeline: `JsoPropertyNodeViewer` -> `JsoValue` -> `BaseJsoValue`.
  - Diffs pipeline: `JsoPropertyNodeWithDiffsViewer` -> `JsoValueWithDiffs` -> `BaseJsoValue`.
  - Constraint: wrappers orchestrate, base renderer only draws.

- **[A-4] Hook layering for value styles**
  - Base hook computes plain styles by value metadata.
  - Diff hook composes base hook and overlays diff-driven styles/flags.
  - Internal-only hooks (not exported from package public API).

- **[A-5] Severity propagation for complex transitions**
  - For nodes without own `title-row` severity, derive propagated severity source from hierarchy.
  - Traverse source candidates with parent-first semantics to match RFC precedence.
  - Keep propagation deterministic and cycle-safe.

- **[A-6] Descendant summary filter**
  - Aggregate descendant diff summary from descendants.
  - Include only add/remove actions for summary badges.
  - Exclude replace from descendant summary contract.

## Concrete Actions By Phase

## Phase 1: Strict model contract

1. **Enforce parent-first inheritance in node diffs aggregation**
   - Files: [E-D-2], [E-D-1]
   - Methods/functions:
     - `JsoNodeDiffsAggregatorKindAny.aggregate()`
     - `JsoTreeWithDiffsBuilder.createNodeDiffs()`
   - Algorithms: [A-2]
   - Actions:
     - Reverse lookup precedence from container-first to parent-first.
     - Keep reference identity for inherited `nodeDiffs[""]`.
     - Remove unconditional `console.log` statements from aggregation path.

2. **Align severity propagation source traversal with RFC precedence**
   - File: [E-D-1]
   - Methods/functions:
     - `resolveDiffsSeverityPropagationSourceNode()`
     - `resolveEligibleDiffsSeveritySourceNode()`
   - Algorithms: [A-5]
   - Actions:
     - Use parent-first source search.
     - Keep cycle protection with visited node IDs.

3. **Finalize descendant summary filter**
   - File: [E-D-5]
   - Methods/functions:
     - `JsoNodeDescendantDiffsSummaryAggregatorKindAny.aggregate()`
   - Algorithms: [A-6]
   - Actions:
     - Filter out replace actions from descendant summary.
     - Keep add/remove only.

## Phase 2: Split viewers + base renderer architecture

1. **Introduce dedicated diff-aware property viewer**
   - Files: [E-V-4], [E-V-1]
   - Components/functions:
     - `JsoPropertyNodeWithDiffsViewer`
     - `JsoDiffsViewer` mapping function for root properties
   - Algorithms: [A-3], [A-1], [A-5]
   - Actions:
     - Create diff-only recursion path in `JsoPropertyNodeWithDiffsViewer`.
     - Switch `JsoDiffsViewer` to render diff-aware component instead of mixed [E-V-3].

2. **Restrict plain property viewer to non-diff responsibilities**
   - Files: [E-V-3], [E-V-2]
   - Components/functions:
     - `JsoPropertyNodeViewer`
     - `JsoViewer` property mapping
   - Algorithms: [A-3]
   - Actions:
     - Remove diff-specific branching and props from plain component.
     - Keep plain recursion and JSON Schema branch behavior.

3. **Introduce base value renderer + two wrappers**
   - Files: [E-V-5], [E-V-6], [E-V-7]
   - Components:
     - `BaseJsoValue` (private renderer)
     - `JsoValue` (plain wrapper)
     - `JsoValueWithDiffs` (diff wrapper)
   - Algorithms: [A-3], [A-4]
   - Actions:
     - Move JSX drawing details from [E-V-5] into [E-V-7].
     - Keep wrapper components responsible for data-to-style preparation only.

4. **Introduce layered hooks for style computation**
   - Files: [E-V-9], [E-V-10], [E-V-8]
   - Functions:
     - `useJsoValueStyles()`
     - `useJsoValueWithDiffsStyles()`
   - Algorithms: [A-4]
   - Actions:
     - Implement base hook for predefined-value classes.
     - Implement diff hook as extension/composition over base hook.
     - Keep hooks internal (no public export).

## Phase 3: Key-resolution semantics

1. **Implement deterministic diff key resolver**
   - File: [E-V-8]
   - Functions (new):
     - `resolveJsoValueDiffKey(diffs): "" | "value" | undefined`
     - `resolveJsoTitleDiffKey(diffs): "" | "title" | undefined`
   - Algorithms: [A-1]
   - Actions:
     - Centralize key resolution logic in one utility.
     - Remove ad-hoc `nodeDiffs['value'] ?? nodeDiffs['']` branches from components.

2. **Apply resolver in diff-aware property viewer**
   - File: [E-V-4]
   - Functions/components:
     - node value diff selection
     - title diff selection
   - Algorithms: [A-1]
   - Actions:
     - Value rendering key must be selected only through resolver.
     - `title` remains service key, not primary value diff signal.

## Phase 4: Remove rollout scaffolding

1. **Delete compatibility branches and legacy key fallbacks**
   - Files: [E-V-4], [E-V-8], [E-D-2], [E-D-1]
   - Algorithms: [A-1], [A-2], [A-5]
   - Actions:
     - Remove temporary fallback heuristics replaced by deterministic resolver.
     - Keep one strict execution path.

2. **Remove temporary rollout flags and adapters**
   - Files: viewer and data-layer config points touched during rollout
   - Actions:
     - Remove `jsoDiffsStrictModelContract`, `jsoDiffsSplitPropertyViewer`, `jsoDiffsParentFirstPropagation`.
     - Delete transitional adapters/helpers created only for migration.

## Test Plan

## Data layer tests (`packages/next-data-model/tests`)

- **File:** [E-D-7]
- Add cases:
  1. parent-first inheritance for `nodeDiffs[""]` ([A-2])
  2. inherited root diff reference identity ([A-2])
  3. descendant summary includes only add/remove ([A-6])
  4. severity propagation over complex transitions ([A-5])
  5. no-diff `before === after` identity contract

## Viewer logic unit tests (`packages/api-doc-viewer/src/components/JsoViewer`)

- **File:** [E-V-11]
- Add cases:
  1. key-resolution matrix for add/remove/replace ([A-1])
  2. side-state and hidden-side helper behavior for primitive<->complex transitions ([A-1], [A-5])
  3. deterministic mapping helpers used by wrappers ([A-3], [A-4])

## Viewer IT/screenshot tests (`packages/api-doc-viewer/src/it`)

- **File:** [E-V-12]
- Add cases:
  1. split viewer behavior: plain vs diff-aware recursion ([A-3])
  2. propagated complex-transition highlighting and severity-driven headers ([A-5])
  3. base renderer visual contract remains stable through wrapper composition ([A-3], [A-4])
  4. add/remove vs replace key-resolution outcomes in rendered result ([A-1])

## Definition of Done

1. All actions for current phase are merged with green CI.
2. No unconditional debug logs remain in runtime paths.
3. Key resolution is deterministic and covered by tests.
4. Viewer split is explicit and does not rely on mixed property component logic.
5. Descendant summary and severity propagation match RFC invariants.

