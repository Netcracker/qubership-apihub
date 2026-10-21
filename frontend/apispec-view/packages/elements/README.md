# APIHUB apispec-view elements

This package builds the `@netcracker/qubership-apihub-apispec-view` web component, which displays developer
documentation for an OpenAPI document. It is a fork of `@stoplight/elements`: Stoplight maintains the original
([documentation](https://meta.stoplight.io/docs/elements)), and APIHUB adds JSON Schema rendering and JSON Schema diff
rendering through `api-doc-viewer`. The package belongs to the [`apispec-view` workspace](../../README.md).

It runs inside the UI; see the [architecture overview](../../../../docs/architecture/overview.md).

## Build, test, and lint

The Nx project is `apispec-view`. Run from the repository root:

```bash
pnpm exec nx run apispec-view:build
pnpm exec nx run apispec-view:type-check
pnpm exec nx run apispec-view:screenshot-test
```

`build` bundles the web components with webpack and then the styles with PostCSS. `regenerate-screenshots`
refreshes the reference images after an intended visual change; see
[Build and test: Screenshot tests](../../../../docs/development/build-and-test.md#screenshot-tests).

## Run and debug locally

`pnpm development:storybook` in this folder starts Storybook on port 9099;
[Debugging: Storybook](../../../../docs/development/debugging.md#storybook) has the details.

## Configuration

The component reads no configuration file; its properties carry the specification and the display settings.

## License

Licensed under the Apache 2.0 License, Copyright © 2020-present Stoplight. See [LICENSE](LICENSE) for more
information.
