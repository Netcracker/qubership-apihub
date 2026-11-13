import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../src/model/abstract/layout-side'
import { ITreeNode } from '../../src/model/abstract/tree/tree-node.interface'
import { NodeDiffsSeverityPlacemennt } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { ASYNC_API_SECURITY_DISPLAY_LABELS } from '../../src/model/async-api/security-presentation'
import { OPENAPI_SECURITY_DISPLAY_LABELS } from '../../src/model/openapi/security-presentation'
import { SecuritySchemeCardRows } from '../../src/model/security/card-rows'
import { SecurityOAuthFlowRowVisibility, SecuritySchemeRowVisibility } from '../../src/model/security/node-visibility'
import { SECURITY_FIELD_PLACEMENTS } from '../../src/model/security/tree-with-diffs/placements'
import { SecurityRowDiffs } from '../../src/model/security/tree-with-diffs/row-diffs'
import { SecurityTreeNodeKinds } from '../../src/model/security/types/node-kind'
import { buildAsyncApiSecurityTreeWithDiffs } from '../helpers/async-api-security-fixtures'
import { loadMergedOpenApiSample, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

const ALL_SCHEME_ROWS: SecuritySchemeRowVisibility = {
  showDescription: true,
  showParameterName: true,
  showApiKeyLocation: true,
  showHttpScheme: true,
  showBearerFormat: true,
  showOpenIdConnectUrl: true,
  showRequiredScopeList: true,
  showUnresolved: true,
}

const ALL_FLOW_ROWS: SecurityOAuthFlowRowVisibility = {
  showAuthorizationUrl: true,
  showTokenUrl: true,
  showRefreshUrl: true,
  showScopes: true,
}

type AnyNode = ITreeNode

/** The first node of `kind` (children and nested nodes, depth first) and its parent. */
function findWithParent(node: AnyNode | null, kind: string, parent: AnyNode | null = null): { node: AnyNode, parent: AnyNode | null } | undefined {
  if (!node) {
    return undefined
  }
  if (node.kind === kind) {
    return { node, parent }
  }
  for (const child of [...node.childrenNodes(), ...node.nestedNodes()]) {
    const found = findWithParent(child, kind, node)
    if (found) {
      return found
    }
  }
  return undefined
}

describe('SecuritySchemeCardRows: the card rows and the badge each reads', () => {
  it('lists the scheme rows after the parameter-name row in display order, with their placements from the table', () => {
    const rows = SecuritySchemeCardRows.schemeProps(ALL_SCHEME_ROWS, OPENAPI_SECURITY_DISPLAY_LABELS)
    expect(rows.map(row => [row.key, row.field, row.placement, row.link])).toEqual([
      ['apiKeyLocation', 'in', NodeDiffsSeverityPlacemennt.SecuritySchemeParameterNameRow, false],
      ['scheme', 'scheme', NodeDiffsSeverityPlacemennt.SecuritySchemeHttpSchemeRow, false],
      ['bearerFormat', 'bearerFormat', NodeDiffsSeverityPlacemennt.SecuritySchemeBearerFormatRow, false],
      ['openIdConnectUrl', 'openIdConnectUrl', NodeDiffsSeverityPlacemennt.SecuritySchemeOpenIdConnectUrlRow, true],
    ])
    for (const row of rows) {
      expect(SECURITY_FIELD_PLACEMENTS[SecurityTreeNodeKinds.SECURITY_SCHEME]?.[row.field]).toBe(row.placement)
    }
  })

  it('lists the OAuth flow URL rows as links, with their placements from the table', () => {
    const rows = SecuritySchemeCardRows.flowProps(ALL_FLOW_ROWS)
    expect(rows.map(row => [row.key, row.placement, row.link])).toEqual([
      ['authorizationUrl', NodeDiffsSeverityPlacemennt.OAuthFlowAuthorizationUrlRow, true],
      ['tokenUrl', NodeDiffsSeverityPlacemennt.OAuthFlowTokenUrlRow, true],
      ['refreshUrl', NodeDiffsSeverityPlacemennt.OAuthFlowRefreshUrlRow, true],
    ])
  })

  it('formats the AsyncAPI API key location with the API type labels', () => {
    const [apiKeyLocation] = SecuritySchemeCardRows.schemeProps(ALL_SCHEME_ROWS, ASYNC_API_SECURITY_DISPLAY_LABELS)
    expect(apiKeyLocation.format?.('user')).toBe(ASYNC_API_SECURITY_DISPLAY_LABELS.apiKeyLocation('user'))
  })

  it('reads the parameter-name badge from the table', () => {
    expect(SecuritySchemeCardRows.parameterNamePlacement()).toBe(SECURITY_FIELD_PLACEMENTS[SecurityTreeNodeKinds.SECURITY_SCHEME]?.parameterName)
  })
})

function buildOpenApiSecurityCase(caseId: string): AnyNode | null {
  return new OpenApiTreeWithDiffsBuilder({
    source: loadMergedOpenApiSample(`security/${caseId}`),
    operationKeys: { path: '/orders', method: 'post' },
    diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
  }).build().root
}

describe('Security toolbar: sides and option markers from the shared accessors', () => {
  it('shows no options on the side where the whole section does not exist', () => {
    const alternatives = findWithParent(buildOpenApiSecurityCase('01-security-added'), SecurityTreeNodeKinds.SECURITY_ALTERNATIVES)?.node
    expect(alternatives).toBeTruthy()
    expect(SecurityRowDiffs.Alternatives.isToolbarShownOnSide(alternatives!, ORIGIN_LAYOUT_SIDE)).toBe(false)
    expect(SecurityRowDiffs.Alternatives.isToolbarShownOnSide(alternatives!, CHANGED_LAYOUT_SIDE)).toBe(true)
  })

  it('marks an alternative with an inner change, never a wholly added one (V9)', () => {
    const toolbar = findWithParent(buildOpenApiSecurityCase('05-alternative-added'), SecurityTreeNodeKinds.SECURITY_ALTERNATIVES)?.node
    const alternatives = toolbar?.nestedNodes() ?? []
    const added = alternatives.filter(alternative => SecurityRowDiffs.NodeLevel.isOwnWholeChange(alternative))
    expect(added.length).toBeGreaterThan(0)
    for (const alternative of added) {
      expect(SecurityRowDiffs.NodeLevel.takeChangesMarkerSummary(alternative).size).toBe(0)
    }
    const changed = findWithParent(buildOpenApiSecurityCase('11-required-scope-added'), SecurityTreeNodeKinds.SECURITY_REQUIREMENT)?.node
    expect(SecurityRowDiffs.NodeLevel.takeChangesMarkerSummary(changed!).size).toBeGreaterThan(0)
  })
})

describe('SecurityScopeRow.severity: scope-row badges come from the data layer with their cause', () => {
  it('OpenAPI: a changed scope description badges its row, caused at the scopes declaration', () => {
    const root = new OpenApiTreeWithDiffsBuilder({
      source: loadMergedOpenApiSample('security/32-flow-scope-description-changed'),
      operationKeys: { path: '/orders', method: 'post' },
      diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
    }).build().root
    const flow = findWithParent(root, SecurityTreeNodeKinds.OAUTH_FLOW)
    expect(flow?.parent).toBeTruthy()
    const row = SecurityRowDiffs.OAuthFlow.resolveScopeRows(flow!.node, flow!.parent!).find(scope => scope.name === 'orders:read')
    expect(row?.severity?.type).toBe(row?.rowDiff?.data.type)
    expect(row?.severity?.causedAt.length).toBeGreaterThan(0)
    expect(row?.ownRowDiff).toBe(row?.rowDiff)
  })

  it('AsyncAPI: the same rule through the shared accessor', () => {
    const flow = findWithParent(buildAsyncApiSecurityTreeWithDiffs('1.25-flow-scope-description-changed').root, SecurityTreeNodeKinds.OAUTH_FLOW)
    expect(flow?.parent).toBeTruthy()
    const changed = SecurityRowDiffs.OAuthFlow.resolveScopeRows(flow!.node, flow!.parent!).filter(scope => scope.ownRowDiff)
    expect(changed.length).toBeGreaterThan(0)
    for (const row of changed) {
      expect(row.severity?.type).toBe(row.rowDiff?.data.type)
      expect(row.severity?.causedAt.length).toBeGreaterThan(0)
    }
  })
})
