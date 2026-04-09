import { apiDiff, CompareOptions, DiffAction, unclassified } from '../src'
import { diffsMatcher } from './helper/matchers'

const TEST_COMPARE_OPTIONS: CompareOptions = {
  unify: true,
}

const extensionName = 'x-channel-extension'
const CHANNEL_EXTENSION_PATH = ['channels', 'ch', extensionName]

const makeSpecWithChannelExtension = (extensionValue: unknown) => ({
  asyncapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  channels: {
    ch: extensionValue === undefined ? {} : { [extensionName]: extensionValue },
  },
})

const prepareSpecsForComparison = (beforeExtensionValue: unknown, afterExtensionValue: unknown) => {
  const before = makeSpecWithChannelExtension(beforeExtensionValue)
  const after = makeSpecWithChannelExtension(afterExtensionValue)

  return { before, after }
}

const jsonSchemaSample = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
}

describe('AsyncAPI channel specification extensions - JSON changes', () => {
  it('string-to-array: replace extension value from string to array', () => {
    const { before, after } = prepareSpecsForComparison('value', ['value'])

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        afterDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        action: DiffAction.replace,
        type: unclassified,
        beforeValue: 'value',
        afterValue: ['value'],
      }),
    ]))
  })

  it('string-to-object: replace extension value from string to object', () => {
    const { before, after } = prepareSpecsForComparison('value', { key: 'value' })

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        afterDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        action: DiffAction.replace,
        type: unclassified,
        beforeValue: 'value',
        afterValue: { key: 'value' },
      }),
    ]))
  })

  it('string-to-json-schema: replace extension value from string to JSON Schema', () => {
    const { before, after } = prepareSpecsForComparison('value', jsonSchemaSample)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        afterDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        action: DiffAction.replace,
        type: unclassified,
        beforeValue: 'value',
        afterValue: jsonSchemaSample,
      }),
    ]))
  })

  it('array-to-object: replace extension value from array to object', () => {
    const { before, after } = prepareSpecsForComparison(['value'], { key: 'value' })

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        afterDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        action: DiffAction.replace,
        type: unclassified,
        beforeValue: ['value'],
        afterValue: { key: 'value' },
      }),
    ]))
  })

  it('array-to-json-schema: replace extension value from array to JSON Schema', () => {
    const { before, after } = prepareSpecsForComparison(['value'], jsonSchemaSample)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        afterDeclarationPaths: [CHANNEL_EXTENSION_PATH],
        action: DiffAction.replace,
        type: unclassified,
        beforeValue: ['value'],
        afterValue: jsonSchemaSample,
      }),
    ]))
  })

  it('object-to-json-schema: replace extension value from object to JSON Schema', () => {
    const { before, after } = prepareSpecsForComparison({ key: 'value' }, jsonSchemaSample)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    const keyPath = [...CHANNEL_EXTENSION_PATH, 'key']
    const schemaPath = [...CHANNEL_EXTENSION_PATH, '$schema']
    const typePath = [...CHANNEL_EXTENSION_PATH, 'type']
    const propertiesPath = [...CHANNEL_EXTENSION_PATH, 'properties']
    const requiredPath = [...CHANNEL_EXTENSION_PATH, 'required']

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [keyPath],
        action: DiffAction.remove,
        type: unclassified,
        beforeValue: 'value',
      }),
      expect.objectContaining({
        afterDeclarationPaths: [schemaPath],
        action: DiffAction.add,
        type: unclassified,
        afterValue: jsonSchemaSample.$schema,
      }),
      expect.objectContaining({
        afterDeclarationPaths: [typePath],
        action: DiffAction.add,
        type: unclassified,
        afterValue: jsonSchemaSample.type,
      }),
      expect.objectContaining({
        afterDeclarationPaths: [propertiesPath],
        action: DiffAction.add,
        type: unclassified,
        afterValue: jsonSchemaSample.properties,
      }),
      expect.objectContaining({
        afterDeclarationPaths: [requiredPath],
        action: DiffAction.add,
        type: unclassified,
        afterValue: jsonSchemaSample.required,
      }),
    ]))
  })

  it('delete-any-property-from-json: remove nested property inside extension JSON value', () => {
    const beforeValue = { nested: { property: 'value' } }
    const afterValue = { nested: {} }
    const propertyPath = [...CHANNEL_EXTENSION_PATH, 'nested', 'property']

    const { before, after } = prepareSpecsForComparison(beforeValue, afterValue)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [propertyPath],
        action: DiffAction.remove,
        type: unclassified,
        beforeValue: 'value',
      }),
    ]))
  })

  it('add-any-property-to-json: add nested property inside extension JSON value', () => {
    const beforeValue = { nested: {} }
    const afterValue = { nested: { property: 'value' } }
    const propertyPath = [...CHANNEL_EXTENSION_PATH, 'nested', 'property']

    const { before, after } = prepareSpecsForComparison(beforeValue, afterValue)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        afterDeclarationPaths: [propertyPath],
        action: DiffAction.add,
        type: unclassified,
        afterValue: 'value',
      }),
    ]))
  })

  it('complex-json-to-complex-json-schema-like: mixed adds, removes and replaces inside extension value', () => {
    const beforeValue = {
      description: true,
      minLength: '123',
      hello: 'world',
    }

    const afterValue = {
      type: 'string',
      minLength: 42,
      description: 'Test',
    }

    const descriptionPath = [...CHANNEL_EXTENSION_PATH, 'description']
    const minLengthPath = [...CHANNEL_EXTENSION_PATH, 'minLength']
    const helloPath = [...CHANNEL_EXTENSION_PATH, 'hello']
    const typePath = [...CHANNEL_EXTENSION_PATH, 'type']

    const { before, after } = prepareSpecsForComparison(beforeValue, afterValue)

    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [helloPath],
        action: DiffAction.remove,
        type: unclassified,
        beforeValue: 'world',
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [descriptionPath],
        afterDeclarationPaths: [descriptionPath],
        action: DiffAction.replace,
        type: unclassified,
        beforeValue: true,
        afterValue: 'Test',
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [minLengthPath],
        afterDeclarationPaths: [minLengthPath],
        action: DiffAction.replace,
        type: unclassified,
        beforeValue: '123',
        afterValue: 42,
      }),
      expect.objectContaining({
        afterDeclarationPaths: [typePath],
        action: DiffAction.add,
        type: unclassified,
        afterValue: 'string',
      }),
    ]))
  })
})

