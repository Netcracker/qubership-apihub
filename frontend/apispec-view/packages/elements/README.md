# APIHUB apispec-view elements

This package builds the `@netcracker/qubership-apihub-apispec-view` web component, `<apispec-view>`, which
displays developer documentation for an OpenAPI document. It is a fork of `@stoplight/elements`: Stoplight maintains
the original ([documentation](https://meta.stoplight.io/docs/elements)). The package belongs to the
[`apispec-view` workspace](../../README.md).

It runs inside the UI; see the [architecture overview](../../../../docs/architecture/overview.md).

## Build and type-check

The Nx project is `apispec-view`. Run from the repository root:

```bash
pnpm exec nx run apispec-view:build
pnpm exec nx run apispec-view:type-check
```

`build` bundles the web component with webpack and then the styles with PostCSS. The package has no automated tests.

## Run and debug locally

`pnpm development:storybook` in this folder starts Storybook on port 9099;
[Debugging: Storybook](../../../../docs/development/debugging.md#storybook) has the details.

## Configuration

The component reads no configuration file; its properties carry the specification and the display settings.

## License

Licensed under the Apache 2.0 License, Copyright © 2020-present Stoplight. See [LICENSE](LICENSE) for more
information.
