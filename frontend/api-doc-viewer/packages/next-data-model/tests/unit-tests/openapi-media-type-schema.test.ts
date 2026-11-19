import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { TreeNodeComplexityTypes } from '../../src/model/abstract/tree/tree-node.interface'
import { JsonSchemaTreeBuilder } from '../../src/building-service/json-schema/tree/builder'
import { OpenApiTreeBuilder } from '../../src/building-service/openapi/tree/builder'
import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { SectionRowDiffs } from '../../src/model/abstract/tree-with-diffs/row-diffs-base'
import { OpenApiDisplayLabels } from '../../src/model/openapi/display/labels'
import { OpenApiMediaTypeSchema } from '../../src/model/openapi/media-type-schema'
import { JsonSchemaTreeNode } from '../../src/model/json-schema/types/aliases'
import { OpenApiTreeNode, OpenApiTreeNodeWithDiffs } from '../../src/model/openapi/types/aliases'
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { isOpenApiTreeNodeWithDiffs } from '../../src/shared/openapi/guards/tree-node'
import { isObjective } from '../../src/utilities'
import { loadMergedOpenApiSample, loadNormalizedOpenApiSample, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

const OPERATION = { path: '/orders', method: 'post' }
const DIFFS_KEY = OPENAPI_TEST_DIFF_META_KEYS.diffsMetaKey
const TITLE = OpenApiDisplayLabels.WRAPPED_BODY_SCHEMA_TITLE

function child(node: OpenApiTreeNodeWithDiffs, kind: OpenApiTreeNodeKind, key?: string): OpenApiTreeNodeWithDiffs {
  // A complex container's options are its nested nodes (selector options rule).
  const found = (node.type === TreeNodeComplexityTypes.COMPLEX ? node.nestedNodes() : node.childrenNodes()).find(candidate => candidate.kind === kind && (key === undefined || String(candidate.key) === key))
  if (!found || !isOpenApiTreeNodeWithDiffs(found)) {
    throw new Error(`no ${kind} ${key ?? ''} under ${node.kind}`)
  }
  return found
}

/** The request body's media type `key` of a request-body diff fixture. */
function requestMediaType(caseId: string, key: string): OpenApiTreeNodeWithDiffs {
  const root = new OpenApiTreeWithDiffsBuilder({
    source: loadMergedOpenApiSample(`request-body/${caseId}`),
    operationKeys: OPERATION,
    diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
  }).build().root
  if (!root || !isOpenApiTreeNodeWithDiffs(root)) {
    throw new Error('no root')
  }
  const body = child(child(root, OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.REQUEST_BODY)
  return child(child(body, OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE, key)
}

function properties(wrapped: object | undefined): Record<PropertyKey, unknown> {
  const value: unknown = wrapped ? Reflect.get(wrapped, 'properties') : undefined
  if (!isObjective(value)) {
    throw new Error('no properties')
  }
  return value
}

describe('OpenAPI media-type schema (Body)', () => {
  it('wraps the schema under `Type`; without a diffs key there is no record', () => {
    const mediaType = requestMediaType('08-media-type-added', 'application/xml')
    expect(OpenApiMediaTypeSchema.has(mediaType)).toBe(true)
    const wrapped = OpenApiMediaTypeSchema.wrap(mediaType)
    expect(wrapped).toMatchObject({ type: 'object' })
    expect(properties(wrapped)[TITLE]).toBe(OpenApiMediaTypeSchema.take(mediaType))
    expect(Object.getOwnPropertySymbols(properties(wrapped))).toEqual([])
  })

  it('an added media type paints `Type` with its own whole add', () => {
    const mediaType = requestMediaType('08-media-type-added', 'application/xml')
    const record = properties(OpenApiMediaTypeSchema.wrap(mediaType, DIFFS_KEY))[DIFFS_KEY]
    const wholeDiff = SectionRowDiffs.takeHeaderRowDiff(mediaType)?.data
    expect(wholeDiff?.action).toBe(DiffAction.add)
    expect(record).toEqual({ [TITLE]: wholeDiff })
    expect(isObjective(record) && record[TITLE]).toBe(wholeDiff)
  })

  it('a media type of a wholly added Body paints `Type` with the inherited add', () => {
    const mediaType = requestMediaType('01-body-added', 'application/json')
    const wholeDiff = SectionRowDiffs.takeHeaderRowDiff(mediaType)?.data
    expect(wholeDiff?.action).toBe(DiffAction.add)
    expect(properties(OpenApiMediaTypeSchema.wrap(mediaType, DIFFS_KEY))[DIFFS_KEY]).toEqual({ [TITLE]: wholeDiff })
  })

  it('a media type changed only inside its schema writes no `Type` record', () => {
    const mediaType = requestMediaType('17-schema-property-added', 'application/json')
    expect(SectionRowDiffs.takeHeaderRowDiff(mediaType)).toBeUndefined()
    expect(properties(OpenApiMediaTypeSchema.wrap(mediaType, DIFFS_KEY))[DIFFS_KEY]).toBeUndefined()
  })
})

describe('OpenAPI media-type schema (cycles in the nested viewer)', () => {
  const CASE_ID = 'oas30/structure/11-circular-schema-with-extension'

  function plainChild(node: OpenApiTreeNode, kind: OpenApiTreeNodeKind): OpenApiTreeNode {
    const found = (node.type === TreeNodeComplexityTypes.COMPLEX ? node.nestedNodes() : node.childrenNodes()).find(candidate => candidate.kind === kind)
    if (!found) {
      throw new Error(`no ${kind} under ${node.kind}`)
    }
    return found
  }

  /** Walks the keys from the root, materializing deferred children on the way, as the viewer does on expand. */
  function resolveByKeys(builder: JsonSchemaTreeBuilder, keys: string[]): JsonSchemaTreeNode {
    let current = builder.tree.root!
    for (const key of keys) {
      builder.materializeChildren(current)
      const next = current.childrenNodes().find(node => String(node.key) === key)
      if (!next) {
        throw new Error(`no ${key} under ${current.id}`)
      }
      current = next
    }
    return current
  }

  // The nested viewer's tree starts from the schema of the media type node value. When that value
  // held a copy of the schema, the original never reached the cycle guard's ancestors, and a `$ref`
  // back to it was detected one level late.
  it.each([
    ['lazy', { materializeDepth: 2 }],
    ['eager', {}],
  ] as const)('a `$ref` back to the body schema is a cycle on the first level, required where its parent lists it (%s)', (_mode, params) => {
    const document = loadNormalizedOpenApiSample(CASE_ID) as any
    const root = new OpenApiTreeBuilder({ source: document, operationKeys: OPERATION }).build().root!
    const body = plainChild(plainChild(root, OpenApiTreeNodeKinds.REQUEST), OpenApiTreeNodeKinds.REQUEST_BODY)
    const mediaType = plainChild(plainChild(body, OpenApiTreeNodeKinds.CONTENT), OpenApiTreeNodeKinds.MEDIA_TYPE)
    expect(OpenApiMediaTypeSchema.take(mediaType)).toBe(document.paths['/orders'].post.requestBody.content['application/json'].schema)

    const builder = new JsonSchemaTreeBuilder({ source: OpenApiMediaTypeSchema.wrap(mediaType), ...params })
    builder.build()
    expect(resolveByKeys(builder, [TITLE]).isCycle).toBe(false)
    expect(resolveByKeys(builder, [TITLE, 'parent']).isCycle).toBe(true)
    expect(resolveByKeys(builder, [TITLE, 'parent']).meta().required).toBe(true)
    expect(resolveByKeys(builder, [TITLE, 'children']).isCycle).toBe(false)
    expect(resolveByKeys(builder, [TITLE, 'children', 'items']).isCycle).toBe(true)
  })
})
