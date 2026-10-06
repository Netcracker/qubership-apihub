# Review brief — AsyncAPI

Shared rules: [../SKILL.md](../SKILL.md).

## Scope

| Layer | Paths |
| --- | --- |
| Viewers | `packages/api-doc-viewer/src/components/AsyncApiOperationViewer/` (`AsyncApiOperationViewer`, `AsyncApiOperationDiffsViewer`) |
| Viewer utilities | `packages/api-doc-viewer/src/utils/async-api/`, `shared-utilities/tree-node-guards.ts`, `shared-components/diffs/node-diff-props.ts` |
| Data model | `packages/next-data-model/src/{model,building-service,shared}/async-api/` |

Out of scope: `stories/`, `it/`, `samples/`, and the nested JSON Schema and JSO viewers (review
them with their own briefs).

## Design

- Coverage: `docs/design/async-api/display-coverage.md`
- Architecture: `docs/design/async-api/architecture/`
- Shared features: `docs/design/shared/features/`

## Focus

- **One component set for plain and with diffs.** Each viewer branches on `is*NodeWithDiffs`.
  Assess whether a plain / `*WithDiffs` split (the JSON Schema and DDL pattern) is warranted.
- **Row visibility in the viewer.** `shouldBeDisplayed` in `utils/async-api/visibility-checkers.ts`
  is domain logic; it belongs in next-data-model `node-visibility-data/` managers.
- **Hand-written `data-precededby` chains.** Nested ternaries in `MessageChannelNodeViewer` and
  `MessageContentNodeViewer`; look for a model-driven row sequence.
- **Unused or dead pieces.** `BrokenRefViewer` has no consumer; the `displayMode` read in
  `MessageSectionsViewer` is unused.
- **API-type context in a shared component.** The shared `Expander` reads
  `AsyncApiDevModeContext`.
- **Contexts overridden by embedded JSO viewers.** Host-level settings do not reach bindings and
  extensions.
- **Forward descendant-summary aggregators** across tree boundaries: coverage for extensions on
  operation and server.
- Diff-derived values computed in components (`MessageSectionsViewer` node diff cause, server
  address max severity) should come from next-data-model.
