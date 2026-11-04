/**
 * Node kinds of a Security section, shared by every API type that has one (OpenAPI, AsyncAPI): the
 * section, its alternatives (toolbar options), their schemes (cards), the OAuth flows of a scheme.
 * The API types' own kind lists include these values.
 * Design: docs/design/async-api/features/security.md -> "Implementation plan".
 */
export const SecurityTreeNodeKinds = {
  SECURITY: 'security',
  /** The toolbar's container: complex, its nested nodes are the alternatives (`securityRequirement`). */
  SECURITY_ALTERNATIVES: 'securityAlternatives',
  SECURITY_REQUIREMENT: 'securityRequirement',
  SECURITY_SCHEME: 'securityScheme',
  OAUTH_FLOW: 'oauthFlow',
} as const

export type SecurityTreeNodeKind = typeof SecurityTreeNodeKinds[keyof typeof SecurityTreeNodeKinds]

export const SecurityTreeNodeKindsList: readonly SecurityTreeNodeKind[] = Object.values(SecurityTreeNodeKinds)

export function isSecurityTreeNodeKind(kind: string): kind is SecurityTreeNodeKind {
  return SecurityTreeNodeKindsList.some(securityKind => securityKind === kind)
}
