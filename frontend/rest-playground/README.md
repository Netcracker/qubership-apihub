# APIHUB REST playground

The REST playground is a UI component for testing REST APIs: it sends requests to a server with real data and
extracts the request parameters from the API specification, so the user does not configure them by hand. It is
published as the npm package `@netcracker/qubership-apihub-rest-playground` and ships as web components. It is a fork
of [@stoplightio/elements](https://github.com/stoplightio/elements) with TryIt and Examples extracted as separate
web components.

The UI embeds it to try operations; see the [architecture overview](../../docs/architecture/overview.md).

## Features

- **Automatic request configuration:** The request parameters come from the API specification.
- **Custom URLs:** If the specification names no server URL, the user enters one.
- **REST only:** The playground is intended exclusively for REST operations.
- **Fixed parameters:** You cannot change the set of allowed path and query parameters or request headers. You can
  combine them as the specification prescribes, but not modify their names and schemas.
- **CORS:** Requests go through the backend, which avoids CORS problems.

## Components

- **TryIt:** Sends REST requests to the server using data from the API specification.
- **Examples:** Shows examples of requests and responses based on the API specification.

## Build, test, and lint

The Nx project is `rest-playground`. Run from the repository root:

```bash
pnpm exec nx run rest-playground:build
pnpm exec nx run rest-playground:test
pnpm exec nx run rest-playground:lint
```

See [Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

The component runs in Storybook, which develops and demonstrates it in isolation:

```bash
pnpm exec nx run rest-playground:storybook
```

The dev server listens on port 9001. CI publishes the
[Storybook of every branch](https://netcracker.github.io/qubership-apihub/storybook/) on GitHub Pages, and
`pnpm exec nx run-many -t build:showcase -p rest-playground` builds the static version. Details:
[Debugging: Storybook](../../docs/development/debugging.md#storybook).

## Configuration

The component reads no configuration file. The host application passes the specification and the request settings as
properties.

## Further reading

- [Architecture of the processing libraries](../../docs/architecture/processing-libraries.md)
- [Portal user guide](../../docs/user-guide/portal.md), where users try operations
