# AsyncAPI diff fixtures

Before/after YAML pairs for `AsyncApiOperationDiffsViewer`:
`<category>/<case-id>/{before,after}.yaml`. Stories load them with `import.meta.glob` and
`collectSampleCases`. `packages/samples/src/async-api-diffs.ts` separately exposes inline cases as
`@netcracker/qubership-apihub-samples` for next-data-model unit tests.
`packages/samples/fixtures/whole-apihub-operation-template.yaml` is not referenced by code. Design:
`docs/design/async-api/display-coverage.md`.

## Categories

| Category | Cases | Covers |
| --- | ---: | --- |
| `message/` | 52 | message title, address, description, summary, headers, payload, extensions, bindings |
| `channel/` | 36 | channel title, description, summary (short and long, moved between fields), extensions, bindings |
| `channel-server/` | 35 | server host and protocol, description, summary, server bindings, servers added / removed |
| `channel-parameters/` | 8 | address parameters added, removed, renamed, fields changed |
| `operation/` | 36 | operation title, description, summary, extensions, bindings |
| `whole-apihub-operation/` | 2 | a whole operation document |

Case ids use `<group>.<n>-<change>` (for example `1.3-channel-title-added`).

Plain AsyncAPI stories (`Async API Suite`, 66 stories) use inline data in
`packages/api-doc-viewer/src/stories/async-api-suite/shared-test-data/` and have no fixtures here.

## Storybook and screenshot tests

| Category | Story title | Story / IT files |
| --- | --- | --- |
| `message/` | `Async API Diffs Suite/Message Samples` | `message.*` |
| `channel/` | `Async API Diffs Suite/Channel Samples` | `channel.*` |
| `channel-server/` | `Async API Diffs Suite/Channel Server Samples` | `channel-server.*` |
| `channel-parameters/` | `Async API Diffs Suite/Channel Parameters Samples` | `channel-parameters.*` |
| `operation/` | `Async API Diffs Suite/Operation Samples` | `operation.*` |
| `whole-apihub-operation/` | `Async API Diffs Suite/Whole Apihub Operation Samples` | `whole-apihub-operation.*` |

Stories: `packages/api-doc-viewer/src/stories/async-api-diffs-suite/`; ITs:
`src/it/async-api-diffs-suite.*.it-test.ts`.

## Regenerate

Hand-written fixtures; there is no generator. After visual changes run
`npm run regenerate-screenshots` in `packages/api-doc-viewer/`.
