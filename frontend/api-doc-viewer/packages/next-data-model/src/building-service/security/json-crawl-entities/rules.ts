import { SecurityTreeNodeKinds } from "../../../model/security/types/node-kind"

/**
 * Crawl rules of a Security section spec (`SecuritySpec`): the section (simple, it has its own
 * value), the complex `securityAlternatives` container of the toolbar whose nested nodes are the
 * alternatives (docs/design/shared/features/selector-options.md), their schemes, the OAuth flows of
 * a scheme. The API types mount it at their `security` keys (OpenAPI `/data/security`, AsyncAPI the
 * operation's and every server's `/security`).
 */
export function getSecurityCrawlRules() {
  return {
    '/alternatives': {
      '/*': {
        '/schemes': {
          '/*': {
            '/flows': {
              '/*': { kind: SecurityTreeNodeKinds.OAUTH_FLOW },
            },
            kind: SecurityTreeNodeKinds.SECURITY_SCHEME,
          },
        },
        kind: SecurityTreeNodeKinds.SECURITY_REQUIREMENT,
      },
      kind: SecurityTreeNodeKinds.SECURITY_ALTERNATIVES,
      complex: true,
    },
    kind: SecurityTreeNodeKinds.SECURITY,
  } as const
}
