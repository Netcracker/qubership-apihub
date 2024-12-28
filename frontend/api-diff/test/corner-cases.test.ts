import { apiDiff, CompareOptions, DiffAction } from '../src'
import changesInSourceAfterSource from './helper/resources/changes-in-source/after-source.json'
import changesInSourceBeforeSource from './helper/resources/changes-in-source/before-source.json'
import changesInSourceNotChanges from './helper/resources/changes-in-source/not-changed.json'

import refChangedToAnotherCommonSource from './helper/resources/ref-changed-to-another/common-source.json'
import refChangedToAnotherBefore from './helper/resources/ref-changed-to-another/before.json'
import refChangedToAnotherAfter from './helper/resources/ref-changed-to-another/after.json'

import removeChangedRefBefore from './helper/resources/remove-changed-ref/before.json'
import removeChangedRefAfter from './helper/resources/remove-changed-ref/after.json'

import removeChangedInlineBefore from './helper/resources/remove-changed-inline/before.json'
import removeChangedInlineAfter from './helper/resources/remove-changed-inline/after.json'

import changesInRefBefore from './helper/resources/changes-in-ref/before.json'
import changesInRefAfter from './helper/resources/changes-in-ref/after.json'

import arrayToObjectBefore from './helper/resources/type-change/array-to-object/before.json'
import arrayToObjectAfter from './helper/resources/type-change/array-to-object/after.json'

import defaultsWithDefaultBefore from './helper/resources/type-change/default-vs-non-default/before_default.json'
import defaultsWithNonDefaultBefore from './helper/resources/type-change/default-vs-non-default/before_non_default.json'
import defaultsWithDefaultAfter from './helper/resources/type-change/default-vs-non-default/after_default.json'
import defaultsWithNonDefaultAfter from './helper/resources/type-change/default-vs-non-default/after_non_default.json'

import emptySchemaReuseBefore from './helper/resources/empty-schema-reuse/before.json'
import emptySchemaReuseAfter from './helper/resources/empty-schema-reuse/after.json'

import dirtyEmptySchemaReuseBefore from './helper/resources/dirty-empty-schema-reuse/before.json'
import dirtyEmptySchemaReuseAfter from './helper/resources/dirty-empty-schema-reuse/after.json'

import refToSharedPropertiesBefore from './helper/resources/ref-to-shared-properties-add-remove/before.json'
import refToSharedPropertiesAfter from './helper/resources/ref-to-shared-properties-add-remove/after.json'

import { diffsMatcher } from './helper/matchers'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import {
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  JSON_SCHEMA_NODE_TYPE_ARRAY,
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JSON_SCHEMA_PROPERTY_ITEMS,
  JSON_SCHEMA_PROPERTY_TYPE,
  OriginLeafs,
} from '@netcracker/qubership-apihub-api-unifier'

