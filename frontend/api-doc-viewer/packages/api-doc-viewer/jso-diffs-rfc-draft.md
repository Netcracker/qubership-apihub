# RFC: JSO Diffs Architecture (Strict Contract)

## Status

- Draft
- Owner: API Doc Viewer team
- Scope: JSO diff rendering pipeline in `@netcracker/qubership-apihub-api-doc-viewer` and `@apihub/next-data-model`

## Background

Current `JSO` diff support is evolving from mixed responsibilities (model + UI decisions) to a strict layered contract.

Target state:

- `next-data-model` is the only source of truth for node diff semantics.
- UI reads and renders prepared state; it does not derive domain-level diff rules.
- JSO viewers with and without diffs are explicitly separated at property-node level.

## Goals

- Define strict invariants for `JsoTreeNodeWithDiffs`.
- Lock diff propagation rules and severity propagation semantics.
- Reduce ambiguous diff-key semantics in UI.
- Provide incremental migration plan with compatibility shims.

## Non-Goals

- Cross-API unification with AsyncAPI/GraphQL diff pipelines.
- New severity placements beyond `title-row` in this iteration.
- Separate visual semantics for `DiffRename` (treated as `DiffReplace`).
- JSO integration improvements for `JSON_SCHEMA` / `MULTI_SCHEMA` branches in this iteration.

## Domain Terms

- **Arbitrary primitive**: `string | number`
- **Predefined primitive**: `boolean | null`
- **Primitive**: arbitrary or predefined primitive
- **Complex**: `object | array`

## Architectural Principles

1. **Single source of truth**
   - All domain diff decisions are produced in `next-data-model`.
   - UI-level components consume already aggregated node state.

2. **Strict split at property-node boundary**
   - Keep separate components:
     - `JsoPropertyNodeViewer`
     - `JsoPropertyNodeWithDiffsViewer`
   - No deep branching in one shared property viewer for domain-diff behavior.

3. **Presentation follows model contract**
   - Visual states such as hidden side for primitive<->complex transitions are derived from model-ready signals.
   - UI may style, but must not reinterpret diff semantics.

4. **Compatibility-first migration**
   - Changes are delivered incrementally via feature flags and compatibility shims.

## Contract: JSO Diff Data Model

## `node.value()` contract

- `before` and `after` are always present.
- No diffs: `before === after` (same object reference).
- With diffs: `before !== after`.
- `isPredefinedValueSet` is part of canonical value metadata.

## `node.diffs` contract

- Diff key selection is action/type-dependent:
  - `DiffAdd` and `DiffRemove`: use `""`.
  - `DiffReplace`: use `value` only when both `beforeValue` and `afterValue` are primitive.
  - `DiffReplace` with one or both complex values: use `""` (root transition context with propagated descendants).
- `title` and other keys are treated as service/technical keys (not primary user-facing value diff keys).
- `DiffRename` visual policy is identical to `DiffReplace`.

## `node.descendantDiffsSummary` contract

- Contains only `add` / `remove` actions.
- `replace` is not summarized as descendant marker because parent replacement is already directly highlighted.

## `node.diffsSeverities` contract

- `title-row` severity must be propagated through hierarchy according to complex transition rules.
- Severity propagation must be deterministic and testable.

## Propagation Rules

1. **Parent-first inheritance**
   - For child nodes, inherited diff context lookup is:
     1. `parent`
     2. `container`
   - `container` must not override a valid parent-derived context.

2. **Reference identity for inherited root diff**
   - If inherited, `child.diffs[""]` references the same diff object instance as parent/container source.
   - No cloning for inherited root-context diff metadata.

3. **Complex transition context**
   - Primitive<->complex transition context must be propagated to nested headers through severity mechanism.

## UI Layer Responsibilities

`api-doc-viewer` must:

- Render state from prepared model data.
- Map model styles/flags to visual classes.
- Avoid recomputation of domain diff semantics.

`api-doc-viewer` must not:

- Rebuild hidden-side decision from raw `beforeValue/afterValue` when the model already exposes this intent.
- Infer summary/severity semantics from scratch.

## Migration Plan (Incremental)

## Phase 0: Establish target baseline

- Define RFC invariants as the primary baseline for implementation and tests.
- Add/adjust tests to validate target behavior (not legacy behavior snapshots).
- Keep debug-gated diagnostics only (no noisy unconditional logs).

## Phase 1: Introduce strict model contract

- Add/normalize model-level signals required by viewer split.
- Keep only minimal compatibility shims required for incremental rollout.

## Phase 2: Restore split viewers

- Reintroduce:
  - `JsoPropertyNodeViewer` (no diffs)
  - `JsoPropertyNodeWithDiffsViewer` (diff-aware)
