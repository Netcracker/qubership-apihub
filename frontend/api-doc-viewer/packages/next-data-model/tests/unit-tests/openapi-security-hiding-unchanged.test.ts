import {
  buildOpenApiHidingUnchangedDocuments,
  OPENAPI_HIDING_UNCHANGED_OPERATION,
  OPENAPI_SECURITY_SCHEME_FRAGMENTS,
  openApiHidingUnchangedCases,
  OpenApiHidingUnchangedCase,
} from '@netcracker/qubership-apihub-samples'
import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { SecurityRowDiffs } from '../../src/model/security/tree-with-diffs/row-diffs'
import { OpenApiTreeNodeWithDiffs } from '../../src/model/openapi/types/aliases'
import { OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { isOpenApiTreeNodeWithDiffs } from '../../src/shared/openapi/guards/tree-node'
import { mergeOpenApiDocuments, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

/** Scheme cards of the only security alternative of a programmatic hiding-unchanged case. */
function schemeCards(testCase: OpenApiHidingUnchangedCase): OpenApiTreeNodeWithDiffs[] {
  const { before, after } = buildOpenApiHidingUnchangedDocuments(testCase)
  const root = new OpenApiTreeWithDiffsBuilder({
    source: mergeOpenApiDocuments(before, after),
    operationKeys: OPENAPI_HIDING_UNCHANGED_OPERATION,
    diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
  }).build().root
  if (!root || !isOpenApiTreeNodeWithDiffs(root)) {
    throw new Error('no root')
  }
  const security = root.childrenNodes().find(node => node.kind === OpenApiTreeNodeKinds.SECURITY)
  const alternative = security?.childrenNodes()[0]
  if (!alternative) {
    throw new Error(`no security alternative in ${testCase.caseId}`)
  }
  return alternative.childrenNodes()
}

describe('OpenAPI with diffs: security card content changes (hiding unchanged nodes)', () => {
  it.each(openApiHidingUnchangedCases.map(testCase => [testCase.caseId, testCase] as const))('%s', (_caseId, testCase) => {
    const cards = schemeCards(testCase)
    expect(cards.map(card => String(card.key))).toEqual(testCase.schemes.map(({ fragment }) => OPENAPI_SECURITY_SCHEME_FRAGMENTS[fragment].name))
    expect(cards.map(card => SecurityRowDiffs.Scheme.isContentChanged(card))).toEqual(testCase.schemes.map(({ hasChanges }) => hasChanges))
  })

  it('a changed flow part makes the whole card content changed, the other flows included', () => {
    const [card] = schemeCards({ caseId: 'all-flows', title: '', dialect: '3.0', schemes: [{ fragment: 'oauth2AllFlows', hasChanges: true }] })
    const changedFlows = card.childrenNodes().filter(flow => Object.keys(flow.diffs).length > 0).map(flow => String(flow.key))
    expect(changedFlows).toEqual(['clientCredentials'])
    expect(SecurityRowDiffs.Scheme.isContentChanged(card)).toBe(true)
  })
})
