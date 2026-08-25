import { denormalize, normalize, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { JSONSchema4 } from 'json-schema'

import { createJsonSchemaTree, JsonSchemaTreeNode } from '../src'
import { TEST_SYNTHETIC_TITLE_FLAG } from './helpers/utils'

// the same options as the viewer host applications use
const NORMALIZE_OPTIONS: NormalizeOptions = {
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  unify: true,
  validate: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}

const cycledDocument = (extensions: Record<string, unknown> = {}): JSONSchema4 => ({
  openapi: '3.0.1',
  info: { title: 'test', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Node: {
        title: 'Node',
        type: 'object',
        ...extensions,
        properties: {
          id: { type: 'string' },
          child: { $ref: '#/components/schemas/Node' },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/Node' },
          },
        },
      },
    },
  },
} as JSONSchema4)

const createTree = (extensions?: Record<string, unknown>, maxTreeLevel?: number) => {
  const document = cycledDocument(extensions)
  const normalized = normalize(document, { ...NORMALIZE_OPTIONS, source: document })
  const merged = denormalize(normalized, NORMALIZE_OPTIONS) as any
  return createJsonSchemaTree(merged.components.schemas.Node, maxTreeLevel)
}

const childOf = (node: JsonSchemaTreeNode, key: string): JsonSchemaTreeNode =>
  node.expand().children().find(child => child.key === key)! as JsonSchemaTreeNode

const DEEP_TREE_LEVEL = 12
// the cycled schema is unrolled once and then stopped by cycled nodes
const EXPECTED_NODES_COUNT = 12

const countNodes = (node: JsonSchemaTreeNode): number =>
  node.children().reduce(
    (count, child) => count + (child.isCycle ? 1 : countNodes(child as JsonSchemaTreeNode)),
    1
  )

describe('cycled json schema', () => {
  it('should mark self referencing property as cycled', () => {
    const root = createTree().root as JsonSchemaTreeNode
    const child = childOf(root, 'child')

    expect(child.isCycle).toBe(false)
    expect(childOf(child, 'child').isCycle).toBe(true)
    expect(childOf(childOf(child, 'children'), 'items').isCycle).toBe(true)
  })

  // Regression: transformers may replace the crawled value with a copy (extensions are
  // cherry-picked into "extensions" keyword), which used to break identity based cycle detection
  it('should mark self referencing property as cycled when schema has extensions', () => {
    const root = createTree({ 'x-v-entity': 'Node' }).root as JsonSchemaTreeNode
    const child = childOf(root, 'child')

    expect(child.isCycle).toBe(false)
    expect(childOf(child, 'child').isCycle).toBe(true)
    expect(childOf(childOf(child, 'children'), 'items').isCycle).toBe(true)
  })

  it('should not unroll cycled schema with extensions into a deep tree', () => {
    const tree = createTree({ 'x-v-entity': 'Node' }, DEEP_TREE_LEVEL)

    // cycled nodes stop the crawl, so the schema is not unrolled level by level
    expect(countNodes(tree.root as JsonSchemaTreeNode)).toBe(EXPECTED_NODES_COUNT)
  })
})
