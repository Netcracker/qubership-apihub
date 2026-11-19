import { OpenApiTreeWithDiffsBuilder } from '../../src/building-service/openapi/tree-with-diffs/builder'
import { JsonSchemaTreeWithDiffsBuilder } from '../../src/building-service/json-schema/tree-with-diffs/builder'
import { isJsonSchemaNodeChanged } from '../../src/building-service/json-schema/tree-with-diffs/changed-only'
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from '../../src/model/abstract/layout-side'
import { NodeDiffsSeverityPlacemennt } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { JsonSchemaRowDiffs } from '../../src/model/json-schema/tree-with-diffs/property-row-diffs'
import { JsonSchemaTreeNodeWithDiffs } from '../../src/model/json-schema/types/aliases'
import { OpenApiTreeNodeKinds } from '../../src/model/openapi/types/node-kind'
import { isJsonSchemaTreeNodeWithDiffs } from '../../src/shared/json-schema/guards/tree-node'
import { isObject } from '../../src/utilities'
import { mergeOpenApiDocuments, OPENAPI_TEST_DIFF_META_KEYS } from '../helpers/openapi-fixtures'

/**
 * `example` (OAS 3.0 Schema Object keyword) is shown as the single item of the Examples row
 * (`transformExample`), so its diff must drive that row: before the fix the merged value was shown
 * on both sides without highlight, while the node still counted as changed for hiding unchanged
 * nodes (issue: unchanged-looking query / header parameters were not hidden).
 */

const OAS_30 = '3.0.2'
const OAS_31 = '3.1.0'
const PATH = '/items'

type Schema = Record<string, unknown>

