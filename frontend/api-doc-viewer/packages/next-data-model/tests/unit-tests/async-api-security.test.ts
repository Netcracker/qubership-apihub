import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../src/model/abstract/layout-side'
import { DETAILED_DISPLAY_MODE } from '../../src/model/abstract/display-mode'
import { ITreeNode } from '../../src/model/abstract/tree/tree-node.interface'
import { HighlightVariant, NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { ASYNC_API_SECURITY_DISPLAY_LABELS, ASYNC_API_SECURITY_NODE_VISIBILITY } from '../../src/model/async-api/security-presentation'
import { AsyncApiTreeNodeKinds } from '../../src/model/async-api/types/node-kind'
import { SecurityRowDiffs } from '../../src/model/security/tree-with-diffs/row-diffs'
import { isAsyncApiTreeNodeWithDiffs } from '../../src/shared/async-api/guards/tree-node'
import { buildAsyncApiSecurityTree, buildAsyncApiSecurityTreeWithDiffs } from '../helpers/async-api-security-fixtures'

type AnyNode = ITreeNode<unknown, string, unknown>

function childOf(node: AnyNode | null | undefined, kind: string): AnyNode {
  const found = node?.childrenNodes().find(candidate => candidate.kind === kind)
  if (!found) {
    throw new Error(`no ${kind} under ${node?.kind}`)
  }
  return found
}

function childrenOf(node: AnyNode, kind: string): AnyNode[] {
  return node.childrenNodes().filter(candidate => candidate.kind === kind)
}

/** The toolbar of a Security section: its complex `securityAlternatives` container. */
function toolbarOf(security: AnyNode): AnyNode {
  return childOf(security, AsyncApiTreeNodeKinds.SECURITY_ALTERNATIVES)
}

/** The alternatives of a Security section: nested nodes of its `securityAlternatives` container. */
function alternativesOf(security: AnyNode): AnyNode[] {
  return childOf(security, AsyncApiTreeNodeKinds.SECURITY_ALTERNATIVES).nestedNodes().filter(node => node.kind === AsyncApiTreeNodeKinds.SECURITY_REQUIREMENT)
}

/** The operation's Security section: a child of the message root. */
function operationSecurity(root: AnyNode | null): AnyNode {
  return childOf(root, AsyncApiTreeNodeKinds.SECURITY)
}

/** The servers of the channel (message root -> section selector -> channel -> servers). */
function servers(root: AnyNode | null): AnyNode[] {
  const selector = childOf(root, AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
  const channel = selector.nestedNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
  return childrenOf(childOf(channel, AsyncApiTreeNodeKinds.SERVERS), AsyncApiTreeNodeKinds.SERVER)
}

/** The schemes of every alternative (one per alternative in AsyncAPI). */
function schemes(security: AnyNode): AnyNode[] {
  return alternativesOf(security)
    .flatMap(alternative => childrenOf(alternative, AsyncApiTreeNodeKinds.SECURITY_SCHEME))
}

function wholeAction(node: AnyNode): string | undefined {
  return isAsyncApiTreeNodeWithDiffs(node) ? node.diffs[NODE_LEVEL_DIFF_KEY]?.data.action : undefined
}

describe('AsyncAPI security: plain', () => {
  it('builds one alternative per list item, each with its one named scheme', () => {
    const security = operationSecurity(buildAsyncApiSecurityTree('23-several-alternatives').root)
    const alternatives = alternativesOf(security)
    expect(alternatives.map(alternative => alternative.value())).toEqual([
      { schemeNames: ['oauth'] },
      { schemeNames: ['headerKey'] },
      { schemeNames: ['scram512'] },
    ])
    expect(schemes(security).map(scheme => (scheme.value() as { type: string }).type)).toEqual(['oauth2', 'httpApiKey', 'scramSha512'])
  })

  it('maps the scheme fields like OpenAPI: httpApiKey name / in, http scheme and bearer format', () => {
    const [headerKey] = schemes(operationSecurity(buildAsyncApiSecurityTree('07-http-api-key-header').root))
    expect(headerKey.value()).toMatchObject({ name: 'headerKey', isResolved: true, type: 'httpApiKey', in: 'header', parameterName: 'X-API-Key', requiredScopesKind: 'ignored' })
    const [bearer] = schemes(operationSecurity(buildAsyncApiSecurityTree('11-http-bearer-format').root))
    expect(bearer.value()).toMatchObject({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
  })

  it('reads flows with availableScopes and the scheme\'s own required scopes', () => {
    const [oauth] = schemes(operationSecurity(buildAsyncApiSecurityTree('14-oauth2-client-credentials-required-scope').root))
    expect(oauth.value()).toMatchObject({ type: 'oauth2', requiredScopes: ['events:write'], requiredScopesKind: 'scopes' })
    const [flow] = childrenOf(oauth, AsyncApiTreeNodeKinds.OAUTH_FLOW)
    expect(flow.value()).toEqual({
      flowType: 'clientCredentials',
      tokenUrl: 'https://auth.example.com/token',
      scopes: { 'events:read': 'Read events', 'events:write': 'Publish events' },
    })
    const [oidc] = schemes(operationSecurity(buildAsyncApiSecurityTree('17-openid-connect-required-scopes').root))
    expect(oidc.value()).toMatchObject({ openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration', requiredScopes: ['openid', 'events:read'] })
  })

  it('names an inline scheme by its list position', () => {
    const [inline] = schemes(operationSecurity(buildAsyncApiSecurityTree('24-inline-scheme').root))
    expect(inline.value()).toMatchObject({ name: 'Security scheme 1', type: 'http', scheme: 'basic', description: 'Inline basic authentication.' })
  })

  it('builds server security inside the server node, and both sections when both are declared', () => {
    const root = buildAsyncApiSecurityTree('26-operation-and-server-security').root
    expect(schemes(operationSecurity(root)).map(scheme => (scheme.value() as { name: string }).name)).toEqual(['oauth'])
    const [server] = servers(root)
    expect(schemes(childOf(server, AsyncApiTreeNodeKinds.SECURITY)).map(scheme => (scheme.value() as { name: string }).name)).toEqual(['scram256'])
    expect(() => operationSecurity(buildAsyncApiSecurityTree('25-server-security').root)).toThrow()
  })

  it('labels the 13 AsyncAPI scheme types and decides the rows per type', () => {
    expect(['userPassword', 'apiKey', 'X509', 'symmetricEncryption', 'asymmetricEncryption', 'httpApiKey', 'http', 'oauth2', 'openIdConnect', 'plain', 'scramSha256', 'scramSha512', 'gssapi']
      .map(type => ASYNC_API_SECURITY_DISPLAY_LABELS.securitySchemeType(type))).toEqual([
      'User / Password', 'API key', 'X.509 certificate', 'Symmetric encryption', 'Asymmetric encryption', 'HTTP API key', 'HTTP',
      'OAuth 2.0', 'OpenID Connect', 'SASL PLAIN', 'SASL SCRAM-SHA-256', 'SASL SCRAM-SHA-512', 'SASL GSSAPI',
    ])
    const [apiKey] = schemes(operationSecurity(buildAsyncApiSecurityTree('03-api-key-in-password').root))
    const apiKeyRows = ASYNC_API_SECURITY_NODE_VISIBILITY.resolveSecurityScheme(apiKey.value() as never, DETAILED_DISPLAY_MODE)
    expect(apiKeyRows).toMatchObject({ showApiKeyLocation: true, showParameterName: false })
    expect(ASYNC_API_SECURITY_DISPLAY_LABELS.apiKeyLocation('password')).toBe('Password')
    const [httpApiKey] = schemes(operationSecurity(buildAsyncApiSecurityTree('08-http-api-key-query').root))
    expect(ASYNC_API_SECURITY_NODE_VISIBILITY.resolveSecurityScheme(httpApiKey.value() as never, DETAILED_DISPLAY_MODE)).toMatchObject({ showParameterName: true, showApiKeyLocation: false })
    expect(ASYNC_API_SECURITY_DISPLAY_LABELS.apiKeyParameterNameLabel('query')).toEqual({ place: 'Query', suffix: ' parameter name' })
  })
})

describe('AsyncAPI security: diffs', () => {
  it('operation security added / removed: the whole section', () => {
    expect(wholeAction(operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.1-operation-security-added').root))).toBe(DiffAction.add)
    expect(wholeAction(operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.2-operation-security-removed').root))).toBe(DiffAction.remove)
  })

  it('alternative added: yellow toolbar row, the option wholly added (green border)', () => {
    const security = operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.3-alternative-added').root)
    expect(SecurityRowDiffs.Alternatives.takeToolbarRowDiff(toolbarOf(security))?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
    const [first, second] = alternativesOf(security)
    expect(wholeAction(first)).toBeUndefined()
    expect(wholeAction(second)).toBe(DiffAction.add)
    // The toolbar row's badge belongs to the alternatives container.
    const toolbar = toolbarOf(security)
    expect(isAsyncApiTreeNodeWithDiffs(toolbar) && toolbar.diffsSeverities?.[NodeDiffsSeverityPlacemennt.SelectorRow]).toBeTruthy()
  })

  it('scheme type replaced: yellow title row, highlighted type text', () => {
    const [scheme] = schemes(operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.8-scheme-type-changed').root))
    expect(SecurityRowDiffs.Scheme.takeTitleRowDiff(scheme)?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
    expect(SecurityRowDiffs.Scheme.resolveTypeTextHighlight(scheme, ORIGIN_LAYOUT_SIDE)).toBe(HighlightVariant.Yellow)
    expect(SecurityRowDiffs.NodeLevel.resolveSideField(scheme, 'type', ORIGIN_LAYOUT_SIDE)).toBe('userPassword')
    expect(SecurityRowDiffs.NodeLevel.resolveSideField(scheme, 'type', CHANGED_LAYOUT_SIDE)).toBe('X509')
  })

  it('description, location, parameter name and http scheme changes are field diffs of the scheme', () => {
    const field = (caseId: string, key: string): string | undefined => {
      const [scheme] = schemes(operationSecurity(buildAsyncApiSecurityTreeWithDiffs(caseId).root))
      return SecurityRowDiffs.Scheme.takeFieldRowDiff(scheme, key)?.data.action
    }
    expect(field('1.5-scheme-description-added', 'description')).toBe(DiffAction.add)
    expect(field('1.7-scheme-description-changed', 'description')).toBe(DiffAction.replace)
    expect(field('1.9-http-api-key-location-changed', 'in')).toBe(DiffAction.replace)
    expect(field('1.10-http-api-key-name-changed', 'parameterName')).toBe(DiffAction.replace)
    expect(field('1.11-api-key-location-changed', 'in')).toBe(DiffAction.replace)
    expect(field('1.12-http-scheme-changed', 'scheme')).toBe(DiffAction.replace)
    expect(field('1.13-bearer-format-added', 'bearerFormat')).toBe(DiffAction.add)
    expect(field('1.15-openid-connect-url-changed', 'openIdConnectUrl')).toBe(DiffAction.replace)
  })

  it('required scope added: a requiredScopes replace, the flow scope row gets the required diff', () => {
    const [scheme] = schemes(operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.16-required-scope-added').root))
    expect(SecurityRowDiffs.Scheme.takeFieldRowDiff(scheme, 'requiredScopes')?.data.action).toBe(DiffAction.replace)
    const [flow] = childrenOf(scheme, AsyncApiTreeNodeKinds.OAUTH_FLOW)
    const read = SecurityRowDiffs.OAuthFlow.resolveScopeRows(flow, scheme).find(row => row.name === 'events:read')
    expect(read?.origin?.required).toBe(false)
    expect(read?.changed?.required).toBe(true)
    expect(read?.requiredDiff?.data.action).toBe(DiffAction.add)
  })

  it('flows: a flow added, a token URL replaced, a flow scope added', () => {
    const [added] = schemes(operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.18-oauth-flow-added').root))
    const implicit = childrenOf(added, AsyncApiTreeNodeKinds.OAUTH_FLOW).find(flow => String(flow.key) === 'implicit')
    expect(implicit && wholeAction(implicit)).toBe(DiffAction.add)
    const [tokenUrl] = schemes(operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.20-token-url-changed').root))
    expect(SecurityRowDiffs.OAuthFlow.takeFieldRowDiff(childrenOf(tokenUrl, AsyncApiTreeNodeKinds.OAUTH_FLOW)[0], 'tokenUrl')?.data.action).toBe(DiffAction.replace)
    const [scopeAdded] = schemes(operationSecurity(buildAsyncApiSecurityTreeWithDiffs('1.23-flow-scope-added').root))
    const rows = SecurityRowDiffs.OAuthFlow.resolveScopeRows(childrenOf(scopeAdded, AsyncApiTreeNodeKinds.OAUTH_FLOW)[0], scopeAdded)
    expect(rows.find(row => row.name === 'events:admin')?.rowDiff?.data.action).toBe(DiffAction.add)
  })

  it('server security: added / removed section, alternative added, inherited from a wholly added server', () => {
    const serverSecurity = (caseId: string, index = 0): AnyNode => childOf(servers(buildAsyncApiSecurityTreeWithDiffs(caseId).root)[index], AsyncApiTreeNodeKinds.SECURITY)
    expect(wholeAction(serverSecurity('2.1-server-security-added'))).toBe(DiffAction.add)
    expect(wholeAction(serverSecurity('2.2-server-security-removed'))).toBe(DiffAction.remove)
    expect(SecurityRowDiffs.Alternatives.takeToolbarRowDiff(toolbarOf(serverSecurity('2.3-server-alternative-added')))?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
    const added = serverSecurity('2.7-server-with-security-added', 1)
    expect(wholeAction(added)).toBe(DiffAction.add)
    expect(isAsyncApiTreeNodeWithDiffs(added) && added.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
  })
})
