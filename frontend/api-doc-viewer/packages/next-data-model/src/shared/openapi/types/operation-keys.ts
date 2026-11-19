import { OpenApiHttpMethod } from "./http-method"

/**
 * Selects one OpenAPI operation: a `paths` key and an HTTP method.
 * In a merged (diff) document `path` is the merged key - the after path of a renamed path.
 */
export type OpenApiOperationKeys = {
  /** Key of `paths`, exactly as in the document, e.g. `/pets/{petId}`. */
  path: string
  /** HTTP method, case-insensitive. */
  method: string
}

/** Operation keys found in the document: the method is a known lowercase HTTP method. */
export type OpenApiResolvedOperationKeys = {
  readonly path: string
  readonly method: OpenApiHttpMethod
}
