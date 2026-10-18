/** Rolled-up OAS x-* keys on node value after crawl transform — not a raw JSON Schema keyword. */
export const JSON_SCHEMA_NODE_VALUE_PROPERTY_EXTENSIONS = "extensions" as const

/**
 * Generic, spec-agnostic annotation entries a consuming spec (e.g. AsyncAPI) attaches to a node's
 * value before it reaches the JSON Schema tree - not a raw JSON Schema keyword, and never
 * named after any specific spec's concept (see `JsonSchemaCustomAnnotation` in `node-value.ts`).
 */
export const JSON_SCHEMA_NODE_VALUE_PROPERTY_CUSTOM_ANNOTATIONS = "customAnnotations" as const
