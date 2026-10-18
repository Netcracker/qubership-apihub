import { apiDiff, breaking, CompareOptions, DiffAction, nonBreaking, risky } from '../src'
import { COMPARE_SCOPE_REQUEST, COMPARE_SCOPE_RESPONSE } from '../src/openapi/openapi3.const'
import { diffsMatcher } from './helper/matchers'

const TEST_COMPARE_OPTIONS: CompareOptions = {
  unify: true,
}

const REQUEST_SCHEMA_PATH = ['paths', '/path1', 'post', 'requestBody', 'content', 'application/json', 'schema']
const RESPONSE_SCHEMA_PATH = ['paths', '/path1', 'post', 'responses', '200', 'content', 'application/json', 'schema']

const DEFAULT_SCHEMA = { type: 'object' }

const openApi31Spec = ({
  requestSchema = DEFAULT_SCHEMA,
  responseSchema = DEFAULT_SCHEMA,
}: {
  requestSchema?: unknown
  responseSchema?: unknown
}): unknown => ({
  openapi: '3.1.0',
  info: {
    title: 'OpenAPI exclusive bounds test',
    version: '1.0.0',
  },
  paths: {
    '/path1': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: requestSchema,
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: responseSchema,
              },
            },
          },
        },
      },
    },
  },
})

describe('OpenAPI 3.1 exclusive numeric bounds on unified specifications', () => {

  // Redundant bounds are removed during unification, so changes to them are not reported
  // unless the change makes them effective bound
  describe('Redundant bounds changes are not reported', () => {
    describe('request', () => {
      test('add redundant lower-bound', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('add redundant upper-bound', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('remove redundant upper-bound', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('remove redundant lower-bound', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('change redundant upper bound', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 15,
            exclusiveMaximum: 9,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 9,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('change redundant lower bound', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 5,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 2,
            exclusiveMinimum: 5,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })
    })

    describe('response', () => {
      test('add redundant lower-bound', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('add redundant upper-bound', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('remove redundant upper-bound', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('remove redundant lower-bound', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('change redundant upper bound', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 20,
            exclusiveMaximum: 9,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 9,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })

      test('change redundant lower bound', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 5,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 2,
            exclusiveMinimum: 5,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toBeEmpty()
      })
    })
  })

  describe('Effective bound defining property switch', () => {
    describe('request', () => {
      test('stricter lower effective bounds as breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 2,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'minimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMinimum']],
            type: breaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })

      test('looser lower effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 2,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMinimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'minimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })

      test('stricter upper effective bounds as breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 9,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'maximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMaximum']],
            type: breaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })

      test('looser upper effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 9,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMaximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'maximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })
    })

    describe('response', () => {
      test('stricter lower effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 2,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'minimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMinimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })

      test('stricter upper effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 9,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'maximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMaximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })

      test('looser lower effective bounds as risky, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 2,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
            exclusiveMinimum: 0,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMinimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'minimum']],
            type: risky,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })

      test('looser upper effective bounds as risky, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 9,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
            exclusiveMaximum: 11,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMaximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'maximum']],
            type: risky,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })
    })
  })

  describe('Same-threshold inclusive to exclusive bounds', () => {
    describe('request', () => {
      test('stricter lower effective bounds as breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            exclusiveMinimum: 1,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'minimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMinimum']],
            type: breaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })

      test('stricter upper effective bounds as breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            exclusiveMaximum: 10,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'maximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMaximum']],
            type: breaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })
    })

    describe('response', () => {
      test('stricter lower effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            exclusiveMinimum: 1,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'minimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMinimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })

      test('stricter upper effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            exclusiveMaximum: 10,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'maximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMaximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })
    })
  })

  describe('same-threshold exclusive to inclusive bounds', () => {
    describe('request', () => {
      test('looser lower effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            exclusiveMinimum: 1,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            minimum: 1,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMinimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'minimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })

      test('looser upper effective bounds as non-breaking, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          requestSchema: {
            type: 'number',
            exclusiveMaximum: 10,
          },
        })
        const after = openApi31Spec({
          requestSchema: {
            type: 'number',
            maximum: 10,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'exclusiveMaximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...REQUEST_SCHEMA_PATH, 'maximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_REQUEST
          }),
        ]))
      })
    })

    describe('response', () => {
      test('looser lower effective bounds as risky, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            exclusiveMinimum: 1,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            minimum: 1,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMinimum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'minimum']],
            type: risky,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })

      test('looser upper effective bounds as risky, redundant property diff non-breaking', () => {
        const before = openApi31Spec({
          responseSchema: {
            type: 'number',
            exclusiveMaximum: 10,
          },
        })
        const after = openApi31Spec({
          responseSchema: {
            type: 'number',
            maximum: 10,
          },
        })

        const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS)

        expect(diffs).toEqual(diffsMatcher([
          expect.objectContaining({
            action: DiffAction.remove,
            beforeDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'exclusiveMaximum']],
            type: nonBreaking,
            scope: COMPARE_SCOPE_RESPONSE
          }),
          expect.objectContaining({
            action: DiffAction.add,
            afterDeclarationPaths: [[...RESPONSE_SCHEMA_PATH, 'maximum']],
            type: risky,
            scope: COMPARE_SCOPE_RESPONSE
          }),
        ]))
      })
    })
  })
})
