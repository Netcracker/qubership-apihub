import { JSONSchema4 } from 'json-schema'

import { JsonSchemaModelTree } from '../src'
import { createJsonSchemaTreeForTests } from './helpers/json-schema'

describe('jsonschema transformation tests', () => {
  describe('simple schema', () => {
    it('should create tree from simple jsonSchema', () => {
      const schema: JSONSchema4 = {
        title: 'test',
        type: 'string',
        enum: ['a', 'b', 'c'],
        examples: ['a'],
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      const { example, ...rest } = schema
      expect(tree.root?.meta).toMatchObject({ _fragment: { ...rest, examples: ['a'] } })
    })

    it('should create tree from simple jsonSchema with meta', () => {
      const schema: JSONSchema4 = {
        title: 'test',
        type: 'string',
        description: 'test description',
        deprecated: true,
        readOnly: true,
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      expect(tree.root?.meta).toMatchObject({ deprecated: true, readOnly: true })
    })

    it('should create tree from simple number jsonSchema with validations', () => {
      const schema: JSONSchema4 = {
        title: 'Amount',
        type: 'number',
        minimum: 50,
        maximum: 1000,
        default: 100,
        multipleOf: 50,
        format: 'float',
        description: 'Money Amount',
        exclusiveMaximum: true,
      }

      const tree = createJsonSchemaTreeForTests(schema)

      const { exclusiveMaximum, ...rest } = schema

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      expect(tree.root?.meta).toMatchObject({ _fragment: { ...rest } })
    })

    it('should create tree from object jsonSchema', () => {
      const schema: JSONSchema4 = {
        title: 'test',
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', kind: 'root', type: 'simple', parent: null })
      expect(tree.root?.meta).toMatchObject({ _fragment: schema })

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
          meta: { required: false },
          type: 'simple',
          parent: tree.root,
        },
      ])
      expect(children?.[0].meta).toMatchObject({ _fragment: schema.properties!.id })
      expect(children?.[1].meta).toMatchObject({ _fragment: schema.properties!.name })
    })

    it('should create tree from jsonSchema with oneOf obejct', () => {
      const common: JSONSchema4 = {
        title: 'test',
        type: 'object',
      }
      const schema: JSONSchema4 = {
        ...common,
        oneOf: [
          {
            title: 'option1',
            required: ['id'],
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
            title: 'option2',
            required: ['name'],
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

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', kind: 'root', type: 'oneOf', parent: null })

      expect(tree.root?.value()).toMatchObject({ type: 'object' })
      expect(tree.root?.nestedNode('#/oneOf/0')!.meta).toMatchObject({ _fragment: { ...common, ...schema.oneOf![0] } })
      expect(tree.root?.nestedNode('#/oneOf/1')!.meta).toMatchObject({ _fragment: { ...common, ...schema.oneOf![1] } })

      const n0 = tree.root?.nested[0].children()
      expect(n0?.[0]).toMatchObject({ key: 'id', meta: { required: true } })
      expect(n0?.[1]).toMatchObject({ key: 'name', meta: { required: false } })
      const n1 = tree.root?.nested[1].children()
      expect(n1?.[0]).toMatchObject({ key: 'id', meta: { required: false } })
      expect(n1?.[1]).toMatchObject({ key: 'name', meta: { required: true } })
    })

    it('should create tree from jsonSchema with nested oneOf obejct', () => {
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

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', kind: 'root', type: 'oneOf', parent: null })

      expect(tree.root?.value()).toMatchObject({ title: 'opt1' })
      expect(tree.root?.value('#/oneOf/0')).toMatchObject({ title: 'opt1' })
      expect(tree.root?.value('#/oneOf/0/oneOf/0')).toMatchObject({ title: 'opt1' })
      expect(tree.root?.value('#/oneOf/0/oneOf/1')).toMatchObject({ title: 'opt2' })
      expect(tree.root?.value('#/oneOf/1')).toMatchObject({ title: 'opt3' })
    })

    it('should create tree from jsonSchema with additionalProperties', () => {
      const schema: JSONSchema4 = {
        title: 'test',
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
        additionalProperties: {
          type: 'number',
        },
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', kind: 'root', type: 'simple', parent: null })
      expect(tree.root?.meta).toMatchObject({ _fragment: schema })

      const children = tree.root?.children()
      expect(children).toMatchObject([
        { id: '#/properties/id', kind: 'property', key: 'id', type: 'simple', parent: tree.root },
        { id: '#/properties/name', kind: 'property', key: 'name', type: 'simple', parent: tree.root },
        {
          id: '#/additionalProperties',
          kind: 'additionalProperties',
          key: 'additionalProperties',
          type: 'simple',
          parent: tree.root,
        },
      ])

      expect(children?.[0].meta).toMatchObject({ required: true, _fragment: schema.properties!.id })
      expect(children?.[1].meta).toMatchObject({ required: false, _fragment: schema.properties!.name })
      expect(children?.[2].meta).toMatchObject({ required: false, _fragment: schema.additionalProperties })
    })

    it('should create tree from jsonSchema with patternProperties', () => {
      const schema: JSONSchema4 = {
        title: 'test',
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
        patternProperties: {
          '^[a-z0-9]+$': {
            type: 'number',
          },
          '^[0-9]+$': {
            type: 'string',
          },
        },
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })

      const children = tree.root?.children()
      expect(children).toMatchObject([
        { id: '#/properties/id', kind: 'property', type: 'simple', parent: tree.root },
        { id: '#/properties/name', kind: 'property', type: 'simple', parent: tree.root },
        {
          id: '#/patternProperties/%5E%5Ba-z0-9%5D%2B%24',
          kind: 'patternProperty',
          key: '^[a-z0-9]+$',
          type: 'simple',
          parent: tree.root,
        },
        {
          id: '#/patternProperties/%5E%5B0-9%5D%2B%24',
          kind: 'patternProperty',
          key: '^[0-9]+$',
          type: 'simple',
          parent: tree.root,
        },
      ])

      expect(children?.[0].meta).toMatchObject({ required: true, _fragment: schema.properties!.id })
      expect(children?.[1].meta).toMatchObject({ _fragment: schema.properties!.name })
      expect(children?.[2].meta).toMatchObject({ _fragment: schema.patternProperties!['^[a-z0-9]+$'] })
      expect(children?.[3].meta).toMatchObject({ _fragment: schema.patternProperties!['^[0-9]+$'] })
    })

    it('should create node with value = false when additionalProperties = false (object schema)', () => {
      const schema = {
        type: 'object',
        properties: {
          first: { type: 'string' },
          second: { type: 'string' },
        },
        additionalProperties: false,
      }
      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toBeTruthy()
      expect(tree.root!.children()[2]?.id).toBe('#/additionalProperties')
      expect(tree.root!.children()[2]?.value()).toBe(false)
    })
  })

  describe('schema with array', () => {
    it('should create tree from simple array jsonSchema', () => {
      const schema: JSONSchema4 = {
        title: 'test',
        type: 'array',
        items: {
          type: 'string',
        },
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      expect(tree.root?.meta).toMatchObject({ _fragment: schema })

      expect(tree.root?.children()).toMatchObject([
        { id: '#/items', kind: 'items', key: 'items', type: 'simple', parent: tree.root },
      ])
      expect(tree.root?.children()[0].meta).toMatchObject({ _fragment: schema.items })
    })

    it('should create tree from jsonSchema with array items', () => {
      const schema = {
        title: 'test',
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
          type: 'number',
        },
      }

      const tree = createJsonSchemaTreeForTests(schema as JSONSchema4)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })
      expect(tree.root?.meta).toMatchObject({ _fragment: schema })

      expect(tree.root?.children()).toMatchObject([
        { id: '#/items/0', kind: 'item', key: 0, type: 'simple', parent: tree.root },
        { id: '#/items/1', kind: 'item', key: 1, type: 'simple', parent: tree.root },
        { id: '#/additionalItems', kind: 'additionalItems', key: 'additionalItems', type: 'simple', parent: tree.root },
      ])
      expect(tree.root?.children()[0].meta).toMatchObject({ _fragment: schema.items![0] })
      expect(tree.root?.children()[1].meta).toMatchObject({ _fragment: schema.items![1] })
      expect(tree.root?.children()[2].meta).toMatchObject({ _fragment: schema.additionalItems })
    })
  })

  describe('schema with references', () => {
    it('should create tree for jsonSchema with refs', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { $ref: '#/defs/id' },
          name: { $ref: '#/defs/name' },
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

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })

      const children = tree.root?.children()
      expect(children).toMatchObject([
        { id: '#/properties/id', type: 'simple', parent: tree.root },
        { id: '#/properties/name', type: 'simple', parent: tree.root },
      ])
      expect(children?.[0].value()).toMatchObject({ ...schema.defs!.id })
      expect(children?.[1].value()).toMatchObject({ ...schema.defs!.name })

      const nodes = [...tree.nodes.values()]

      expect(nodes).toMatchObject([
        { id: '#', kind: 'root', type: 'simple', parent: null },
        { id: '#/properties/id', kind: 'property', type: 'simple' },
        { id: '#/properties/name', kind: 'property', type: 'simple' },
      ])
    })

    it('should create tree for jsonSchema with cycle refs', () => {
      const schema: JSONSchema4 = {
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

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })

      const model = tree.root?.children()?.[0]
      expect(model).toMatchObject({
        id: '#/properties/model',
        type: 'simple',
        key: 'model',
        kind: 'property',
        parent: tree.root,
      })

      const children = model?.children()
      expect(children).toMatchObject([
        { id: '#/properties/model/properties/id', type: 'simple', parent: model },
        {
          id: '#/properties/model/properties/parent',
          type: 'simple',
          parent: model,
          isCycle: true,
        },
      ])
      expect(children?.[1].value()).toMatchObject({ type: 'object' })
    })
  })

  describe('schema with broken reference', () => {
    it('should create tree for jsonSchema with broken refs', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          id: { $ref: '#/defs/id' },
        },
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'simple', parent: null })

      const children = tree.root?.children()
      expect(children).toMatchObject([{
        id: '#/properties/id',
        type: 'simple',
        parent: tree.root,
        meta: { brokenRef: '#/defs/id' },
      }])
      expect(children?.[0].value()).toEqual({})
    })

    it('should create tree for jsonSchema with broken refs in allOf', () => {
      const schema: JSONSchema4 = {
        allOf: [
          {
            type: 'string',
          },
          {
            description: 'String type',
          },
          {
            $ref: '#/components/schemas/StringPropValidations',
          },
        ],
      }

      const tree = createJsonSchemaTreeForTests(schema)

      expect(tree.root).toMatchObject({ id: '#', type: 'allOf', parent: null })

      const nested = tree.root?.nested
      expect(nested).toMatchObject([
        { id: '#/allOf/0', type: 'simple', parent: null },
        { id: '#/allOf/1', type: 'simple', parent: null },
        { id: '#/allOf/2', type: 'simple', parent: null },
      ])
      expect(nested?.[2].value()).toEqual({})
    })
  })

  describe('schema with circular reference', () => {
    it('should override props in ref definition', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          model: {
            allOf: [
              { $ref: '#/defs/model' },
              { description: 'Overridden Description' },
            ],
          },
        },
        defs: {
          model: {
            description: 'Original Description',
            type: 'object',
            properties: {
              parent: {
                allOf: [
                  { $ref: '#/defs/model' },
                  { description: 'Parent Description' },
                ],
              },
            },
          },
        },
      }

      let tree: JsonSchemaModelTree = createJsonSchemaTreeForTests(schema)

      expect(tree.root?.children()[0]?.value()?.description).toBe('Overridden Description')
      expect(tree.root?.children()[0]?.children()[0]?.value()?.description).toBe('Parent Description')

      schema.properties!.model!.allOf!.pop()
      tree = createJsonSchemaTreeForTests(schema)
      expect(tree.root?.children()[0]?.value()?.description).toBe('Original Description')

      schema.defs!.model!.properties!.parent!.allOf!.pop()
      tree = createJsonSchemaTreeForTests(schema)
      expect(tree.root?.children()[0]?.children()[0]?.value()?.description).toBe('Original Description')
    })
  })
})
