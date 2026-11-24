import { buildOpenApiHidingUnchangedDocuments, OPENAPI_HIDING_UNCHANGED_OPERATION, openApiHidingUnchangedCases } from '@netcracker/qubership-apihub-samples'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { OpenApiTreeBuilder } from '../../src/building-service/openapi/tree/builder'
import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../src/model/abstract/layout-side'
import { NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { SecurityRowDiffs } from '../../src/model/security/tree-with-diffs/row-diffs'
import { OpenApiTreeNodeWithDiffs } from '../../src/model/openapi/types/aliases'
import { OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { isOpenApiTreeNodeWithDiffs } from '../../src/shared/openapi/guards/tree-node'
import { loadMergedOpenApiSample, loadNormalizedOpenApiSample, mergeOpenApiDocuments, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

// Anonymous access (`{}`) is not a security alternative: it is the `Optional` badge of the Security
// title row. Design: docs/design/openapi/entities/security.md -> "Optional badge (anonymous access)".

const ORDERS_POST = { path: '/orders', method: 'post' }

function securityOf(root: unknown): OpenApiTreeNodeWithDiffs {
  if (!root || !isOpenApiTreeNodeWithDiffs(root)) {
    throw new Error('no root')
  }
  const security = root.childrenNodes().find(node => node.kind === OpenApiTreeNodeKinds.SECURITY)
  if (!security) {
    throw new Error('no security section')
  }
  return security
}

function buildDiffs(source: unknown, operationKeys = ORDERS_POST): OpenApiTreeNodeWithDiffs {
  return securityOf(new OpenApiTreeWithDiffsBuilder({ source, operationKeys, diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS }).build().root)
}

function plainSecurity(caseId: string) {
  const root = new OpenApiTreeBuilder({ source: loadNormalizedOpenApiSample(caseId), operationKeys: ORDERS_POST }).build().root
  const security = root?.childrenNodes().find(node => node.kind === OpenApiTreeNodeKinds.SECURITY)
  if (!security) {
    throw new Error(`no security section in ${caseId}`)
  }
  return security
}

/** The toolbar of a Security section: its complex `securityAlternatives` container. */
function toolbarOf(security: OpenApiTreeNodeWithDiffs): OpenApiTreeNodeWithDiffs {
  const container = security.childrenNodes().find(node => node.kind === OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES)
  if (!container) {
    throw new Error('no securityAlternatives under security')
  }
  return container
}

/** The alternatives: nested nodes of the section's `securityAlternatives` container. */
function alternatives(security: OpenApiTreeNodeWithDiffs): [string[], string | undefined][] {
  return toolbarOf(security).nestedNodes().map(alternative => {
    const value = alternative.value()
    const schemeNames = value && 'schemeNames' in value ? value.schemeNames : []
    return [schemeNames, alternative.diffs[NODE_LEVEL_DIFF_KEY]?.data.action]
  })
}

function badgeSides(security: OpenApiTreeNodeWithDiffs): [boolean, boolean] {
  return [
    SecurityRowDiffs.Security.isAnonymousAllowedOnSide(security, ORIGIN_LAYOUT_SIDE),
    SecurityRowDiffs.Security.isAnonymousAllowedOnSide(security, CHANGED_LAYOUT_SIDE),
  ]
}

describe('OpenAPI security: anonymous access (plain)', () => {
  it('`{}` next to a requirement is no alternative, it allows anonymous access', () => {
    const security = plainSecurity('oas30/structure/07-security-anonymous-alternative')
    expect(security.value()).toMatchObject({ allowsAnonymous: true })
    expect(security.childrenNodes().map(alternative => alternative.value())).toEqual([{ schemeNames: ['api_key'] }])
  })

  it('an anonymous-only list keeps the section, with no alternatives', () => {
    const security = plainSecurity('oas30/structure/10-security-anonymous-only')
    expect(security.value()).toMatchObject({ allowsAnonymous: true })
    // The toolbar container exists (the list is present) and holds no alternative.
    const toolbar = security.childrenNodes().find(node => node.kind === OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES)
    expect(security.childrenNodes().map(node => node.kind)).toEqual([OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES])
    expect(toolbar?.nestedNodes()).toEqual([])
  })

  it('a list without `{}` does not allow anonymous access', () => {
    expect(plainSecurity('oas30/structure/05-security-inherited-from-document').value()).toMatchObject({ allowsAnonymous: false })
  })
})

describe('OpenAPI security: anonymous access (with diffs)', () => {
  it.each([
    ['security/07-anonymous-alternative-added', DiffAction.add, [false, true]],
    ['security/08-anonymous-alternative-removed', DiffAction.remove, [true, false]],
  ] as const)('%s: a title-row change only', (caseId, action, sides) => {
    const security = buildDiffs(loadMergedOpenApiSample(caseId))
    expect(SecurityRowDiffs.Security.takeOptionalBadgeDiff(security)?.data.action).toBe(action)
    expect(badgeSides(security)).toEqual(sides)
    // The whole title row is a yellow replace with a floating badge; the toolbar is not colored.
    expect(SecurityRowDiffs.Security.takeTitleRowDiff(security)?.data.action).toBe(DiffAction.replace)
    expect(security.diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow]).toBeDefined()
    expect(SecurityRowDiffs.Alternatives.takeToolbarRowDiff(toolbarOf(security))).toBeUndefined()
    expect(alternatives(security)).toEqual([[['oauth'], undefined]])
  })

  it.each([
    ['security/33-anonymous-alternative-replaced-by-api-key', DiffAction.remove, [true, false], DiffAction.add],
    ['security/34-api-key-alternative-replaced-by-anonymous', DiffAction.add, [false, true], DiffAction.remove],
  ] as const)('%s: the slot is `{}` on one side only', (caseId, badgeAction, sides, alternativeAction) => {
    const security = buildDiffs(loadMergedOpenApiSample(caseId))
    expect(SecurityRowDiffs.Security.takeOptionalBadgeDiff(security)?.data.action).toBe(badgeAction)
    expect(badgeSides(security)).toEqual(sides)
    expect(alternatives(security)).toEqual([[['oauth'], undefined], [['api_key'], alternativeAction]])
    // The api_key alternative is wholly added / removed: an option change colors the toolbar.
    expect(SecurityRowDiffs.Alternatives.takeToolbarRowDiff(toolbarOf(security))?.data.action).toBe(DiffAction.replace)
    const apiKeyCard = toolbarOf(security).nestedNodes()[1].childrenNodes()[0]
    expect(SecurityRowDiffs.Scheme.isContentChanged(apiKeyCard)).toBe(true)
  })

  it('a wholly added section keeps the badge plain (the section row color wins)', () => {
    const before = { openapi: '3.0.3', info: { title: 'T', version: '1' }, paths: { '/orders': { post: { security: [], responses: { 200: { description: '' } } } } } }
    const after = { ...before, paths: { '/orders': { post: { security: [{}], responses: { 200: { description: '' } } } } } }
    const security = buildDiffs(mergeOpenApiDocuments(before, after))
    expect(SecurityRowDiffs.Security.takeTitleRowDiff(security)?.data.action).toBe(DiffAction.add)
    expect(SecurityRowDiffs.Security.takeOptionalBadgeDiff(security)).toBeUndefined()
    expect(badgeSides(security)).toEqual([false, true])
  })

  it.each(openApiHidingUnchangedCases.filter(testCase => testCase.anonymous).map(testCase => [testCase.caseId, testCase] as const))(
    '%s: unchanged cards stay collapsed when only anonymous access changed',
    (_caseId, testCase) => {
      const { before, after } = buildOpenApiHidingUnchangedDocuments(testCase)
      const security = buildDiffs(mergeOpenApiDocuments(before, after), OPENAPI_HIDING_UNCHANGED_OPERATION)
      expect(SecurityRowDiffs.Security.takeOptionalBadgeDiff(security)).toBeDefined()
      const cards = security.childrenNodes().flatMap(alternative => alternative.childrenNodes())
      expect(cards.map(card => SecurityRowDiffs.Scheme.isContentChanged(card))).toEqual([false, false])
    },
  )
})
