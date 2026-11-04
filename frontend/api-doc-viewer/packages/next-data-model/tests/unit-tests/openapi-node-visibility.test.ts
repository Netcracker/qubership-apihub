import { OPENAPI_SECURITY_DISPLAY_LABELS, OPENAPI_SECURITY_NODE_VISIBILITY } from '../../src/model/openapi/security-presentation'
import { SecurityRowDiffs } from '../../src/model/security/tree-with-diffs/row-diffs'
import { SecurityTreeNodeValueTypeScheme } from '../../src/model/security/types/node-value'
import { OpenApiTreeBuilder } from '../../src/building-service/openapi/tree/builder'
import { loadNormalizedOpenApiSample } from '../helpers/openapi-fixtures'

const scheme = (type: string, requiredScopesKind: SecurityTreeNodeValueTypeScheme['requiredScopesKind']): SecurityTreeNodeValueTypeScheme => ({
  name: type,
  isResolved: true,
  type,
  requiredScopes: ['openid', 'admin'],
  requiredScopesKind,
})

describe('OpenAPI security scheme: required scope list', () => {
  it.each([
    ['oauth2', 'scopes', true],
    ['openIdConnect', 'scopes', true],
    ['apiKey', 'roles', true],
    ['http', 'roles', true],
    ['apiKey', 'ignored', false],
  ] as const)('%s (%s): list shown in both display modes = %s', (type, kind, shown) => {
    expect(OPENAPI_SECURITY_NODE_VISIBILITY.resolveSecurityScheme(scheme(type, kind), 'detailed').showRequiredScopeList).toBe(shown)
    expect(OPENAPI_SECURITY_NODE_VISIBILITY.resolveSecurityScheme(scheme(type, kind), 'simple').showRequiredScopeList).toBe(shown)
  })

  it.each([
    ['oas30/fields/security/15-openid-connect-required-scope', 'openid-connect', ['openid'], 'Scopes'],
    ['oas31/fields/security/02-roles-on-api-key', 'api_key', ['admin', 'auditor'], 'Roles'],
  ])('%s: every requirement scope is a required row (no flows)', (caseId, schemeName, names, label) => {
    const tree = new OpenApiTreeBuilder({ source: loadNormalizedOpenApiSample(caseId), operationKeys: { path: '/orders', method: 'post' } }).build()
    const alternatives = tree.root?.childrenNodes().find(child => child.kind === 'security')?.childrenNodes().find(child => child.kind === 'securityAlternatives')?.nestedNodes() ?? []
    const node = alternatives.flatMap(alternative => alternative.childrenNodes()).find(candidate => candidate.key === schemeName)
    expect(node).toBeDefined()
    const rows = SecurityRowDiffs.Scheme.resolveUndeclaredRequiredScopeRows(node!)
    expect(rows.map(row => [row.name, row.origin?.required, row.changed?.required])).toEqual(names.map(name => [name, true, true]))
    const value = node!.value()
    expect(value && 'requiredScopesKind' in value ? OPENAPI_SECURITY_DISPLAY_LABELS.requiredScopeListLabel(value.requiredScopesKind) : undefined).toBe(label)
  })
})
