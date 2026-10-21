# API change rules

During comparison of API specifications, APIHUB
([qubership-apihub-api-diff](https://github.com/Netcracker/qubership-apihub-api-diff)) classifies each change by
severity.

## Severity of changes

- **Breaking change** breaks backward compatibility with the previous version of the API. For example, deleting an
  operation, adding a required parameter, or changing the type of a parameter are breaking changes.
- **Requires Attention** is a change that can break backward compatibility with the previous version of the API,
  depending on the implementation of a client. This category also includes breaking changes in operations annotated
  as no-BWC.
- **Deprecating change** annotates an operation, parameter, or schema as deprecated. Removing a "deprecated"
  annotation is also a deprecating change.
- **Non-breaking change** does not break backward compatibility with the previous version of the API. For example,
  adding a new operation or an optional parameter is a non-breaking change.
- **Annotation change** enriches the API documentation with information that does not affect the functionality of the
  API. For example, adding, changing, or deleting descriptions or examples is an annotation change.
- **Unclassified change** cannot be classified as any of the other types.

## Compatibility suite

The compatibility suite lists the changes that APIHUB detects in OpenAPI 3.0, OpenAPI 3.1, and GraphQL
specifications. Each change has an identifier and a severity, and the example files in
`frontend/compatibility-suites/bin/` show the specification before and after the change.

## Pages

- [Basic principles of change counting](./principles.md)
- [Schema changes](./schema-changes.md)

### OpenAPI

The pages follow the order of the old wiki sidebar.

- [General operation parameters](./openapi/general-operation-parameters.md)
- [Headers](./openapi/headers.md)
- [Operation parameters](./openapi/operation-parameters.md)
- [Parameters. Schema](./openapi/parameters-schema.md): large table
- [Parameters. Examples](./openapi/parameters-examples.md)
- [Request](./openapi/request.md)
- [RequestBody. Schema](./openapi/request-body-schema.md): large table
- [RequestBody. Examples](./openapi/request-body-examples.md)
- [Response](./openapi/response.md)
- [ResponseBody. Schema](./openapi/response-body-schema.md): large table
- [ResponseBody. Examples](./openapi/response-body-examples.md)
- [ResponseHeaders. Schema](./openapi/response-headers-schema.md): large table
- [OAS extensions](./openapi/oas-extensions.md)

### GraphQL

- [Root type general](./graphql/root-type-general.md)
- [Scalar type argument of root type](./graphql/scalar-type-argument-of-root-type.md)
- [Input type argument of root type](./graphql/input-type-argument-of-root-type.md)
- [Scalar output type of root type](./graphql/scalar-output-type-of-root-type.md)
- [Object output type of root type](./graphql/object-output-type-of-root-type.md)
- [Object output type of root type that implements interface](./graphql/object-output-type-of-root-type-that-implements-interface.md)
- [Union output type of root type](./graphql/union-output-type-of-root-type.md)
- [Directives](./graphql/directives.md)
- [Interface output type of root type](./graphql/interface-output-type-of-root-type.md)
