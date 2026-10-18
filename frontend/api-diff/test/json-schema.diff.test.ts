import { apiDiff, DiffAction } from '../src'
import { TEST_DIFF_FLAG, TEST_INLINE_REF_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import { diffsMatcher } from './helper/matchers'

describe('JSON schema changes', () => {

  describe('object with inline object & ref to object', () => {

    it('refactoring inline to ref', () => {
      const before = {
        type: 'object',
        properties: {
          prop1: {
            type: 'object',
            properties: {
              req: {
                $ref: '#/properties/prop1',
              },
            },
          },
        },
      }

      const after = {
        type: 'object',
        properties: {
          prop1: {
            $ref: '#/defs/MyType',
          },
        },
      }

      const source = {
        defs: {
          MyType: {
            type: 'object',
            properties: {
              req: {
                $ref: '#/defs/MyType',
              },
            },
          },
        },
      }

      const diffs = apiDiff(before, after, {
        inlineRefsFlag: TEST_INLINE_REF_FLAG,
        syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
        afterSource: source,
        beforeSource: source,
      })


      expect(diffs.diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterValue: 'MyType',
          afterDeclarationPaths: [['defs', 'MyType']],
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'prop1',
          afterValue: 'MyType',
          afterDeclarationPaths: [['defs', 'MyType']],
          beforeDeclarationPaths: [['properties', 'prop1']],
        }),
      ]))
    })

    it('rename ref', () => {
      const before = {
        type: 'object',
        properties: {
          prop1: {
            $ref: '#/defs/MyType',
          },
        },
      }

      const after = {
        type: 'object',
        properties: {
          prop1: {
            $ref: '#/defs/NewMyType',
          },
        },
      }

      const beforeSource = {
        defs: {
          MyType: {
            type: 'object',
            properties: {
              req: {
                $ref: '#/defs/MyType',
              },
            },
          },
        },
      }

      const afterSource = {
        defs: {
          NewMyType: {
            type: 'object',
            properties: {
              req: {
                $ref: '#/defs/NewMyType',
              },
            },
          },
        },
      }

      const diffs = apiDiff(before, after, {
        inlineRefsFlag: TEST_INLINE_REF_FLAG,
        syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
        afterSource: afterSource,
        beforeSource: beforeSource,
      })


      expect(diffs.diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'MyType',
          afterValue: 'NewMyType',
          beforeDeclarationPaths: [['defs', 'MyType']],
          afterDeclarationPaths: [['defs', 'NewMyType']],
        }),
      ]))
    })
  })

  describe('denormalize', () => {

    it('simple case', () => {
      const before = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
          },
        },
      }

      const after = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
          },
        },
      }

      const diffs = apiDiff(before, after, {
        unify: true,
        liftCombiners: true,
        validate: true,
        metaKey: TEST_DIFF_FLAG,
      })

      const merged = diffs.merged
      expect(merged).not.toHaveProperty('additionalProperties')
      expect(merged).not.toHaveProperty('deprecated')
      expect(merged).not.toHaveProperty('readOnly')
      expect(merged).not.toHaveProperty('writeOnly')
    })

    it('reused and changed case', () => {
      const before = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
            additionalProperties: {
              type: 'string',
            },
          },
        },
      }

      const after = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
            additionalProperties: true,
          },
        },
      }

      const diffs = apiDiff(before, after, {
        unify: true,
        liftCombiners: true,
        validate: true,
        metaKey: TEST_DIFF_FLAG,
      })

      const merged = diffs.merged
      expect(merged).not.toHaveProperty('additionalProperties')
      expect(merged).not.toHaveProperty('deprecated')
      expect(merged).not.toHaveProperty('readOnly')
      expect(merged).not.toHaveProperty('writeOnly')
    })

    it('diff share share instance', () => {
      const before = {
        type: 'object',
        properties: {
          prop1: {
            description: 'one',
            type: 'object',
          },
        },
      }

      const after = {
        type: 'object',
        properties: {
          prop1: {
            description: 'another',
            type: 'object',
          },
        },
      }

      const result = apiDiff(before, after, {
        unify: true,
        liftCombiners: true,
        validate: true,
        metaKey: TEST_DIFF_FLAG,
      })

      const { diffs, merged } = result
      expect((merged as any).properties.prop1[TEST_DIFF_FLAG].description).toBe(diffs[0])
    })

    it('equal deep but not same', () => {
      const before = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
            additionalProperties: {
              anyOf: [
                { type: 'string' },
                { type: 'object' },
                { type: 'null' },
                { type: 'array' },
                { type: 'number' },
                { type: 'integer' },
                { type: 'boolean' },
              ],
            },
          },
        },
      }

      const after = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
            additionalProperties: true,
          },
        },
      }

      const diffs = apiDiff(before, after, {
        unify: true,
        liftCombiners: true,
        validate: true,
        metaKey: TEST_DIFF_FLAG,
      })

      const merged = diffs.merged
      expect(merged).not.toHaveProperty('additionalProperties')
      expect(merged).not.toHaveProperty('deprecated')
      expect(merged).not.toHaveProperty('readOnly')
      expect(merged).not.toHaveProperty('writeOnly')

      expect(merged).not.toHaveProperty('properties.prop1.additionalProperties')
    })

    it('not equal deep', () => {
      const before = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
            additionalProperties: {
              anyOf: [
                { type: 'string' },
                { type: 'object', additionalProperties: false },
                { type: 'null' },
                { type: 'array' },
                { type: 'number' },
                { type: 'integer' },
                { type: 'boolean' },
              ],
            },
          },
        },
      }

      const after = {
        type: 'object',
        properties: {
          prop1: {
            description: 'Description',
            type: 'object',
            additionalProperties: true,
          },
        },
      }

      const diffs = apiDiff(before, after, {
        unify: true,
        liftCombiners: true,
        validate: true,
        metaKey: TEST_DIFF_FLAG,
      })

      const merged = diffs.merged
      expect(merged).not.toHaveProperty('additionalProperties')
      expect(merged).not.toHaveProperty('deprecated')
      expect(merged).not.toHaveProperty('readOnly')
      expect(merged).not.toHaveProperty('writeOnly')

      expect(merged).toHaveProperty('properties.prop1.additionalProperties')
      //bug
      expect(merged).not.toHaveProperty('properties.prop1.additionalProperties.anyOf', expect.arrayContaining([undefined]))
    })
  })

  it('simple enums', () => {
    const before = {
      type: 'string',
      enum: ['old', 'deep.deep', 'deep'],
    }

    const after = {
      type: 'string',
      enum: ['deep.deep', 'new'],
    }

    const diffs = apiDiff(before, after, {
      metaKey: TEST_DIFF_FLAG,
    })
    expect(diffs.merged).toHaveProperty('enum', expect.arrayContaining(['old', 'deep.deep', 'deep', 'new']))
    expect(diffs.diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['enum', 0]],
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['enum', 2]],
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['enum', 1]],
      }),
    ]))
  })

  it('complex enums', () => {
    const before = {
      type: 'object',
      enum: [{ value: 42, description: 'This is 42' }, { value: 24, description: 'This is 24' }],
    }

    const after = {
      type: 'object',
      enum: [{ value: 24, description: 'This is 24 number' }, { value: 42, description: 'This is 42 number' }],
    }

    const diffs = apiDiff(before, after, {
      metaKey: TEST_DIFF_FLAG,
    })
    expect(diffs.merged).toHaveProperty('enum', expect.toIncludeSameMembers([
      { value: 42, description: 'This is 42' },
      { value: 24, description: 'This is 24' },
      { value: 24, description: 'This is 24 number' },
      { value: 42, description: 'This is 42 number' },
    ]))
    expect(diffs.diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeValue: { value: 42, description: 'This is 42' },
        beforeDeclarationPaths: [['enum', 0]],
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeValue: { value: 24, description: 'This is 24' },
        beforeDeclarationPaths: [['enum', 1]],
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterValue: { value: 24, description: 'This is 24 number' },
        afterDeclarationPaths: [['enum', 0]],
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterValue: { value: 42, description: 'This is 42 number' },
        afterDeclarationPaths: [['enum', 1]],
      }),
    ]))
  })

  describe('combiner matching by inlineRefsFlag', () => {
    // SchemaA holds `type: string` and SchemaB holds `type: integer` in before.
    // After intentionally swaps the content: SchemaA → integer, SchemaB → string.
    // The $ref names in the oneOf are unchanged, so the inlineRefsFlag paths match
    // before[0]↔after[0] (both from SchemaA) and before[1]↔after[1] (both from SchemaB).
    const beforeSource = {
      defs: {
        SchemaA: { type: 'string' },
        SchemaB: { type: 'integer' },
      },
    }

    const before = {
      oneOf: [
        { $ref: '#/defs/SchemaA' },
        { $ref: '#/defs/SchemaB' },
      ],
    }

    const afterSource = {
      defs: {
        SchemaA: { type: 'integer' },
        SchemaB: { type: 'string' },
      },
    }

    const after = {
      oneOf: [
        { $ref: '#/defs/SchemaA' },
        { $ref: '#/defs/SchemaB' },
      ],
    }

    const afterReordered = {
      oneOf: [
        { $ref: '#/defs/SchemaB' },
        { $ref: '#/defs/SchemaA' },
      ],
    }

    it('matches by ref origin and detects type swap inside named schemas', () => {
      const result = apiDiff(before, after, {
        inlineRefsFlag: TEST_INLINE_REF_FLAG,
        beforeSource,
        afterSource,
      })

      expect(result.diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'string',
          afterValue: 'integer',
          beforeDeclarationPaths: [['defs', 'SchemaA', 'type']],
          afterDeclarationPaths: [['defs', 'SchemaA', 'type']],
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'integer',
          afterValue: 'string',
          beforeDeclarationPaths: [['defs', 'SchemaB', 'type']],
          afterDeclarationPaths: [['defs', 'SchemaB', 'type']],
        }),
      ]))
    })

    it('without explicit inlineRefsFlag the internal flag still enables ref-based matching', () => {
      // inlineRefsFlag is injected internally when not supplied, so the behaviour is the same.
      const result = apiDiff(before, after, {
        beforeSource,
        afterSource,
      })

      expect(result.diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'string',
          afterValue: 'integer',
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'integer',
          afterValue: 'string',
        }),
      ]))
    })

    it('keeps ref-origin matching when after oneOf branches are reordered', () => {
      const result = apiDiff(before, afterReordered, {
        beforeSource,
        afterSource,
      })

      expect(result.diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'string',
          afterValue: 'integer',
          beforeDeclarationPaths: [['defs', 'SchemaA', 'type']],
          afterDeclarationPaths: [['defs', 'SchemaA', 'type']],
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: 'integer',
          afterValue: 'string',
          beforeDeclarationPaths: [['defs', 'SchemaB', 'type']],
          afterDeclarationPaths: [['defs', 'SchemaB', 'type']],
        }),
      ]))
    })
  })

  describe('diff in combiners', () => {
    it('forward', () => {
      const result = apiDiff(
        {
          type: 'object',
        },
        {},
        {
          unify: true,
          metaKey: TEST_DIFF_FLAG,
        },
      )
      const mr: any = (result.merged as any)
      const anyOf = mr.anyOf! as any[]
      const objectLocation = anyOf.map((value, index) => ({ index, type: value.type }))
        .filter(value => value !== undefined)
        .find(pair => pair.type === 'object')!.index
      const inlineDiff = mr.anyOf[TEST_DIFF_FLAG]
      const indexesInInlineDiff = Object.keys(inlineDiff).map(value => parseInt(value))
      const indexesInMergedResult = anyOf.map((_, i) => i)
      expect(indexesInInlineDiff).not.toContain(objectLocation)
      expect(indexesInMergedResult.filter(value => value !== objectLocation)).toEqual(indexesInInlineDiff)
    })

    it('backward', () => {
      const result = apiDiff(
        {},
        {
          type: 'object',
        },
        {
          unify: true,
          metaKey: TEST_DIFF_FLAG,
        },
      )
      const mr: any = (result.merged as any)
      const anyOf = mr.anyOf! as any[]
      const objectLocation = anyOf.map((value, index) => ({ index, type: value.type }))
        .filter(value => value !== undefined)
        .find(pair => pair.type === 'object')!.index
      const inlineDiff = mr.anyOf[TEST_DIFF_FLAG]
      const indexesInInlineDiff = Object.keys(inlineDiff).map(value => parseInt(value))
      const indexesInMergedResult = anyOf.map((_, i) => i)
      expect(indexesInInlineDiff).not.toContain(objectLocation)
      expect(indexesInMergedResult.filter(value => value !== objectLocation)).toEqual(indexesInInlineDiff)
    })

  })
})
