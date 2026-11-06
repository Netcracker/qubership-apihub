# APIHUB apispec-view

The apispec-view module is a pnpm workspace that holds the OpenAPI web component of APIHUB, `<apispec-view>`. It
is a fork of [@stoplightio/elements](https://github.com/stoplightio/elements) that renders a whole OpenAPI document
with a sidebar. The main package is `@netcracker/qubership-apihub-apispec-view`, published as the npm package of the
web component and built from [`packages/elements`](packages/elements/README.md).

The UI embeds it to show an OpenAPI document on the document preview page and in the specification dialog, and
the Portal serves its bundle for the "Copy page template" snippet. Single operations and comparisons are rendered by
[`api-doc-viewer`](../api-doc-viewer/README.md) instead. See the
[architecture overview](../../docs/architecture/overview.md).

| Package | Path | Role |
|---------|------|------|
| `apispec-view` | `packages/elements/` | The web component and its Storybook |
| `elements-core` | `packages/elements-core/` | Layouts, documentation pages, Try It |
| `json-schema-viewer` | `packages/json-schema-viewer/` | JSON Schema viewer used by `elements-core` |

## Build and type-check

The Nx projects are `apispec-view` (the web component), `apispec-view-root`, and one `apispec-view-<package>` for each
other package. Run from the repository root:

```bash
pnpm exec nx run apispec-view:build
pnpm exec nx run apispec-view:type-check
```

The module has no automated tests. Check a change in the Storybook stories of `web-components/API`.

## Run and debug locally

The component runs in Storybook: `pnpm exec nx run apispec-view:development:storybook` starts it on port 9099. See
[Debugging: Storybook](../../docs/development/debugging.md#storybook). The [`example/`](example/) folder holds an
HTML page that loads the web component.

## Configuration

The module reads no configuration file. The host application passes the specification as a property of the web
component.

## Further reading

- [`packages/elements`](packages/elements/README.md): the web component
- [`api-doc-viewer`](../api-doc-viewer/README.md): the viewers that replaced `<operation-view>` and
  `<diff-operation-view>`
