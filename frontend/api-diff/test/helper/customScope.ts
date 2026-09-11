/**
 * The smallest document the custom scope mechanism is about: two operations reaching one schema through a
 * `$ref`, so a difference inside that schema is reached by two routes. What the routes are called differs
 * per suite, hence the operation paths are given by the caller.
 */
export function customScopeSpec(
  operationPaths: readonly [string, string],
  properties: Record<string, unknown>,
  shared: (schema: unknown) => unknown = (schema) => schema,
): unknown {
  const operation = {
    post: {
      requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } },
      responses: { '200': { description: 'OK' } },
    },
  }
  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: Object.fromEntries(operationPaths.map(path => [path, operation])),
    components: { schemas: { Shared: shared({ type: 'object', properties: properties }) } },
  }
}
