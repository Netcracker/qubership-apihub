import { JSONSchema4 } from 'json-schema'

import { annotation, apiDiff, breaking, deprecated, nonBreaking } from '@netcracker/qubership-apihub-api-diff'
import { createJsonSchemaDiffTree } from '../src'
import { ORIGINS_FLAG, SYNTHETIC_TITLE_FLAG } from '../src/abstract/constants'

const metaKey = Symbol('diff')

export const createJsonSchemaDiffTreeForTest = (before: unknown, after: unknown, metaKey: symbol, beforeSource: unknown = before, afterSource: unknown = after) => {
  const merged = apiDiff(before, after, {
    beforeSource,
    afterSource,
    syntheticTitleFlag: SYNTHETIC_TITLE_FLAG,
    originsFlag: ORIGINS_FLAG,
    metaKey,
    liftCombiners: true,
    unify: true,
    allowNotValidSyntheticChanges: true,
  }).merged

  return createJsonSchemaDiffTree(merged, metaKey)
}

describe('jsonschema diff tree tests', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })

  describe('simple schema', () => {
    it('should create diff tree from simple jsonSchema', () => {
      const before: JSONSchema4 = {
        title: 'test',
        type: 'string',
        enum: ['a', 'b', 'c'],
        examples: ['a'],
      }

      const after: JSONSchema4 = {
        title: 'test1',
        type: 'string',
        enum: ['a', 'b', 'c', 'd'],
        examples: ['a2'],
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      expect(tree.root?.value()?.$changes).toMatchObject({
        title: { action: 'replace' },
        enum: { 3: { action: 'add' } },
        examples: { 0: { action: 'replace' } },
      })
      const changes = tree.root?.meta.$nodeChangesSummary
      expect(changes).toEqual(new Set([annotation, nonBreaking]))
    })

    it('should create tree from simple jsonSchema with meta', () => {
      const before: JSONSchema4 = {
        title: 'test',
        type: 'string',
        description: 'test description',
        readOnly: true,
      }

      const after: JSONSchema4 = {
        title: 'test',
        type: 'string',
        description: 'test description1',
        deprecated: true,
        readOnly: true,
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      expect(tree.root?.meta?.$metaChanges).toMatchObject({
        deprecated: { action: 'replace' },
      })
      expect(tree.root?.value()?.$changes).toMatchObject({
        description: { action: 'replace' },
      })

      const changes = tree.root?.meta.$nodeChangesSummary
      expect(changes).toEqual(new Set([annotation, deprecated]))
    })

    it('should create diff tree from object jsonSchema', () => {
      const before: JSONSchema4 = {
        title: 'test',
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          param: {
            oneOf: [
              { type: 'string' },
              { type: 'number' },
            ],
          },
        },
      }

      const after: JSONSchema4 = {
        title: 'test',
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          test: { type: 'string' },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      expect(tree.root?.value()?.$changes).toMatchObject({
        required: { 1: { action: 'add' } },
      })

      const children = tree.root?.children()
      expect(children).toMatchObject([
        {
          id: '#/properties/id',
          kind: 'property',
          key: 'id',
          meta: { required: true },
          type: 'simple',
          parent: tree.root,
        },
        {
          id: '#/properties/name',
          kind: 'property',
          key: 'name',
          meta: { required: true },
          type: 'simple',
          parent: tree.root,
        },
        {
          id: '#/properties/param',
          kind: 'property',
          key: 'param',
          meta: { required: false },
          type: 'oneOf',
          parent: tree.root,
        },
        {
          id: '#/properties/test',
          kind: 'property',
          key: 'test',
          meta: { required: false },
          type: 'simple',
          parent: tree.root,
        },
      ])
      expect(children?.[0].value()?.$changes).toMatchObject({ type: { action: 'replace' } })
      expect(children?.[1].meta?.$metaChanges).toMatchObject({ required: { action: 'add' } })
      expect(children?.[2].meta?.$nodeChange).toMatchObject({ action: 'remove' })
      expect(children?.[3].meta?.$nodeChange).toMatchObject({ action: 'add' })

      const changes = tree.root?.meta.$nodeChangesSummary
      expect(changes).toEqual(new Set([breaking, nonBreaking]))
    })

    it('should create diff tree from jsonSchema with oneOf object', () => {
      const before: JSONSchema4 = {
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'number',
              },
              name: {
                type: 'string',
              },
            },
          },
        ],
      }

      const after: JSONSchema4 = {
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'number',
          },
          {
            type: 'object',
            required: ['name', 'id'],
            properties: {
              id: {
                type: 'number',
              },
              name: {
                type: 'string',
              },
            },
          },
        ],
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root).toMatchObject({ id: '#', kind: 'root', type: 'oneOf', parent: null })

      expect(tree.root?.meta).toMatchObject({ $nestedChanges: { '#/oneOf/1': { action: 'add' } } })
      expect(tree.root?.nested[1].meta).toMatchObject({ $nodeChange: { action: 'add' } })

      expect(tree.root?.children('#/oneOf/2')[1].meta).toMatchObject({ $metaChanges: { required: { action: 'add' } } })
    })

    it('should create diff tree from jsonSchema with added object', () => {
      const before: JSONSchema4 = {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'number',
          },
        },
      }

      const after: JSONSchema4 = {
        type: 'object',
        required: ['name', 'id'],
        properties: {
          id: {
            type: 'number',
          },
          name: {
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root).toMatchObject({ id: '#', kind: 'root', type: 'simple', parent: null })

      expect(tree.root?.children()[1].meta).toMatchObject({ $nodeChange: { action: 'add', depth: 1 } })
      expect(tree.root?.children()[1].children()[0].meta).toMatchObject({ $nodeChange: { action: 'add', depth: 1 } })
    })

    it('should create diff tree from jsonSchema with nested oneOf object', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        required: ['id'],
        oneOf: [
          {
            oneOf: [
              {
                title: 'opt1',
                properties: {
                  id: {
                    type: 'string',
                  },
                  name: {
                    type: 'string',
                  },
                },
              },
              {
                title: 'opt2',
                properties: {
                  id: {
                    type: 'string',
                  },
                  test: {
                    type: 'string',
                  },
                },
              },
            ],
          },
          {
            title: 'opt3',
            properties: {
              id: {
                type: 'number',
              },
              name: {
                type: 'string',
              },
            },
          },
        ],
      }

      const tree = createJsonSchemaDiffTreeForTest(schema, schema, metaKey)

      expect(tree.root).toMatchObject({ id: '#', kind: 'root', type: 'oneOf', parent: null })

      expect(tree.root?.value()).toMatchObject({ title: 'opt1' })
      expect(tree.root?.value('#/oneOf/0')).toMatchObject({ title: 'opt1' })
      expect(tree.root?.value('#/oneOf/0/oneOf/0')).toMatchObject({ title: 'opt1' })
      expect(tree.root?.value('#/oneOf/0/oneOf/1')).toMatchObject({ title: 'opt2' })
      expect(tree.root?.value('#/oneOf/1')).toMatchObject({ title: 'opt3' })
    })

    it('should create diff tree from jsonSchema with additionalProperties', () => {
      const before: JSONSchema4 = {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
        },
        additionalProperties: false,
      }

      const after: JSONSchema4 = {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
        },
        additionalProperties: {
          type: 'number',
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root?.children()[1].value()).toMatchObject({
        $changes: {
          type: {
            beforeValue: 'nothing',
            afterValue: 'number',
            action: 'replace',
            type: nonBreaking,
          },
        },
      })
    })

    it('should create tree from jsonSchema with patternProperties', () => {
      const before: JSONSchema4 = {
        type: 'object',
      }
      const after: JSONSchema4 = {
        type: 'object',
        patternProperties: {
          '^[a-z0-9]+$': {
            type: 'number',
          },
          '^[0-9]+$': {
            type: 'string',
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root?.meta).toMatchObject({
        $childrenChanges: {
          '#/patternProperties/%5E%5B0-9%5D%2B%24': { action: 'add' },
          '#/patternProperties/%5E%5Ba-z0-9%5D%2B%24': { action: 'add' },
        },
      })

      expect(tree.root?.children()[0].meta).toMatchObject({ $nodeChange: { action: 'add' } })
      expect(tree.root?.children()[1].meta).toMatchObject({ $nodeChange: { action: 'add' } })
    })

    it('should create tree from jsonSchema with patternProperties', () => {
      const before: JSONSchema4 = {
        type: 'object',
        patternProperties: {
          '^[a-z0-9]+$': {
            type: 'string',
          },
        },
      }
      const after: JSONSchema4 = {
        type: 'object',
        patternProperties: {
          '^[a-z0-9]+$': {
            type: 'number',
          },
          '^[0-9]+$': {
            type: 'string',
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root?.meta).toMatchObject({
        $childrenChanges: {
          '#/patternProperties/%5E%5B0-9%5D%2B%24': { action: 'add' },
        },
      })

      expect(tree.root?.children()[0].value()).toMatchObject({ $changes: { type: { action: 'replace' } } })
    })

    it('additionalProperties = false => node.value() = false', () => {
      const beforeSchema = {
        type: 'object',
        properties: {
          prop1: { type: 'string' },
          prop2: { type: 'string' },
        },
        additionalProperties: false,
      }
      const afterSchema = {
        type: 'object',
        properties: {
          prop1: { type: 'string' },
          prop2: { type: 'string' },
        },
        additionalProperties: false,
      }
      const tree = createJsonSchemaDiffTreeForTest(beforeSchema, afterSchema, metaKey)

      expect(tree.root).toBeTruthy()
      expect(tree.root!.children()[2]?.id).toBe('#/additionalProperties')
      expect(tree.root!.children()[2]?.value()).toBe(false)
    })
  })

  describe('schema with array', () => {
    it('should create diff tree from simple jsonSchema (array type change)', () => {
      const before: JSONSchema4 = {
        type: 'array',
        items: {
          type: 'string',
        },
      }

      const after: JSONSchema4 = {
        type: 'array',
        items: {
          type: 'number',
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root?.children()[0].value()).toMatchObject({ $changes: { type: { action: 'replace' } } })
    })

    it('should create diff tree from simple jsonSchema (type change to array)', () => {
      const before: JSONSchema4 = {
        type: 'number',
      }

      const after: JSONSchema4 = {
        type: 'array',
        items: {
          type: 'number',
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root?.value()).toMatchObject({ $changes: { type: { action: 'replace' } } })
      expect(tree.root?.children()[0].meta).toMatchObject({ $nodeChange: { action: 'add' } })
    })

    it('should create tree from jsonSchema with array items. case 1', () => {
      const before: any = {
        type: 'array',
        items: [
          {
            type: 'string',
          },
          {
            type: 'boolean',
          },
        ],
      }
      const after: any = {
        type: 'array',
        items: [
          {
            type: 'boolean',
          },
        ],
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root?.children()[1].meta).toMatchObject({ $nodeChange: { action: 'remove' } })
    })

    it('should create tree from jsonSchema with array items. case 2', () => {
      const before: any = {
        type: 'array',
        items: [
          {
            type: 'string',
          },
          {
            type: 'boolean',
          },
        ],
      }
      const after: any = {
        type: 'array',
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)
      expect(tree.root?.meta).toMatchObject({
        $childrenChanges: {
          '#/items/0': { action: 'remove' },
          '#/items/1': { action: 'remove' },
        },
      })

      expect(tree.root?.children()[0].meta).toMatchObject({ $nodeChange: { action: 'remove' } })
      expect(tree.root?.children()[1].meta).toMatchObject({ $nodeChange: { action: 'remove' } })
    })

    it.skip('should create diff tree from jsonSchema with array items change', () => {
      const before: any = {
        type: 'array',
        items: [
          {
            type: 'string',
          },
          {
            type: 'boolean',
          },
        ],
      }
      const after: any = {
        type: 'array',
        items: {
          type: 'string',
        },
      }

      // TODO: api-smart-diff fix needed - expected result:
      const expectedMerged = {
        type: 'array',
        items: [
          {
            type: 'string',
          },
          {
            type: 'boolean',
          },
        ],
        additionalItems: {
          type: 'string',
        },
        $diff: {
          items: {
            1: {
              action: 'remove',
            },
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

      expect(tree.root?.meta).toMatchObject({
        $childrenChanges: {
          '#/items/1': { action: 'remove' },
        },
      })

      expect(tree.root?.children()[1].meta).toMatchObject({ $nodeChange: { action: 'remove' } })
    })
  })

  describe('schema with references', () => {
    it('should create diff tree for jsonSchema with refs', () => {
      const before: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { $ref: '#/defs/id' },
        },
        defs: {
          id: {
            title: 'id',
            type: 'string',
          },
          name: {
            title: 'name',
            type: 'string',
          },
        },
      }

      const after: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { $ref: '#/defs/id' },
          name: { $ref: '#/defs/name' },
        },
        defs: {
          id: {
            title: 'id',
            type: 'number',
          },
          name: {
            title: 'name',
            type: 'string',
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)
      expect(tree.root?.meta).toMatchObject({ $childrenChanges: { '#/properties/name': { action: 'add' } } })
      expect(tree.root?.children()[0].value()).toMatchObject({ $changes: { type: { action: 'replace' } } })
      expect(tree.root?.children()[1].meta).toMatchObject({ $nodeChange: { action: 'add' } })
    })

    it('should create diff tree for jsonSchema with refs change', () => {
      const before: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { $ref: '#/defs/id' },
          name: {
            type: 'string',
          },
        },
        defs: {
          id: {
            title: 'id',
            type: 'string',
          },
        },
      }

      const after: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { $ref: '#/defs/id' },
          name: { $ref: '#/defs/name' },
        },
        defs: {
          id: {
            title: 'id',
            type: 'number',
          },
          name: {
            title: 'name',
            type: 'string',
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)
      expect(tree.root?.children()[0].value()).toMatchObject({ $changes: { type: { action: 'replace' } } })
      expect(tree.root?.children()[1].value()).toMatchObject({ $changes: { title: { action: 'add' } } })
    })

    it('should create diff tree for jsonSchema with cycle refs', () => {
      const before: JSONSchema4 = {
        type: 'object',
        properties: {
          model: { $ref: '#/defs/model' },
        },
        defs: {
          id: {
            title: 'id',
            type: 'string',
          },
          model: {
            type: 'object',
            properties: {
              id: {
                $ref: '#/defs/id',
              },
              parent: {
                $ref: '#/defs/model',
              },
            },
          },
        },
      }

      const after: JSONSchema4 = {
        type: 'object',
        properties: {
          model: { $ref: '#/defs/model' },
        },
        defs: {
          id: {
            title: 'id',
            type: 'string',
          },
          model: {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                $ref: '#/defs/id',
              },
            },
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)
      expect(tree.root?.children()[0].meta).toMatchObject({ $childrenChanges: { '#/properties/model/properties/parent': { action: 'remove' } } })
      expect(tree.root?.children()[0].value()).toMatchObject({ $changes: { required: { 0: { action: 'add' } } } })
      expect(tree.root?.children()[0].children()[0].meta).toMatchObject({ $metaChanges: { required: { action: 'add' } } })
      expect(tree.root?.children()[0].children()[1].meta).toMatchObject({ $nodeChange: { action: 'remove' } })
    })
  })

  describe('schema with broken reference', () => {
    it('should create tree for jsonSchema with broken refs', () => {
      const before: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      }

      const after: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { $ref: '#/defs/id' },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)
      expect(tree.root?.children()[0].value()).toMatchObject({ type: 'string' })
      expect(tree.root?.children()[0].meta).toMatchObject({ brokenRef: '#/defs/id' })
    })
  })

  describe('schema with complex circular references', () => {

    it('should NOT fail with "Maximum Call Stack Exceeded" on calculating $nodeChangesSummary()', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        title: 'Root',
        description: 'Root',
        properties: {
          root: {
            $ref: '#/components/A',
          },
        },
      }
      const source = {
        components: {
          A: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'A',
              },
              values_A: {
                type: 'array',
                items: {
                  $ref: '#/components/B',
                },
              },
            },
          },
          B: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'B',
              },
              values_B: {
                type: 'array',
                items: {
                  $ref: '#/components/A',
                },
              },
            },
          },
        },
      }

      const diffTree = createJsonSchemaDiffTreeForTest(schema, schema, metaKey, source, source)
      const root = diffTree.root
      const rootMeta = root?.meta
      const rootChangesSummary = rootMeta?.$nodeChangesSummary

      expect(rootChangesSummary).toBeDefined()
    })

  })

  describe('$nodeChangesSummary', () => {
    it('given oneOf[1, oneOf[2, 3]], when children of 3 are changed, then oneOf[2, 3].$nodeChangesSummary should report of them in summary', () => {
      const before = {
        oneOf: [
          { type: 'string' },
          {
            oneOf: [
              { type: 'number' },
              {
                type: 'object',
                properties: {
                  prop1: { type: 'string' },
                  prop2: { type: 'boolean' },
                },
              },
            ],
          },
        ],
      }
      const after = {
        oneOf: [
          { type: 'string' },
          {
            oneOf: [
              { type: 'number' },
              {
                type: 'object',
                properties: {
                  prop2: { type: 'boolean' },
                },
              },
            ],
          },
        ],
      }
      const beforeSource = {
        openapi: '3.0.2',
        paths: {
          '/test': {
            post: {
              summary: 'Test',
              requestBody: {
                content: {
                  'application/json': {
                    schema: before,
                  },
                },
              },
            },
          },
        },
      }
      const afterSource = {
        openapi: '3.0.2',
        paths: {
          '/test': {
            post: {
              summary: 'Test',
              requestBody: {
                content: {
                  'application/json': {
                    schema: after,
                  },
                },
              },
            },
          },
        },
      }

      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey, beforeSource, afterSource)
      expect(tree.root).toBeTruthy()
      const changesSummary = tree.root!.nested[1]?.meta?.$nodeChangesSummary
      // "non-breaking" because removed 1 prop from request body
      // the only change because nothing else changed
      expect(changesSummary).toEqual(new Set([breaking]))
    })
  })

  describe('schema with changed type', () => {
    it('should contains fields of both types when primitive A changed to primitive B', () => {
      const before = {
        type: 'integer',
        description: 'Integer type',
        minimum: 5,
        exclusiveMinimum: true,
        multipleOf: 5,
      }
      const after = {
        type: 'string',
        description: 'String type',
        minLength: 1,
        maxLength: 150,
        pattern: '^a-zA-Z$'
      }
      const beforeSource = {
        openapi: '3.0.0',
        paths: {
          '/test': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: before
                  }
                }
              }
            }
          }
        }
      }
      const afterSource = {
        openapi: '3.0.0',
        paths: {
          '/test': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: after
                  }
                }
              }
            }
          }
        }
      }
      const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey, beforeSource, afterSource)
      expect(tree.root).toBeTruthy()
      expect(tree.root!.value()).toMatchObject({
        type: 'string',
        description: 'String type',
        minLength: 1,
        maxLength: 150,
        pattern: '^a-zA-Z$',
        minimum: 5,
        exclusiveMinimum: true,
        multipleOf: 5,
        $changes: {
          type: {
            type: 'breaking',
            action: 'replace',
            beforeValue: 'integer',
            afterValue: 'string',
          },
          description: {
            type: 'annotation',
            action: 'replace',
            beforeValue: 'Integer type',
            afterValue: 'String type',
          },
          minLength: {
            type: 'breaking',
            action: 'add',
            afterValue: 1,
          },
          maxLength: {
            type: 'breaking',
            action: 'add',
            afterValue: 150,
          },
          pattern: {
            type: 'breaking',
            action: 'add',
            afterValue: '^a-zA-Z$',
          },
          minimum: {
            type: 'non-breaking',
            action: 'remove',
            beforeValue: 5,
          },
          exclusiveMinimum: {
            type: 'non-breaking',
            action: 'remove',
            beforeValue: true,
          },
          multipleOf: {
            type: 'non-breaking',
            action: 'remove',
            beforeValue: 5,
          },
        }
      })
    })
  })

  it('each parent nodes should have all the changes of their child nodes', () => {
    const before: JSONSchema4 = {
      type: 'object',
      properties: {
        head: {
          type: 'object',
          properties: {
            eye: {
              type: 'object',
            },
          },
        },
        weapon: {
          type: 'object',
          properties: {
            caliber: {
              type: 'number',
            },
            ammunition: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
      },
    }

    const after: JSONSchema4 = {
      type: 'object',
      properties: {
        head: {
          type: 'object',
          properties: {
            eye: {
              type: 'object',
              description: 'red eye',
            },
          },
        },
        weapon: {
          type: 'object',
          properties: {
            caliber: {
              type: 'string',
            },
            ammunition: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            length: {
              type: 'number',
            },
          },
        },
      },
    }

    const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

    expect(tree.root!.meta?.$nodeChangesSummary).toEqual(new Set([breaking, nonBreaking, annotation]))
    expect(tree.root!.children()[0].meta?.$nodeChangesSummary).toEqual(new Set([annotation]))
    expect(tree.root!.children()[0].children()[0].meta?.$nodeChangesSummary).toEqual(new Set([annotation]))
    expect(tree.root!.children()[1].meta?.$nodeChangesSummary).toEqual(new Set([breaking, nonBreaking]))
    expect(tree.root!.children()[1].children()[0].meta?.$nodeChangesSummary).toEqual(new Set([breaking]))
  })

  it('breaking in additionalProperties should be at the root node', () => {
    const before: JSONSchema4 = {
      type: 'object',
      properties: {
        prop: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
    }

    const after: JSONSchema4 = {
      type: 'object',
      properties: {
        prop: {
          type: 'object',
          additionalProperties: {
            type: 'number',
          },
        },
      },
    }

    const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

    expect(tree.root!.meta?.$nodeChangesSummary).toEqual(new Set([breaking]))
  })

  it('breaking in required should be at the root node', () => {
    const before: JSONSchema4 = {
      title: 'test',
      type: 'object',
      properties: {
        id: { type: 'number' },
        object: {
          type: 'object',
          required: ['prop1'],
          properties: {
            prop1: {
              type: 'string',
            },
          },
        },
      },
    }

    const after: JSONSchema4 = {
      title: 'test',
      type: 'object',
      properties: {
        id: { type: 'number' },
        object: {
          type: 'object',
          required: ['prop1', 'prop2'],
          properties: {
            prop1: {
              type: 'string',
            },
            prop2: {
              type: 'number',
            },
          },
        },
      },
    }

    const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

    expect(tree.root!.meta?.$nodeChangesSummary).toEqual(new Set([breaking]))
  })

  it('breaking in items should be at the root node', () => {
    const before: JSONSchema4 = {
      id: 'robot',
      type: 'object',
      properties: {
        weapon: {
          type: 'object',
          properties: {
            ammunition: {
              type: 'array',
              items: {
                type: 'number',
              },
            },
          },
        },
      },
    }

    const after: JSONSchema4 = {
      id: 'robot',
      type: 'object',
      properties: {
        weapon: {
          type: 'object',
          properties: {
            ammunition: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
      },
    }

    const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

    expect(tree.root!.meta?.$nodeChangesSummary).toEqual(new Set([breaking]))
  })

  it('deprecated in property should be at the root node', () => {
    const before: JSONSchema4 = {
      id: 'robot',
      type: 'object',
      properties: {
        weapon: {
          type: 'object',
          properties: {
            ammunition: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
      },
    }

    const after: JSONSchema4 = {
      id: 'robot',
      type: 'object',
      properties: {
        weapon: {
          type: 'object',
          properties: {
            ammunition: {
              type: 'array',
              items: {
                type: 'object',
              },
              deprecated: true,
            },
          },
        },
      },
    }

    const tree = createJsonSchemaDiffTreeForTest(before, after, metaKey)

    expect(tree.root!.meta?.$nodeChangesSummary).toEqual(new Set([deprecated]))
  })
})
