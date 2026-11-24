import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { OpenApiTreeBuilder } from '../../src/building-service/openapi/tree/builder'
import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { ITreeNode, TreeNodeComplexityTypes } from '../../src/model/abstract/tree/tree-node.interface'
import { NODE_LEVEL_DIFF_KEY } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { AsyncApiTreeNodeKinds } from '../../src/model/async-api/types/node-kind'
import { OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { SECURITY_ALTERNATIVES_DIFF_KEY } from '../../src/model/security/tree-with-diffs/diff-keys'
import { hasNodeDiffs } from '../../src/model/abstract/tree-with-diffs/row-diffs-base'
import { buildAsyncApiSecurityTreeWithDiffs } from '../helpers/async-api-security-fixtures'
import { loadMergedOpenApiSample, loadNormalizedOpenApiSample, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

// Selector options are nested nodes of one complex container (docs/design/shared/features/selector-options.md).

const ORDER_POST = { path: '/orders', method: 'post' }

function find(node: ITreeNode | null | undefined, kind: string): ITreeNode {
  const found = node?.childrenNodes().find(candidate => candidate.kind === kind)
  if (!found) {
    throw new Error(`no ${kind} under ${node?.kind}`)
  }
  return found
}

function plain(caseId: string, operationKeys = { path: '/orders', method: 'post' }): ITreeNode {
  const root = new OpenApiTreeBuilder({ source: loadNormalizedOpenApiSample(caseId), operationKeys }).build().root
  if (!root) {
    throw new Error('no root')
  }
  return root
}

function withDiffs(caseId: string): ITreeNode {
  const root = new OpenApiTreeWithDiffsBuilder({ source: loadMergedOpenApiSample(caseId), operationKeys: ORDER_POST, diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS }).build().root
  if (!root) {
    throw new Error('no root')
  }
  return root
}

function expectContainerOf(container: ITreeNode, optionKind: string, parent: ITreeNode): ITreeNode[] {
  expect(container.type).toBe(TreeNodeComplexityTypes.COMPLEX)
  const options = container.nestedNodes()
  expect(options.length).toBeGreaterThan(0)
  for (const option of options) {
    expect(option.kind).toBe(optionKind)
    expect(option.container).toBe(container)
    // An option's parent is the container's parent (shared crawl hooks).
    expect(option.parent).toBe(parent)
  }
  return options
}

describe('Selector options are nested nodes: OpenAPI', () => {
  it('response codes are nested nodes of `responses`, in canonical order', () => {
    const operation = plain('oas30/structure/04-response-code-order')
    const options = expectContainerOf(find(operation, OpenApiTreeNodeKinds.RESPONSES), OpenApiTreeNodeKinds.RESPONSE, operation)
    expect(options.map(option => option.key)).toEqual(['101', '201', '2XX', '302', '404', '4XX', '500', 'default'])
  })

  it('media types are nested nodes of `content`, in the request and in a response Body', () => {
    const operation = withDiffs('request-body/08-media-type-added')
    const requestBody = find(find(operation, OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.REQUEST_BODY)
    const options = expectContainerOf(find(requestBody, OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE, requestBody)
    expect(options.map(option => option.key)).toEqual(['application/json', 'application/xml'])
    const response = find(withDiffs('response-body/08-media-type-added'), OpenApiTreeNodeKinds.RESPONSES).nestedNodes()[0]
    const responseOptions = expectContainerOf(find(response, OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE, response)
    expect(responseOptions.map(option => option.key)).toEqual(['application/json', 'application/xml'])
  })

  it('alternatives are nested nodes of `securityAlternatives`; `security` stays simple with its own value', () => {
    const operation = withDiffs('security/05-alternative-added')
    const security = find(operation, OpenApiTreeNodeKinds.SECURITY)
    expect(security.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(security.value()).toMatchObject({ isInheritedFromDocument: false, allowsAnonymous: false })
    const container = find(security, OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES)
    const options = expectContainerOf(container, OpenApiTreeNodeKinds.SECURITY_REQUIREMENT, security)
    // The toolbar's records live on the container: its options diff and the per-alternative entries.
    expect(hasNodeDiffs(container) && container.diffs[SECURITY_ALTERNATIVES_DIFF_KEY]?.data.action).toBe(DiffAction.replace)
    expect(hasNodeDiffs(security) && security.diffs[SECURITY_ALTERNATIVES_DIFF_KEY]).toBeUndefined()
    expect(options.map(option => hasNodeDiffs(option) ? option.diffs[NODE_LEVEL_DIFF_KEY]?.data.action : 'plain')).toEqual([undefined, DiffAction.add])
  })

  it('a wholly added section: the container and every option inherit the add', () => {
    const security = find(withDiffs('security/01-security-added'), OpenApiTreeNodeKinds.SECURITY)
    const container = find(security, OpenApiTreeNodeKinds.SECURITY_ALTERNATIVES)
    for (const node of [container, ...container.nestedNodes()]) {
      expect(hasNodeDiffs(node) && node.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    }
  })
})

describe('Selector options are nested nodes: AsyncAPI Security (shared module)', () => {
  it('alternatives are nested nodes of the operation section\'s `securityAlternatives`', () => {
    const root = buildAsyncApiSecurityTreeWithDiffs('1.3-alternative-added').root
    const security = find(root, AsyncApiTreeNodeKinds.SECURITY)
    const options = expectContainerOf(find(security, AsyncApiTreeNodeKinds.SECURITY_ALTERNATIVES), AsyncApiTreeNodeKinds.SECURITY_REQUIREMENT, security)
    expect(options.map(option => hasNodeDiffs(option) ? option.diffs[NODE_LEVEL_DIFF_KEY]?.data.action : 'plain')).toEqual([undefined, DiffAction.add])
  })
})
