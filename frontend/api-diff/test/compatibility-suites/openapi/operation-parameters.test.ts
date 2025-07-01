import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, deprecated, DiffAction, nonBreaking, unclassified } from '../../../src'

const SUITE_ID = 'operation-parameters'

const OPERATION_PARAMETERS_PATH = ['paths', '/path1', 'get', 'parameters']

describe('Openapi3 Operation Parameters', () => {

  test('Add operation parameter', async () => {
    const testId = 'add-operation-parameter'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: nonBreaking,
      }),
    ]))
  })

  test('Add header parameter with name Accept', async () => {
    const testId = 'add-header-parameter-with-name-accept'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: unclassified,
      }),
    ]))
  })

  test('Remove header parameter with name Accept', async () => {
    const testId = 'remove-header-parameter-with-name-accept'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: unclassified,
      }),
    ]))
  })

  test('Add header parameter with name Content-Type', async () => {
    const testId = 'add-header-parameter-with-name-content-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: unclassified,
      }),
    ]))
  })

  test('Remove header parameter with name Content-Type', async () => {
    const testId = 'remove-header-parameter-with-name-content-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: unclassified,
      }),
    ]))
  })

  test('Add header parameter with name Authorization', async () => {
    const testId = 'add-header-parameter-with-name-authorization'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: unclassified,
      }),
    ]))
  })

  test('Remove header parameter with name Authorization', async () => {
    const testId = 'remove-header-parameter-with-name-authorization'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: unclassified,
      }),
    ]))
  })

  test('Remove operation parameter', async () => {
    const testId = 'remove-operation-parameter'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: breaking,
      }),
    ]))
  })

  test('Update parameter type', async () => {
    const testId = 'update-parameter-type'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: breaking,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0]],
        type: nonBreaking,
      }),
    ]))
  })

  test('Add parameter description', async () => {
    const testId = 'add-parameter-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update parameter description', async () => {
    const testId = 'update-parameter-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'description']],
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove parameter description', async () => {
    const testId = 'remove-parameter-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Mark parameter as required', async () => {
    const testId = 'mark-parameter-as-required'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'required']],
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'required']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'required']],
          type: breaking,
        }),
      ],
    ))
  })

  test('Mark parameter as optional', async () => {
    const testId = 'mark-parameter-as-optional'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'required']],
          afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          type: nonBreaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'required']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'required']],
          type: nonBreaking,
        }),
      ],
    ))
  })

  test('Mark parameter as deprecated', async () => {
    const testId = 'mark-parameter-as-deprecated'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'deprecated']],
          type: deprecated,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'deprecated']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'deprecated']],
          type: deprecated,
        }),
      ],
    ))
  })

  test('Remove deprecated value', async () => {
    const testId = 'remove-deprecated-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'deprecated']],
          afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          type: deprecated,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'deprecated']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'deprecated']],
          type: deprecated,
        }),
      ],
    ))
  })

  test('Allow empty value for query', async () => {
    const testId = 'allow-empty-value-for-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowEmptyValue']],
          type: nonBreaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          type: nonBreaking,
        }),
      ],
    ))
  })

  test('Prohibit empty value for query', async () => {
    const testId = 'prohibit-empty-value-for-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowEmptyValue']],
          afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          type: breaking,
        }),
      ],
    ))
  })

  test('Allow empty value for not query parameters', async () => {
    const testId = 'allow-empty-value-for-not-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowEmptyValue']],
          type: unclassified,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          type: unclassified,
        }),
      ],
    ))
  })

  test('Prohibit empty value for not query parameters', async () => {
    const testId = 'prohibit-empty-value-for-not-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowEmptyValue']],
          afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          type: unclassified,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowEmptyValue']],
          type: unclassified,
        }),
      ],
    ))
  })

  test('Update style for path parameter', async () => {
    const testId = 'update-style-for-path-parameter'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/path1/{param1}', 'get', 'parameters', 0, 'style']],
        afterDeclarationPaths: [['paths', '/path1/{param1}', 'get', 'parameters', 0, 'style']],
        type: breaking,
      }),
    ]))
  })
  

  // TODO: fixme
  test.skip('Mark primitive parameter as exploded', async () => {
    const testId = 'mark-primitive-parameter-as-exploded'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'explode']],
          type: unclassified,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          type: unclassified,
        }),
      ],
    ))
  })

  // TODO: fixme
  test.skip('Mark primitive parameter as not exploded', async () => {
    const testId = 'mark-primitive-parameter-as-not-exploded'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'explode']],
          type: unclassified,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          type: unclassified,
        }),
      ],
    ))
  })

  test('Mark array parameter with not form style as exploded', async () => {
    const testId = 'mark-array-parameter-with-not-form-style-as-exploded'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'explode']],
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          type: breaking,
        }),
      ],
    ))
  })

  test('Mark array parameter with not form style as not exploded', async () => {
    const testId = 'mark-array-parameter-with-not-form-style-as-not-exploded'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'explode']],
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          type: breaking,
        }),
      ],
    ))
  })

  // TODO: fixme
  test.skip('Mark array parameter with form style as exploded', async () => {
    const testId = 'mark-array-parameter-with-form-style-as-exploded'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'explode']],
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          type: breaking,
        }),
      ],
    ))
  })

  // TODO: fixme
  test.skip('Mark array parameter with form style as not exploded', async () => {
    const testId = 'mark-array-parameter-with-form-style-as-not-exploded'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'explode']],
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'explode']],
          type: breaking,
        }),
      ],
    ))
  })

  test('Allow reserved characters for query', async () => {
    const testId = 'allow-reserved-characters-for-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowReserved']],
          type: nonBreaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          type: nonBreaking,
        }),
      ],
    ))
  })

  test('Prohibit reserved characters for query', async () => {
    const testId = 'prohibit-reserved-characters-for-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowReserved']],
          afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          type: breaking,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          type: breaking,
        }),
      ],
    ))
  })

  test('Allow reserved characters for not query', async () => {
    const testId = 'allow-reserved-characters-for-not-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowReserved']],
          type: unclassified,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          type: unclassified,
        }),
      ],
    ))
  })

  test('Prohibit reserved characters value for not query', async () => {
    const testId = 'prohibit-reserved-characters-for-not-query'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher(
      [
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'allowReserved']],
          afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
          type: unclassified,
        }),
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 1, 'allowReserved']],
          type: unclassified,
        }),
      ],
    ))
  })

  test('Add parameter`s example', async () => {
    const testId = 'add-parameter-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'example']],
        type: annotation,
      }),
    ]))
  })

  test('Update parameter`s example', async () => {
    const testId = 'update-parameter-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'example']],
        afterDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'example']],
        type: annotation,
      }),
    ]))
  })

  test('Remove parameter`s example', async () => {
    const testId = 'remove-parameter-example'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...OPERATION_PARAMETERS_PATH, 0, 'example']],
        type: annotation,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Add custom property', async () => {
    const testId = 'add-custom-property'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/pets', 'get', 'parameters', 0, 'x-custom-prop']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Remove custom property', async () => {
    const testId = 'remove-custom-property'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'parameters', 0, 'x-custom-prop']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Update custom property value', async () => {
    const testId = 'update-custom-property-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'parameters', 0, 'x-custom-prop']],
        afterDeclarationPaths: [['paths', '/pets', 'get', 'parameters', 0, 'x-custom-prop']],
        type: nonBreaking,
      }),
    ]))
  })

  describe('Add/remove default values', () => {

    test('Add required attribute with default value for parameter', async () => {
      const testId = 'add-required-attribute-with-default-value-for-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove required attribute with default value from parameter', async () => {
      const testId = 'remove-required-attribute-with-default-value-from-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add deprecated attribute with default value for parameter', async () => {
      const testId = 'add-deprecated-attribute-with-default-value-for-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove deprecated attribute with default value from parameter', async () => {
      const testId = 'remove-deprecated-attribute-with-default-value-from-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add allowEmptyValue attribute with default value for parameter', async () => {
      const testId = 'add-allowEmptyValue-attribute-with-default-value-for-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove allowEmptyValue attribute with default value from parameter', async () => {
      const testId = 'remove-allowEmptyValue-attribute-with-default-value-from-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add default style for path parameter', async () => {
      const testId = 'add-default-style-for-path-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove default style from path parameter', async () => {
      const testId = 'remove-default-style-from-path-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add default style for query parameter', async () => {
      const testId = 'add-default-style-for-query-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove default style from query parameter', async () => {
      const testId = 'remove-default-style-from-query-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add default style for header parameter', async () => {
      const testId = 'add-default-style-for-header-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove default style from header parameter', async () => {
      const testId = 'remove-default-style-from-header-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add default style for cookie parameter', async () => {
      const testId = 'add-default-style-for-cookie-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove default style from cookie parameter', async () => {
      const testId = 'remove-default-style-from-cookie-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Add allowReserved attribute with default value for query parameter', async () => {
      const testId = 'add-allowReserved-attribute-with-default-value-for-query-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })

    test('Remove allowReserved attribute with default value from query parameter', async () => {
      const testId = 'remove-allowReserved-attribute-with-default-value-from-query-parameter'
      const result = await compareFiles(SUITE_ID, testId)
      expect(result).toEqual([])
    })
  })
})
