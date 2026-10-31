# APIHUB apispec-view

The apispec-view module is a pnpm workspace that holds the OpenAPI web component of APIHUB. It is a fork of
[@stoplightio/elements](https://github.com/stoplightio/elements) that renders JSON Schema and JSON Schema diffs with
`api-doc-viewer`. The main package is `@netcracker/qubership-apihub-apispec-view`, published as the npm package of the
web component and built from [`packages/elements`](packages/elements/README.md).

The UI embeds it to show OpenAPI specifications and their changes; see the
[architecture overview](../../docs/architecture/overview.md).

| Package | Path | Role |
|---------|------|------|
| `apispec-view` | `packages/elements/` | The web component and its Storybook |
| `elements-core`, `diff-elements-core` | `packages/` | Shared elements and their diff variants |
| `diff-block`, `json-schema-viewer`, `json-schema-diff-viewer` | `packages/` | Viewers for blocks and JSON Schema |
| `samples` | `packages/samples/` | Fixtures for stories and screenshot tests |

## Build, test, and lint

The Nx projects are `apispec-view` (the web component), `apispec-view-root`, and one `apispec-view-<package>` for each
other package. Run from the repository root:

```bash
pnpm exec nx run apispec-view:build
pnpm exec nx run apispec-view:type-check
pnpm exec nx run apispec-view:screenshot-test
```

The screenshot tests need Podman, Docker, or `wslc` on Windows; see
[Build and test: Screenshot tests](../../docs/development/build-and-test.md#screenshot-tests). The cases come from
[`compatibility-suites`](../compatibility-suites/README.md).

## Run and debug locally

The component runs in Storybook: `pnpm exec nx run apispec-view:development:storybook` starts it on port 9099. See
[Debugging: Storybook](../../docs/development/debugging.md#storybook). The [`example/`](example/) folder holds a
HTML pages that load the web component.

## Configuration

The module reads no configuration file. The host application passes the specification as a property of the web
component.

## Further reading

- [`packages/elements`](packages/elements/README.md): the web component
- [`api-doc-viewer`](../api-doc-viewer/README.md): the JSON Schema renderer