describe('Corner Cases', () => {

  it('changes in source', () => {
    const {
      diffs,
      merged,
    } = apiDiff(changesInSourceNotChanges, changesInSourceNotChanges, {
      beforeSource: changesInSourceBeforeSource,
      afterSource: changesInSourceAfterSource,
    })
    expect(merged).toHaveProperty('paths./path.get.responses.200.content.application/json.schema.items.properties.second')
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'schemas', 'MyType', 'properties', 'second']],
      }),
    ]))
  })

  it('$ref changed to another', () => {
    const {
      diffs,
      merged,
    } = apiDiff(refChangedToAnotherBefore, refChangedToAnotherAfter, {
      beforeSource: refChangedToAnotherCommonSource,
      afterSource: refChangedToAnotherCommonSource,
      syntheticTitleFlag: Symbol('synthetic-title'),
    })
    
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'schemas', 'YourType']],
        beforeDeclarationPaths: [['components', 'schemas', 'MyType']],
        beforeValue: 'MyType',
        afterValue: 'YourType',
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeValue: 'string',
        afterValue: 'number',
        afterDeclarationPaths: [['components', 'schemas', 'YourType', 'properties', 'first', 'type']],
        beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'properties', 'first', 'type']],
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeValue: 'number',
        afterValue: 'string',
        afterDeclarationPaths: [['components', 'schemas', 'YourType', 'properties', 'second', 'type']],
        beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'properties', 'second', 'type']],
      }),
    ]))
  })

  it('remove changed $ref', () => {
    const ref = Symbol('ref')
    const {
      diffs,
      merged,
    } = apiDiff(removeChangedRefBefore, removeChangedRefAfter)
    expect(merged).toHaveProperty('paths./path.get.responses.200.content.application/json.schema.properties.one.properties.first.type', 'number')
    //current compromise that we don't evaluate diff for removed items
    expect(merged).toHaveProperty('paths./path.get.responses.200.content.application/json.schema.properties.another.properties.first.type', 'string')
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'another']],
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'schemas', 'MyType', 'properties', 'first', 'type']],
        beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'properties', 'first', 'type']],
        beforeValue: 'string',
        afterValue: 'number',
        scope: 'response',
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'schemas', 'MyType', 'properties', 'first', 'type']],
        beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'properties', 'first', 'type']],
        beforeValue: 'string',
        afterValue: 'number',
        scope: 'components',
      }),
    ]))
  })

  it('remove changed inline', () => {
    const {
      diffs,
      merged,
    } = apiDiff(removeChangedInlineBefore, removeChangedInlineAfter)
    expect(merged).toHaveProperty('paths./path.get.responses.200.content.application/json.schema.properties.one.properties.first.type', 'number')
    //current compromise that we don't evaluate diff for removed items to be symmetric with inline
    expect(merged).toHaveProperty('paths./path.get.responses.200.content.application/json.schema.properties.another.properties.first.type', 'string')
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'another']],
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'one', 'properties', 'first', 'type']],
        afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'one', 'properties', 'first', 'type']],
        beforeValue: 'string',
        afterValue: 'number',
      }),
    ]))
  })

  it('changes in ref only', () => {
    const {
      diffs,
      merged,
    } = apiDiff(changesInRefBefore, changesInRefAfter)
    const castedMerged = merged as any
    expect(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['one'])
      .not.toBe(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['another']) //cause different origins for property keys
    expect(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['one']['properties'])
      .toBe(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['another']['properties'])
    expect(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['one'])
      .toBe(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['one']['properties']['recursive'])
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'response',
        beforeDeclarationPaths: [
          ['components', 'schemas', 'MyType', 'properties', 'first', 'type'],
        ],
        afterDeclarationPaths: [
          ['components', 'schemas', 'MyType', 'properties', 'first', 'type'],
        ],
        beforeValue: 'string',
        afterValue: 'number',
      }),
      expect.objectContaining({
        action: DiffAction.replace,
        scope: 'components',
        beforeDeclarationPaths: [
          ['components', 'schemas', 'MyType', 'properties', 'first', 'type'],
        ],
        afterDeclarationPaths: [
          ['components', 'schemas', 'MyType', 'properties', 'first', 'type'],
        ],
        beforeValue: 'string',
        afterValue: 'number',
      }),
    ]))
  })

  describe('type changed', () => {
    const diffOptions: CompareOptions = {
      unify: true,
      validate: true,
    }
    it('array to object', () => {
      const {
        diffs,
        merged,
      } = apiDiff(arrayToObjectBefore, arrayToObjectAfter)
      const castedMerged = merged as any
      expect(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['items'])
        .toBe(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['items']['properties']['recursive'])
      //schema SHOULD NOT BE CYCLED BECAUSE it has diff
      expect(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['recursive'])
        .toBe(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['recursive']['properties']['recursive'])
      expect(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['items']['properties']['recursive'])
        .not.toBe(castedMerged['paths']['/path']['get']['responses'][200]['content']['application/json']['schema']['properties']['recursive'])
      expect(merged).toHaveProperty('components.schemas.MyType.items.properties.first.type', 'number')
      expect(merged).toHaveProperty('components.schemas.MyType.properties.first.type', 'string')
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'type']],
          afterDeclarationPaths: [['components', 'schemas', 'MyType', 'type']],
          beforeValue: 'array',
          afterValue: 'object',
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'items']],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [['components', 'schemas', 'MyType', 'properties']],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'type']],
          afterDeclarationPaths: [['components', 'schemas', 'MyType', 'type']],
          beforeValue: 'array',
          afterValue: 'object',
          scope: 'components',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['components', 'schemas', 'MyType', 'items']],
          scope: 'components',
        }),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [['components', 'schemas', 'MyType', 'properties']],
          scope: 'components',
        }),
      ]))
    })

    it('default to default', () => {
      const {
        diffs,
        merged,
      } = apiDiff(defaultsWithDefaultBefore, defaultsWithDefaultAfter, diffOptions)
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        }),
      ]))
      expect(merged).not.toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'minLength'])
      expect(merged).not.toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'exclusiveMaximum'])
    })

    it('default to non default', () => {
      const {
        diffs,
        merged,
      } = apiDiff(defaultsWithDefaultBefore, defaultsWithNonDefaultAfter, diffOptions)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        }),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'exclusiveMaximum']],
        }),
      ]))

      expect(merged).not.toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'minLength'])
      expect(merged).toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'exclusiveMaximum'])
    })

    it('non default to default', () => {
      const {
        diffs,
        merged,
      } = apiDiff(defaultsWithNonDefaultBefore, defaultsWithDefaultAfter, diffOptions)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'minLength']],
        }),
      ]))

      expect(merged).toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'minLength'])
      expect(merged).not.toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'exclusiveMaximum'])
    })

    it('non default to non default', () => {
      const {
        diffs,
        merged,
      } = apiDiff(defaultsWithNonDefaultBefore, defaultsWithNonDefaultAfter, diffOptions)

      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        }),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'exclusiveMaximum']],
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'minLength']],
        }),
      ]))

      expect(merged).toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'minLength'])
      expect(merged).toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'exclusiveMaximum'])
    })
  })

  describe('declarative changes main idea', () => {
    const ORIGIN_FOR_DEFAULTS: OriginLeafs[number] = { parent: undefined, value: 'come-from-defaults' }
    const OPTIONS: CompareOptions = {
      // syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
      metaKey: TEST_DIFF_FLAG,
      unify: true,
      liftCombiners: true,
      allowNotValidSyntheticChanges: true,
      createOriginsForDefaults: () => [ORIGIN_FOR_DEFAULTS],
    }

    it('reuse empty schema', () => {
      const before: any = emptySchemaReuseBefore
      const after: any = emptySchemaReuseAfter
      const { diffs } = apiDiff(before, after, OPTIONS)
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'number' }),
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'integer' }),
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'object' }),
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'array' }),
        }),

        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'simple', 'type']],
          scope: 'response',
          beforeValue: 'any',
          afterValue: 'string',
        }),

        //unsupported case. can be changed in future
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          beforeValue: 'any',
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'unwrappedWrap', 'oneOf']],
          scope: 'response',
        }),
      ]))
    })

    it('reuse dirty empty schema', () => {
      const before: any = dirtyEmptySchemaReuseBefore
      const after: any = dirtyEmptySchemaReuseAfter
      const { merged, diffs } = apiDiff(before, after, OPTIONS)
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'number' }),
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'integer' }),
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'object' }),
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          scope: 'response',
          beforeValue: expect.objectContaining({ type: 'array' }),
        }),

        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'simple', 'type']],
          scope: 'response',
          beforeValue: 'any',
          afterValue: 'string',
        }),

        //unsupported case. can be changed in future
        expect.objectContaining({
          action: DiffAction.remove,
          beforeValue: 'dirty',
          beforeDeclarationPaths: [['components', 'schemas', 'DirtyEmptySchema', 'description']],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[ORIGIN_FOR_DEFAULTS.value]],
          beforeValue: 'any',
          scope: 'response',
        }),

        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'unwrappedWrap', 'oneOf']],
          scope: 'response',
        }),
      ]))
    })

    it('ref to shared properties', () => {
      const before: any = refToSharedPropertiesBefore
      const after: any = refToSharedPropertiesAfter
      const { diffs } = apiDiff(before, after, OPTIONS)
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'one', 'properties', 'empty']],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'another', 'properties', 'empty']],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'oneArray', 'oneOf', 0]],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'oneArray', 'oneOf', 1]],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'anotherArray', 'oneOf', 0]],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'anotherArray', 'oneOf', 1]],
          scope: 'response',
        }),
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [['components', 'schemas', 'SharedSchema', 'properties', 'empty']],
          scope: 'components',
        }),
      ]))
    })
  })

  describe('empty schema', () => {
    const OPTIONS: CompareOptions = {
      // syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
      metaKey: TEST_DIFF_FLAG,
      unify: true,
      liftCombiners: true,
      allowNotValidSyntheticChanges: true,
    }
    const spec: (schema: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown> = (schema) => ({
      openapi: '3.0.1',
      paths: {
        '/path': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema,
                  },
                },
              },
            },
          },
        },
      },
    })
    it('do not denormalize if not fully equals', () => {
      const before: any = spec({ description: 'Same' })
      const after: any = spec({
        anyOf: [
          { description: 'Same', [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_BOOLEAN },
          { description: 'Same', [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_STRING },
          { description: 'Same', [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_NUMBER },
          { description: 'Same', [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_INTEGER },
          { description: 'Same', [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_OBJECT },
          {
            description: 'Same',
            [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_ARRAY,
            [JSON_SCHEMA_PROPERTY_ITEMS]: { description: 'Difference' },
          },
        ],
      })
      const { diffs, merged } = apiDiff(before, after, OPTIONS)
      expect(merged).toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'anyOf'])
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'anyOf', 5, 'items', 'description']],
          afterValue: 'Difference',
        }),
      ]))
    })

    it('readOnly: true <->  writeOnly: true', () => {
      const before: any = spec({ readOnly: true })
      const after: any = spec({ writeOnly: true })
      const { diffs, merged } = apiDiff(before, after, OPTIONS)
      expect(merged).not.toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'anyOf'])
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: false,
          afterValue: true,
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'writeOnly']],
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: true,
          afterValue: false,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'readOnly']],
        }),
      ]))
    })

    it('additionalProperties:true <-> additionalProperties:false', () => {
      const before: any = spec({ additionalProperties: true })
      const after: any = spec({ additionalProperties: false })
      const { diffs, merged } = apiDiff(before, after, OPTIONS)
      expect(merged).not.toHaveProperty(['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'anyOf'])
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
          afterValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
          beforeDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'additionalProperties']],
          afterDeclarationPaths: [['paths', '/path', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'additionalProperties']],
        }),
      ]))
    })
    it('default type have shared origins', () => {
      const before: any = {
        openapi: '3.0.0',
        components: {
          schemas: {
            main: {
              properties: {
                one: {},
                another: {},
              },
            },
            shared: {
              type: 'number',
            },
          },
        },
      }
      const after: any = {
        openapi: '3.0.0',
        components: {
          schemas: {
            main: {
              properties: {
                one: {
                  $ref: '#/components/schemas/shared',
                },
                another: {
                  $ref: '#/components/schemas/shared',
                },
              },
            },
            shared: {
              type: 'number',
            },
          },
        },
      }
      const { diffs } = apiDiff(before, after, OPTIONS)
      expect(diffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
          afterValue: 'number',
          // beforeDeclarationPaths: [['#defaults']], actually should be argument
          afterDeclarationPaths: [['components', 'schemas', 'shared', 'type']],
        }),
      ]))
    })
  })

  it('diff in broken spec', () => {
    const OPTIONS: CompareOptions = {
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
      metaKey: TEST_DIFF_FLAG,
      validate: true,
      unify: true,
      liftCombiners: true,
      allowNotValidSyntheticChanges: true,
    }
    const before: any = {
      openapi: '3.0.0',
      components: {
        schemas: {
          main: {
            allOf: [
              {
                $ref: '#/components/schemas/notExisted',
              },
              {
                required: ['one'],
                properties: {
                  one: { type: 'string' },
                  another: { type: 'string' },
                },
              },
            ],
          },
        },
      },
    }
    const after: any = {
      openapi: '3.0.0',
      components: {
        schemas: {
          main: {
            allOf: [
              {
                $ref: '#/components/schemas/notExisted',
              },
              {
                required: ['another'],
                properties: {
                  one: { type: 'string' },
                  another: { type: 'string' },
                },
              },
            ],
          },
        },
      },
    }
    const diffs = apiDiff(before, after, OPTIONS).diffs
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeValue: 'one',
        beforeDeclarationPaths: [['components', 'schemas', 'main', 'allOf', 1, 'required', 0]],
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterValue: 'another',
        afterDeclarationPaths: [['components', 'schemas', 'main', 'allOf', 1, 'required', 0]],
      }),
    ]))
  })
})
