# 2026-09 architecture review — JSON Schema (plain and with diffs)

Review of `JsonSchemaViewer` / `JsonSchemaDiffsViewer` and their next-data-model support
(`model`, `building-service`, `shared` under `json-schema/`) against the review brief now kept in
the `api-doc-viewer-reviewing` skill (`review/json-schema.md`). Stories, ITs, and samples were out
of scope.

Current architecture: [../architecture/](../architecture/). This note records findings,
decisions, and lessons only.

## Outcome

- Diff-aggregation logic that lived in the viewer moved to next-data-model.
- `SchemaNodeViewer` and `CombinerNodeViewer` were split into genuine plain and `*WithDiffs`
  components.
- All unjustified type assertions and the one `@ts-expect-error` were removed.
- Legacy `DiffTags` / `DiffBadge` went back to GraphQL-only use; next viewers got
  `TagsWithDiffs` / `BadgeWithDiffs`.
- Verification after every fix: `tsc --noEmit` on both packages and the full Jest suites, run
  directly (not through npm scripts). Final state: 0 TypeScript errors; next-data-model 33 suites /
  548 tests; api-doc-viewer 10 suites / 81 tests. Screenshot ITs were not run.

## Findings

Status: ✅ fixed · ⏳ approved, not applied · 🚫 rejected · ➖ no action · 🔁 superseded.

| ID | Status | Severity | Finding | Resolution |
| --- | --- | --- | --- | --- |
| F1 | ✅ | High | Combiner selector diff logic lived in the viewer | Moved to `JsonSchemaCombinerSelectorRowResolver` (`model/json-schema/tree-with-diffs/combiner-row-diffs.ts`) |
| F2 | ✅ | High | `*WithDiffs` components were passthroughs over one branching component | Four genuinely separate components, each typed to its node kind |
| F3 | ✅ | High | Fake duck-typed nodes built to call the visibility resolver | `resolvePlainPropertyNodeVisibility` takes the value, not a node |
| F4 | ✅ | High | Kind-narrowing cast in `SchemaNodeViewer` | Resolved by F2 and F3 |
| F5 | ✅ | High | `as never` cast to select plain vs. with-diffs child viewer | Resolved by F2; combiner helpers made generic |
| F6 | ✅ | High | Dead node-kind and value-props tables in `shared/json-schema/constants.ts` | Reduced to `jsonSchemaNodeKind` |
| F7 | ✅ | Medium | Required-star side visibility derived from `DiffAction` in the view | `JsonSchemaRowDiffs.RequiredStar.isVisibleOnSide` |
| F8 | 🔁 | Medium | `@ts-expect-error` bridging legacy `NodeChange` and next `Diff` in `DiffTags` | Superseded: next viewers use `TagsWithDiffs` typed on `ChangedPropertyMetaData` |
| F9 | ✅ | Medium | ~20 free functions for value-range diff classification | `JsonSchemaValueRangeDiffResolver` static class |
| F10 | ✅ | Medium | Four near-identical list side-entry functions | One shared core, parametrized |
| F11 | ⏳ | Medium | Four near-identical subheader `useCallback`s in `SchemaNodePlainContent` | Open |
| F12 | ✅ | Medium | Eight casts reading validation fields | `resolveJsonSchemaValidationFieldsView` |
| F13 | ✅ | Medium | Inline type and cast for the value-range crawl value | Parameter widened to `unknown` at the source |
| F14 | ✅ | Medium | Skill doc claimed `AdditionalInfoRow` / `Selector` were DDL-local | Skill doc fixed |
| F15 | ✅ | Low | JSON Schema viewer imported a ddlapi guard | `isChangedPropertyMetaData` moved to `model/abstract/tree-with-diffs/` |
| F16 | 🚫 | Low | `console.debug` in root viewers | Kept by decision |
| F17 | ✅ | Low | Dead commented import | Removed by F2 |
| F18 | ✅ | Low | Deprecated `JsonSchemaNodeTitle` alias | Deleted |
| F19 | ✅ | Low | Two overlapping expand-state effects in `CombinerNodeViewer` | One effect distinguishing leaf change from tree revision |
| F20 | ➖ | Low | Empty `JsonSchemaNodeDataWithDiffsBuilder` subclass | Kept as an extension point |
| F21 | ✅ | — | Six aggregator files audited in full | One more ddlapi-guard import fixed (same as F15) |

## Decisions

1. OOP encapsulation takes priority over free-function testability: diff logic lives on classes
   with static methods, and consumers call through the class.
2. `DiffTags` / `DiffBadge` are GraphQL-only. `BadgeWithDiffs` derives "changed" from `!!diff`
   (dropping `isNodeChanged` / `isContentChanged`); `TagsWithDiffs` takes plain
   `ChangedPropertyMetaData` per flag, with no `$`-prefixed props.
3. Debug logging in root viewers stays (F16).

## Lessons

- **Never borrow a diff for a tag.** A `NODE_LEVEL_DIFF_KEY` fallback in the meta-flag accessors
  made every tag of a wholly added property highlight together, including flags that were `false`.
  It was reverted: a tag is highlighted only by its own diff. A wholly added property's `true`
  flags render as plain tags.
- **Merging two effects needs their semantics first.** The two `CombinerNodeViewer` effects had
  different intents (reset on leaf change vs. re-clamp on tree revision); a naive merge would have
  dropped manual expand state.

## Open items

- F11 — extract the four subheader builders in `SchemaNodePlainContent`.
- Screenshot ITs for combiner diff suites after F1 were not run in this review.