- Route rendering by node type/context.
- Implement value rendering via composition pattern:
  - shared low-level base renderer (non-exported, rendering-only)
  - two wrapper components (plain and diff-aware) responsible for state preparation
- Organize calculations via layered hooks:
  - base hook for common value styling/state
  - diff-aware hook that reuses base hook and extends it with diff-specific logic
  - internal-only hooks (not part of public package API)
- Keep wrappers focused on orchestration; avoid heavy conditional rendering logic in base renderer.

## Phase 3: Enforce key-resolution semantics

- Introduce deterministic key resolver used by diff-aware wrappers:
  - `add/remove` -> `""`
  - `replace(primitive -> primitive)` -> `value`
  - `replace(primitive <-> complex or complex -> complex)` -> `""`
- Keep `title` out of primary value diff rendering semantics.
- Remove ad-hoc key fallback branches and replace them with one resolver contract.

## Phase 4: Decommission rollout scaffolding

- Remove temporary compatibility branches that bypass the Phase 3 resolver.
- Remove obsolete fallback paths around `title` and legacy key-priority heuristics.
- Remove temporary migration flags after full rollout:
  - `jsoDiffsStrictModelContract`
  - `jsoDiffsSplitPropertyViewer`
  - `jsoDiffsParentFirstPropagation`
- Delete dead adapters/helpers that existed only for transitional behavior.
- Keep only one strict execution path consistent with this RFC.

## Feature Flags

- `jsoDiffsStrictModelContract`
- `jsoDiffsSplitPropertyViewer`
- `jsoDiffsParentFirstPropagation`

Flags are temporary and must include removal criteria per phase.

## Acceptance Criteria (Blocking)

1. **Identity invariant**
   - If node has no effective diff, `value().before === value().after`.

2. **Root diff reference invariant**
   - In inherited cases, `child.diffs[""]` references the same diff object as source parent/container node.

3. **Propagation precedence invariant**
   - Parent-first lookup order is guaranteed and covered by tests.

4. **Summary scope invariant**
   - `descendantDiffsSummary` includes only `add/remove`.

5. **Severity invariant**
   - `title-row` severity is correctly propagated for complex transitions.

6. **Split boundary invariant**
   - Property-node rendering with diffs and without diffs uses separate components by contract.

7. **Renderer composition invariant**
   - Shared base value renderer is reused by exactly two wrapper components (plain and diff-aware).

8. **Hook layering invariant**
   - Diff-aware hook extends/reuses base hook; duplicated style/state computation paths are not allowed.

9. **Key-resolution invariant**
   - Diff key choice is deterministic and follows action/type matrix:
     - `add/remove` -> `""`
     - `replace(primitive -> primitive)` -> `value`
     - other `replace` -> `""`

## Test Strategy

## Unit tests (`next-data-model`)

- Aggregator tests for parent-first propagation.
- Object identity tests for inherited `diffs[""]`.
- `before/after` identity tests for non-diff nodes.
- Summary tests asserting replace exclusion from descendant summary.
- Severity propagation tests for primitive<->complex transitions.
- Key-resolution matrix tests for add/remove/replace scenarios.

## Integration tests (`api-doc-viewer`)

- Snapshot/DOM tests for split viewers.
- Cases:
  - arbitrary primitive -> predefined primitive
  - primitive -> object
  - primitive -> array
  - object -> array
- Header and subheader highlighting consistency under propagated severity.
- Renderer composition checks:
  - plain and diff-aware wrappers produce consistent base markup contract
  - hook outputs map to base renderer props without behavioral drift

## Observability

- Debug-gated logs only (`debug` flag/env).
- No unconditional `console.log` in production runtime paths.

## Open Questions

1. Should model expose explicit `hiddenLayoutSide` and `increaseLevel` as stable public contract fields, or keep them in style/flags envelope?
2. Should service diff keys (`title`, internal metadata fields) be fully hidden from viewer props after migration?
3. What is final deprecation timeline for compatibility shims?

## Implementation Notes (Phase 2)

- Why this pattern is balanced:
  - keeps split architecture explicit at component boundary
  - minimizes duplicated JSX/CSS rendering logic
  - allows strict separation: wrappers compute, base renderer draws
- Main risks:
  - over-coupled hooks where diff-aware logic leaks into base hook
  - wrapper bloat with mixed domain and presentation concerns
- Guardrails:
  - base hook accepts only diff-agnostic input
  - diff-aware hook composes base hook and appends diff metadata mapping
  - snapshot and behavioral tests are maintained at wrapper level, not base internals

## Out of Scope (Current Iteration)

- Generic cross-type architecture unification across other API types.
- New rename-specific visual language.
- Expanded JSON Schema / Multi Schema diff interoperability work.
