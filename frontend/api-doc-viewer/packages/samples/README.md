# Test fixtures

Fixtures for Storybook stories and screenshot ITs in `packages/api-doc-viewer`, plus inline cases
for next-data-model unit tests (`src/`, published to tests as `@netcracker/qubership-apihub-samples`).

## Catalogue layout

Every fixture catalogue is a `README.md` next to its fixtures:

| Level | File | Required sections |
| --- | --- | --- |
| Sample root | `<root>/README.md` | `Categories`, `Storybook and screenshot tests`, `Regenerate` |
| Category (when it needs detail) | `<root>/<category>/README.md` | `Cases`, `Storybook and screenshot tests`, `Regenerate` |

Titles read `<API type> fixtures`, `<API type> diff fixtures`, or `… fixtures — <category>`.
A catalogue written by a generator is changed through the generator. A generator that recreates
its output folder must not share it with hand-written files.

## Sample roots

| Root | API type | Mode | Catalogue |
| --- | --- | --- | --- |
| `json-schema/` | JSON Schema | plain | [json-schema/README.md](json-schema/README.md) |
| `json-schema-diffs/` | JSON Schema | with diffs | [json-schema-diffs/README.md](json-schema-diffs/README.md) |
| `async-api-diffs/` | AsyncAPI | with diffs | [async-api-diffs/README.md](async-api-diffs/README.md) |
| `ddlapi/` | DDL API | plain | [ddlapi/README.md](ddlapi/README.md) |
| `ddlapi-diffs/` | DDL API | with diffs | [ddlapi-diffs/README.md](ddlapi-diffs/README.md) |
| `jso-diffs/` | JSO | with diffs | [jso-diffs/README.md](jso-diffs/README.md) |

Plain AsyncAPI and plain JSO stories use inline data under `packages/api-doc-viewer/src/stories/`.
`*.generated.*` compatibility-suite artifacts come from the external
`qubership-apihub-compatibility-suites` repository and are not stored here.

## Workflow

Fixtures come first when building a feature (see `docs/design/README.md` → Workflow): add the
cases and update the catalogue, then stories and ITs, then the implementation.
