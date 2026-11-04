import { SecurityRequiredScopesKind } from "../../../../model/security/types/node-value"
import { OpenApiSpecVersion } from "@netcracker/qubership-apihub-api-unifier"
const OAUTH_LIKE_SCHEME_TYPES: ReadonlySet<string> = new Set(['oauth2', 'openIdConnect'])

/**
 * The only place where OAS 3.0 and OAS 3.1 behaviour differs in the OpenAPI stack.
 * Everything else is absorbed by api-unifier and the JSON Schema stack.
 */
export interface OpenApiDialect {
  readonly specVersion: OpenApiSpecVersion
  /** Security scheme types this version defines. Unknown types are still rendered. */
  readonly securitySchemeTypes: ReadonlySet<string>
  /** Whether the Responses Object is required on an operation (dev-mode warning only). */
  readonly isResponsesObjectRequired: boolean
  /** How the scopes array of a Security Requirement Object is read for one scheme type. */
  resolveRequiredScopesKind(schemeType: string | undefined): SecurityRequiredScopesKind
}

export abstract class OpenApiDialectBase implements OpenApiDialect {
  public abstract readonly specVersion: OpenApiSpecVersion
  public abstract readonly securitySchemeTypes: ReadonlySet<string>
  public abstract readonly isResponsesObjectRequired: boolean

  public resolveRequiredScopesKind(schemeType: string | undefined): SecurityRequiredScopesKind {
    if (schemeType && OAUTH_LIKE_SCHEME_TYPES.has(schemeType)) {
      return 'scopes'
    }
    return this.resolveNonOAuthScopesKind()
  }

  /** Meaning of a scopes list on a scheme that is neither OAuth2 nor OpenID Connect. */
  protected abstract resolveNonOAuthScopesKind(): SecurityRequiredScopesKind
}
