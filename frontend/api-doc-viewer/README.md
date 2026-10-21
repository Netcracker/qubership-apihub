# APIHUB API doc viewer

The API doc viewer is a pnpm workspace of React libraries that render API documents in a human-readable way, with or
without the differences between two versions. The active API types are JSON Schema, AsyncAPI, DDLAPI, and JSO (a
JavaScript object with cycles); the GraphQL viewers are legacy. The module is published as the npm packages
`@netcracker/qubership-apihub-api-doc-viewer` (the React viewers) and `@netcracker/qubership-apihub-next-data-model`
(the tree builders and diff aggregators that feed them).

| Package | Path | Role |
|---------|------|------|
| `api-doc-viewer` | `packages/api-doc-viewer/` | React viewers |
| `next-data-model` | `packages/next-data-model/` | Tree builders, crawl rules, diff aggregators |
| `api-data-model`, `api-state-model` | `packages/` | Legacy GraphQL data model and state |
| `samples` | `packages/samples/` | Fixtures for stories and screenshot tests |

The UI and `apispec-view` use the viewers. See the
[processing libraries guide](../../docs/architecture/processing-libraries.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Build, test, and lint

The Nx projects are `api-doc-viewer`, `api-doc-viewer-next-data-model`, `api-doc-viewer-samples`,
`api-doc-viewer-api-data-model`, `api-doc-viewer-api-state-model`, and `api-doc-viewer-root`. Run from the
repository root:

```bash
pnpm exec nx run api-doc-viewer:build
pnpm exec nx run api-doc-viewer:test
pnpm exec nx run api-doc-viewer-next-data-model:test
pnpm exec nx run api-doc-viewer-root:lint:check
pnpm exec nx run api-doc-viewer:screenshot-test
```

The screenshot tests start Chrome in a container and need Podman; see
[Build and test: Screenshot tests](../../docs/development/build-and-test.md#screenshot-tests).

## Run and debug locally

The viewers run in Storybook. From `packages/api-doc-viewer`, `pnpm development:storybook` starts it on port 9099.
Build the static Storybook the way CI does with `pnpm exec nx run-many -t build:showcase -p api-doc-viewer`. CI
publishes the [Storybook of every branch](https://netcracker.github.io/qubership-apihub/storybook/) on GitHub Pages.
Details: [Debugging: Storybook](../../docs/development/debugging.md#storybook).

## Configuration

The libraries read no configuration file. The viewer components take their settings as properties; see
[Usage and API](#usage-and-api).

## Components

The two entry-point components for JSON Schema and GraphQL are below; for details, see
[Usage and API](#usage-and-api).

### GraphQLOperationViewer overview

- **Accepts:** GraphAPI schema object, operation path and view configuration parameters
- **Returns:** Rendered GraphQL operation

### JsonSchemaViewer overview

- **Accepts:** JSON schema object and view configuration parameters
- **Returns:** Rendered JSON schema

## Usage and API

### GraphQLOperationViewer usage

1. Get a GraphAPI schema.

*Example:*

```JavaScript
import {buildSchema} from "graphql/utilities";
import {buildFromSchema} from "@netcracker/qubership-apihub-graphapi";

...

const graphApiSchema: GraphApiSchema = buildFromSchema(
  buildSchema(GetLibraryByBookTitleOrAuthorSchema, {noLocation: true})
)
```

1. Pass the schema to the component:

| Property      | Required | Type                     | Description                                                                                                                                                                                |
|---------------|----------|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| schema        | yes      | GraphApiSchema           | Schema of GraphAPI operation, its dependent definitions and custom directives                                                                                                              |
| operationPath | no       | string                   | Path to operation in GraphAPI schema, e.g. `#/queries/getEntity`. **Default:** `first operation path`                                                                             |
| expandedDepth | no       | number                   | Amount of levels will be expanded by default. **Default:** `2`                                                                                                                   |
| displayMode   | no       | `"simple" or "detailed"` | Which mode will be used during rendering. **Simple** means that there will be only node titles and types **Detailed** means there will be all information **Default:** `detailed` |

*Example 1:* Without specifying operation.

A first found operation will be used.

```JavaScript
const SomeComponent: FC = () => {
    ...
    const operationPath = "#/mutations/createEntity"
    ...
    return (
        <GraphQLOperationViewer
            schema={graphApiSchema}
            displayMode={"simple"}
        />
    )
}
```

*Example 2:* With specifying operation.

Operation which matches passed path, e.g. `#/mutations/createEntity`

```JavaScript
const SomeComponent: FC = () => {
    ...
    const operationPath = "#/mutations/createEntity"
    ...
    return (
        <GraphQLOperationViewer
            schema={graphApiSchema}
            displayMode={"simple"}
            operationPath={operationPath}
        />
    )
}
```

### JsonSchemaViewer usage

1. Get a JSON schema.

1. Pass the schema to the component:

| Property             | Required | Type                     | Description |
|----------------------|----------|--------------------------|-------------|
| schema               | yes      | unknown                  | JSON schema (references are resolved by the viewer) |
| expandedDepth        | no       | number                   | Amount of levels will be expanded by default. **Default:** `2` |
| displayMode          | no       | `"simple" or "detailed"` | Which mode will be used during rendering. **Simple** means that there will be only node titles and types **Detailed** means there will be all information **Default:** `detailed` |
| initialLevel         | no       | number                   | Nesting level of the root row when the viewer is embedded into another viewer. **Default:** `0` |
| customizationOptions | no       | CustomizationOptions     | `headerRowTitle` replaces the root title; `suppressRootNestingIndicator` renders a wrapper object's properties as a flat top-level list |
| devMode              | no       | boolean                  | Enables tree building diagnostics in the console. **Default:** `false` |

`JsonSchemaDiffsViewer` accepts the same properties, where `schema` is a merged `apiDiff` document, plus
`diffMetaKeys` (required), optional `diffTypes`, and `hideUnchangedNodes` (**Default:** `true`).

*Example:*

```JavaScript
const SomeComponent: FC = () => {
    ...
    const jsonSchema = {
      title: 'ObjectWithPlainAndObjectProperties',
      type: 'object',
      required: ["id", "subObject"],
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 15,
        },
        name: {
          type: "string",
        },
        subObject: {
          type: 'object',
          required: ['subId'],
          properties: {
            subId: {
              type: "number"
            },
            subName: {
              type: "string"
            }
          }
        }
      },
      additionalProperties: {
        type: "string",
      },
      patternProperties: {
        "^[a-z0-9]+$": {
          type: "number"
        },
        "^[0-9]+$": {
          type: "string"
        }
      }
    }
    
    return <JsonSchemaViewer schema={jsonSchema} />
}
```

## Further reading

- [Design documents](docs/design/README.md): the source of truth per API type, with display coverage, architecture,
  entities, and features
- [Fixture catalogue](packages/samples/README.md)
