# qubership-apihub-api-doc-viewer

Library which can render JSON schemas, GraphQL schemas and
GraphAPI specifications in human-readable way.

### Installation

``
yarn add @netcracker/qubership-apihub-api-doc-viewer
``

### Components

There is a high-level description of provided components.

For more details, see section "Usage & API" below.

#### GraphQLOperationViewer

* **Accepts:** GraphAPI schema object, operation path and view configuration parameters
* **Returns:** Rendered GraphQL operation

#### JsonSchemaViewer

* **Accepts:** JSON schema object and view configuration parameters
* **Returns:** Rendered JSON schema

### Usage & API

#### GraphQLOperationViewer

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

2. Pass the schema to the component:

| Property      | Required | Type                     | Description                                                                                                                                                                                |
|---------------|----------|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| schema        | yes      | GraphApiSchema           | Schema of GraphAPI operation, its dependent definitions and custom directives                                                                                                              |
| operationPath | no       | string                   | Path to operation in GraphAPI schema, e.g. `#/queries/getEntity`.<br/><br/>**Default:** `first operation path`                                                                             |
| expandedDepth | no       | number                   | Amount of levels will be expanded by default. <br/><br/>**Default:** `2`                                                                                                                   |
| displayMode   | no       | `"simple" or "detailed"` | Which mode will be used during rendering.<p/>**Simple** means that there will be only node titles and types<p/>**Detailed** means there will be all information<p/>**Default:** `detailed` |                                                                                                 | 

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

#### JsonSchemaViewer

1. Get a JSON schema.

2. Pass the schema to the component:

| Property      | Required | Type                     | Description                                                                                                                                                                                                      |
|---------------|----------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| schema        | yes      | GraphSchema              | Any JSON schema without dependent definitions                                                                                                                                                                    |
| source        | no       | object                   | Source JSON schema with definitions for `schema`                                                                                                                                                                 |
| expandedDepth | no       | number                   | Amount of levels will be expanded by default. <br/><br/>**Default:** `2`                                                                                                                                         |
| displayMode   | no       | `"simple" or "detailed"` | Which mode will be used during rendering.<p/>**Simple** means that there will be only node titles and types<p/>**Detailed** means there will be all information<p/>**Default:** `detailed`                       |                                                                                                 | 
| overridenKind | no       | `"parameters"`           | **ATTENTION.** This is a WA, not completed solution.<br/><br/>This flag now accepts only ```parameters``` value and renders root node and its immediate descendants as list of children without headers. |
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
