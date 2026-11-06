import { SecurityOAuthFlowType, SecurityRequiredScopesKind } from "../../model/security/types/node-value"

/**
 * The crawl input of a Security section, the same for every API type: the section -> its
 * alternatives -> their schemes -> the OAuth flows of a scheme. Built by the spec-specific
 * `SecuritySpecBuilder`s; with diffs, the builders also attach diff records (symbol keys).
 * Design: docs/design/async-api/features/security.md -> "Implementation plan".
 */

export interface SecurityOAuthFlowSpec {
  flowType: SecurityOAuthFlowType
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
  [key: symbol]: unknown
}

export interface SecuritySchemeSpec {
  name: string
  isResolved: boolean
  type?: string
  description?: string
  in?: string
  parameterName?: string
  scheme?: string
  bearerFormat?: string
  openIdConnectUrl?: string
  requiredScopes: string[]
  requiredScopesKind: SecurityRequiredScopesKind
  flows?: Partial<Record<SecurityOAuthFlowType, SecurityOAuthFlowSpec>>
  [key: symbol]: unknown
}

export interface SecurityAlternativeSpec {
  schemeNames: string[]
  schemes: Record<string, SecuritySchemeSpec>
  [key: symbol]: unknown
}

export interface SecuritySpec {
  isInheritedFromDocument: boolean
  /** OpenAPI: the list contains `{}` (with diffs: on either side); `{}` is never an alternative. */
  allowsAnonymous: boolean
  alternatives: SecurityAlternativeSpec[]
  [key: symbol]: unknown
}
