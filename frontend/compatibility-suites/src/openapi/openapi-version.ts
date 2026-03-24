export const DEFAULT_OPENAPI_VERSION_PAIR: [string, string] = ['3.0.0', '3.0.0']

/**
 * Patches only the root "openapi:" line in an OpenAPI YAML string.
 * Throws if the root "openapi" field is missing.
 */
export const patchOpenApiVersion = (source: string, version: string): string => {
  const pattern = /^openapi:\s*.*$/m
  if (!pattern.test(source)) {
    throw new Error(
      `Invalid OpenAPI sample: missing root "openapi" field. Sample start: ${source.slice(0, 100)}...`,
    )
  }
  return source.replace(pattern, `openapi: ${version}`)
}