function document(openapi: string, querySchema: Schema): unknown {
  return {
    openapi,
    info: { title: 'Example keyword', version: '1.0.0' },
    paths: {
      [PATH]: {
        get: {
          parameters: [{ in: 'query', name: 'filter', schema: querySchema }],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  }
}

/** The `filter` property node of the synthesized query-parameters schema. */
function queryPropertyNode(before: unknown, after: unknown): JsonSchemaTreeNodeWithDiffs {
  const tree = new OpenApiTreeWithDiffsBuilder({
    source: mergeOpenApiDocuments(before, after),
    operationKeys: { path: PATH, method: 'get' },
    diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
  }).build()
  const request = tree.root?.childrenNodes().find(node => node.kind === OpenApiTreeNodeKinds.REQUEST)
  const group = request?.childrenNodes().find(node => node.kind === OpenApiTreeNodeKinds.PARAMETERS)
  const groupValue = group?.value()
  const schema = isObject(groupValue) ? groupValue.schema : undefined
  const schemaTree = new JsonSchemaTreeWithDiffsBuilder({
    source: schema,
    diffsMetaKeys: OPENAPI_TEST_DIFF_META_KEYS,
    materializeDepth: Number.MAX_SAFE_INTEGER,
  }).build()
  const property = schemaTree.root?.childrenNodes().find(node => node.key === 'filter')
  if (!property || !isJsonSchemaTreeNodeWithDiffs(property)) {
    throw new Error('no query property "filter"')
  }
  return property
}

function sideTexts(node: JsonSchemaTreeNodeWithDiffs, side: LayoutSide): string[] {
  const value = node.value()
  const mergedValues = isObject(value) && Array.isArray(value.examples) ? value.examples : []
  return JsonSchemaRowDiffs.Examples.resolveSideEntries(
    mergedValues,
    JsonSchemaRowDiffs.Examples.takeDiff(node),
    JsonSchemaRowDiffs.Examples.takeValueDiffs(node),
    side,
  ).map(entry => entry.text)
}

const text = (value: unknown): string => JsonSchemaRowDiffs.Format.formatListDisplayValue(value)

describe('JSON Schema `example` keyword diffs drive the Examples row', () => {
  it('unchanged example: no row diff, node unchanged', () => {
    const schema = { type: 'string', example: 'a' }
    const node = queryPropertyNode(document(OAS_30, schema), document(OAS_30, schema))

    expect(JsonSchemaRowDiffs.Examples.takeDiff(node)).toBeUndefined()
    expect(JsonSchemaRowDiffs.Examples.takeValueDiffs(node)).toBeUndefined()
    expect(isJsonSchemaNodeChanged(node)).toBe(false)
    expect(sideTexts(node, ORIGIN_LAYOUT_SIDE)).toEqual([text('a')])
    expect(sideTexts(node, CHANGED_LAYOUT_SIDE)).toEqual([text('a')])
  })

  it('added example: whole-row add, shown on the changed side only', () => {
    const node = queryPropertyNode(
      document(OAS_30, { type: 'string' }),
      document(OAS_30, { type: 'string', example: 'b' }),
    )

    expect(JsonSchemaRowDiffs.Examples.takeDiff(node)?.data.action).toBe('add')
    expect(JsonSchemaRowDiffs.Examples.takeRowColorizingDiff(node)?.data.action).toBe('add')
    expect(node.diffsSeverities[NodeDiffsSeverityPlacemennt.ExamplesRow]).toBeDefined()
    expect(sideTexts(node, ORIGIN_LAYOUT_SIDE)).toEqual([])
    expect(sideTexts(node, CHANGED_LAYOUT_SIDE)).toEqual([text('b')])
  })

  it('removed example: whole-row remove, shown on the origin side only', () => {
    const node = queryPropertyNode(
      document(OAS_30, { type: 'string', example: 'a' }),
      document(OAS_30, { type: 'string' }),
    )

    expect(JsonSchemaRowDiffs.Examples.takeDiff(node)?.data.action).toBe('remove')
    expect(JsonSchemaRowDiffs.Examples.takeRowColorizingDiff(node)?.data.action).toBe('remove')
    expect(node.diffsSeverities[NodeDiffsSeverityPlacemennt.ExamplesRow]).toBeDefined()
    expect(sideTexts(node, ORIGIN_LAYOUT_SIDE)).toEqual([text('a')])
    expect(sideTexts(node, CHANGED_LAYOUT_SIDE)).toEqual([])
  })

  it('replaced example: yellow row, before value on origin, after value on changed', () => {
    const node = queryPropertyNode(
      document(OAS_30, { type: 'string', example: 'a' }),
      document(OAS_30, { type: 'string', example: 'b' }),
    )

    expect(JsonSchemaRowDiffs.Examples.takeDiff(node)).toBeUndefined()
    expect(JsonSchemaRowDiffs.Examples.takeValueDiffs(node)?.['0']?.data.action).toBe('replace')
    expect(JsonSchemaRowDiffs.Examples.takeRowColorizingDiff(node)?.data.action).toBe('replace')
    expect(node.diffsSeverities[NodeDiffsSeverityPlacemennt.ExamplesRow]).toBeDefined()
    expect(sideTexts(node, ORIGIN_LAYOUT_SIDE)).toEqual([text('a')])
    expect(sideTexts(node, CHANGED_LAYOUT_SIDE)).toEqual([text('b')])
  })

  it('OAS 3.1 -> 3.0: the 3.1 side loses schema `example` in api-unifier, so the example is added', () => {
    const schema = { type: 'string', example: 'b' }
    const node = queryPropertyNode(document(OAS_31, schema), document(OAS_30, schema))

    expect(JsonSchemaRowDiffs.Examples.takeDiff(node)?.data.action).toBe('add')
    expect(isJsonSchemaNodeChanged(node)).toBe(true)
    expect(sideTexts(node, ORIGIN_LAYOUT_SIDE)).toEqual([])
    expect(sideTexts(node, CHANGED_LAYOUT_SIDE)).toEqual([text('b')])
  })

  it('own `examples` win: an `example` change does not touch the Examples row', () => {
    const node = queryPropertyNode(
      document(OAS_30, { type: 'string', examples: ['x'], example: 'a' }),
      document(OAS_30, { type: 'string', examples: ['x'], example: 'b' }),
    )

    expect(JsonSchemaRowDiffs.Examples.takeDiff(node)).toBeUndefined()
    expect(JsonSchemaRowDiffs.Examples.takeValueDiffs(node)).toBeUndefined()
  })
})
