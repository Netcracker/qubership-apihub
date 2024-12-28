# qubership-apihub-graphapi

This package provides utils to convert GraphQL schema into GraphAPI document and back.<br/>
The GraphAPI Specification is GraphQL introspection alternative, but based on JsonSchema - OpenApi for GraphQL

## Modifications
Modified version of [udamir/graphapi](https://github.com/udamir/graphapi)

- Structure changed to better account for GraphQL specifics
- Changed nullability handling 
- Field description/output description separation 
- Reduced number of unnatural diffs during later processing, caused by following OpenAPI structure

## Features
- JSON Schema-based representation of GraphQL document, similar to OpenAPI
- Support custom directives in schema (meta) 
- GraphAPI document can be build from GraphQL Schema or Introspection
- GraphAPI document can be converted to GraphQL Schema 
- Typescript syntax support out of the box
- No dependencies, can be used in nodejs or browser

## Installation
```SH
npm install @netcracker/qubership-apihub-graphapi --save
```

## Usage

### Build GraphAPI document from Schema or Introspection
```ts
import { buildSchema, graphqlSync, getIntrospectionQuery } from "graphql"
import { buildFromSchema, buildFromIntrospection } from '@netcracker/qubership-apihub-graphapi'

// build from GraphQL schema
const schema = buildSchema(data)
const graphapi1 = buildFromSchema(schema)

// build from GraphQL introspection
const introspection = graphqlSync(data, getIntrospectionQuery()).data
const graphapi2 = buildFromIntrospection(introspection)

```

> Important: only deprecated directives will be in result, as introspection not support custom directives meta

### Print GraphQL schema document from GraphAPI document

```ts
import { printGraphApi } from '@netcracker/qubership-apihub-graphapi'

const schema = printGraphApi(graphapi)
console.log(schema)

```

## Contributing
When contributing, keep in mind that it is an objective of `graphapi` to have no package dependencies. This may change in the future, but for now, no-dependencies.

Please run the unit tests before submitting your PR: `npm test`. Hopefully your PR includes additional unit tests to illustrate your change/modification!

## License

MIT
