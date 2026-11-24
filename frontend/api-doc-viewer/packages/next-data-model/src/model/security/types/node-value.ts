import { SecurityTreeNodeKind, SecurityTreeNodeKinds } from "./node-kind"

/**
 * Node values of a Security section (OpenAPI, AsyncAPI). Spec-specific meaning is resolved by the
 * builders: a scheme value is the same whether it came from an OpenAPI requirement + `components`
 * entry or from an AsyncAPI scheme list item.
 */

export type SecurityOAuthFlowType = 'implicit' | 'password' | 'clientCredentials' | 'authorizationCode'

export const SECURITY_OAUTH_FLOW_TYPES: readonly SecurityOAuthFlowType[] = ['implicit', 'password', 'clientCredentials', 'authorizationCode']

/** How a scheme's required scopes are read (spec / dialect decision): scopes, OAS 3.1 roles, or ignored. */
export type SecurityRequiredScopesKind = 'scopes' | 'roles' | 'ignored'

export interface SecurityTreeNodeValueTypeSecurity {
  /** OpenAPI: the operation has no `security` and inherits the document list. AsyncAPI: always `false`. */
  readonly isInheritedFromDocument: boolean
  /**
   * OpenAPI: the list contains the anonymous requirement `{}` (the `Optional` badge of the title
   * row; `{}` is never an alternative). With diffs: on either side, the per-side answer is
   * `SecurityRowDiffs.Security.isAnonymousAllowedOnSide`. AsyncAPI: always `false`.
   */
  readonly allowsAnonymous: boolean
}

/** One alternative (toolbar option): OpenAPI a requirement of several schemes, AsyncAPI one scheme. */
export interface SecurityTreeNodeValueTypeRequirement {
  readonly schemeNames: string[]
}

export interface SecurityTreeNodeValueTypeScheme {
  readonly name: string
  readonly isResolved: boolean
  readonly type?: string
  readonly description?: string
  readonly in?: string
  readonly parameterName?: string
  readonly scheme?: string
  readonly bearerFormat?: string
  readonly openIdConnectUrl?: string
  readonly requiredScopes: string[]
  readonly requiredScopesKind: SecurityRequiredScopesKind
}

export interface SecurityTreeNodeValueTypeOAuthFlow {
  readonly flowType: SecurityOAuthFlowType
  readonly authorizationUrl?: string
  readonly tokenUrl?: string
  readonly refreshUrl?: string
  /** Scope name -> description (OpenAPI `scopes`, AsyncAPI `availableScopes`). */
  readonly scopes: Record<string, string>
}

/** The alternatives container has no own value (a complex node delegates to the selected alternative). */
export type SecurityTreeNodeValueTypeAlternatives = Record<string, never>

export type SecurityTreeNodeValue<T extends SecurityTreeNodeKind> =
  T extends typeof SecurityTreeNodeKinds.SECURITY ? SecurityTreeNodeValueTypeSecurity
  : T extends typeof SecurityTreeNodeKinds.SECURITY_ALTERNATIVES ? SecurityTreeNodeValueTypeAlternatives
  : T extends typeof SecurityTreeNodeKinds.SECURITY_REQUIREMENT ? SecurityTreeNodeValueTypeRequirement
  : T extends typeof SecurityTreeNodeKinds.SECURITY_SCHEME ? SecurityTreeNodeValueTypeScheme
  : T extends typeof SecurityTreeNodeKinds.OAUTH_FLOW ? SecurityTreeNodeValueTypeOAuthFlow
  : never

export type SecurityAnyTreeNodeValue = SecurityTreeNodeValue<SecurityTreeNodeKind>

/** Value props of each security kind, typed by the kind's value. */
export type SecurityNodeValueProps = {
  readonly [K in SecurityTreeNodeKind]: readonly (keyof SecurityTreeNodeValue<K>)[]
}

/** Value props per security kind: the fields a node value is picked from (plain and with diffs). */
export const SECURITY_NODE_VALUE_PROPS: SecurityNodeValueProps = {
  [SecurityTreeNodeKinds.SECURITY]: ['isInheritedFromDocument', 'allowsAnonymous'] satisfies (keyof SecurityTreeNodeValueTypeSecurity)[],
  [SecurityTreeNodeKinds.SECURITY_ALTERNATIVES]: [],
  [SecurityTreeNodeKinds.SECURITY_REQUIREMENT]: ['schemeNames'] satisfies (keyof SecurityTreeNodeValueTypeRequirement)[],
  [SecurityTreeNodeKinds.SECURITY_SCHEME]: [
    'name', 'isResolved', 'type', 'description', 'in', 'parameterName', 'scheme', 'bearerFormat', 'openIdConnectUrl', 'requiredScopes', 'requiredScopesKind',
  ] satisfies (keyof SecurityTreeNodeValueTypeScheme)[],
  [SecurityTreeNodeKinds.OAUTH_FLOW]: ['flowType', 'authorizationUrl', 'tokenUrl', 'refreshUrl', 'scopes'] satisfies (keyof SecurityTreeNodeValueTypeOAuthFlow)[],
}
