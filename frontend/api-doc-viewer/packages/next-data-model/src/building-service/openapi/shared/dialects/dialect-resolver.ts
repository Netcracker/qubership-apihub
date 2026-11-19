import { resolveSpec, SPEC_TYPE_OPEN_API_30, SPEC_TYPE_OPEN_API_31 } from "@netcracker/qubership-apihub-api-unifier"
import { OpenApiDialect } from "./dialect"
import { OpenApi30Dialect } from "./openapi-30-dialect"
import { OpenApi31Dialect } from "./openapi-31-dialect"

export class OpenApiDialectResolver {
  private static readonly OPENAPI_30 = new OpenApi30Dialect()
  private static readonly OPENAPI_31 = new OpenApi31Dialect()

  /** Dialect of a (merged) document; `null` for anything that is not OAS 3.0 / 3.1. */
  public static resolve(source: unknown): OpenApiDialect | null {
    let specType: string
    try {
      specType = resolveSpec(source).type
    } catch {
      return null
    }
    switch (specType) {
      case SPEC_TYPE_OPEN_API_30:
        return OpenApiDialectResolver.OPENAPI_30
      case SPEC_TYPE_OPEN_API_31:
        return OpenApiDialectResolver.OPENAPI_31
      default:
        return null
    }
  }
}
