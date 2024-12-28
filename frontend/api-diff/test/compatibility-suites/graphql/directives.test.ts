import { compareFiles } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, deprecated, DiffAction, nonBreaking, unclassified } from '../../../src'
import { TEST_SPEC_TYPE_GRAPH_QL } from '@netcracker/qubership-apihub-compatibility-suites'
import { COMPARE_SCOPE_COMPONENTS, COMPARE_SCOPE_DIRECTIVE_USAGES, COMPARE_SCOPE_OUTPUT } from '../../../src/graphapi'

const SUITE_ID = 'directives'

describe('GraphQL Directives', () => {
  test('add default deprecated directive for field definition', async () => {
    const testId = 'add-default-deprecated-directive-for-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components','objects','Fruit','type','methods','name','directives','deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('remove default deprecated directive for field definition', async () => {
    const testId = 'remove-default-deprecated-directive-for-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components','objects','Fruit','type','methods','name','directives','deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add default deprecated directive for enum value', async () => {
    const testId = 'add-default-deprecated-directive-for-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add deprecated directive with reason for enum value', async () => {
    const testId = 'add-deprecated-directive-with-reason-for-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('remove deprecated directive from enum value', async () => {
    const testId = 'remove-deprecated-directive-from-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('remove deprecated directive with reason from enum value', async () => {
    const testId = 'remove-deprecated-directive-with-reason-from-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add reason for deprecated directive', async () => {
    const testId = 'add-reason-for-deprecated-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated', 'meta', 'reason']],
        beforeDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated', 'meta', 'reason']],
        type: annotation,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('update reason for deprecated directive', async () => {
    const testId = 'update-reason-for-deprecated-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated', 'meta', 'reason']],
        beforeDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'apple', 'directives', 'deprecated', 'meta', 'reason']],
        type: annotation,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('remove reason for deprecated directive', async () => {
    const testId = 'remove-reason-for-deprecated-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'banana', 'directives', 'deprecated', 'meta', 'reason']],
        beforeDeclarationPaths: [['components', 'enums', 'FruitType', 'type', 'values', 'banana', 'directives', 'deprecated', 'meta', 'reason']],
        type: annotation,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add schema directive with no usage', async () => {
    const testId = 'add-schema-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('delete schema directive with no usage', async () => {
    const testId = 'delete-schema-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('add argument for schema directive with no usage', async () => {
    const testId = 'add-argument-for-schema-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('delete argument for schema directive with no usage', async () => {
    const testId = 'delete-argument-for-schema-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('add argument default value of schema directive with no usage', async () => {
    const testId = 'add-argument-default-value-of-schema-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('update argument default value of schema directive with no usage', async () => {
    const testId = 'update-argument-default-value-of-schema-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('delete argument default value of schema directive with no usage', async () => {
    const testId = 'delete-argument-default-value-of-schema-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual([])
  })
  test('add executable directive with no usage', async () => {
    const testId = 'add-executable-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'directives', 'limit']],
        type: nonBreaking,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('delete executable directive with no usage', async () => {
    const testId = 'delete-executable-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'directives', 'limit']],
        type: breaking,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('add argument for executable directive with no usage', async () => {
    const testId = 'add-argument-for-executable-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset']],
        type: unclassified,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('delete argument in executable directive with no usage', async () => {
    const testId = 'delete-argument-in-executable-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset']],
        type: breaking,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('add argument default value of executable directive with no usage', async () => {
    const testId = 'add-argument-default-value-of-executable-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset', 'default']],
        type: unclassified,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('update argument default value of executable directive with no usage', async () => {
    const testId = 'update-argument-default-value-of-executable-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset', 'default']],
        afterDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset', 'default']],
        type: unclassified,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('delete argument default value of executable directive with no usage', async () => {
    const testId = 'delete-argument-default-value-of-executable-directive-with-no-usage'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset', 'default']],
        type: unclassified,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('apply schema directive to scalar', async () => {
    const testId = 'apply-schema-directive-to-scalar'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'scalars', 'Count', 'directives', 'multipleOf']],
        type: unclassified, 
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to object', async () => {
    const testId = 'apply-schema-directive-to-object'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'objects', 'Fruit', 'directives', 'sort']],
        type: unclassified, 
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to field definition', async () => {
    const testId = 'apply-schema-directive-to-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'id', 'directives', 'sort']],
        type: unclassified, 
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to argument definition', async () => {
    const testId = 'apply-schema-directive-to-argument-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['queries', 'fruits', 'args', 'id', 'directives', 'sort']],
        type: unclassified, 
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to interface', async () => {
    const testId = 'apply-schema-directive-to-interface'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'interfaces', 'Fruit', 'directives', 'sort']],
        type: unclassified, 
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to union', async () => {
    const testId = 'apply-schema-directive-to-union'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'unions', 'Fruit', 'directives', 'sort']],
        type: unclassified,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to enum', async () => {
    const testId = 'apply-schema-directive-to-enum'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'enums', 'Season', 'directives', 'sort']],
        type: unclassified,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to input object', async () => {
    const testId = 'apply-schema-directive-to-input-object'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'inputObjects', 'Fruit', 'directives', 'sort']],
        type: unclassified,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to input field definition', async () => {
    const testId = 'apply-schema-directive-to-input-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'inputObjects', 'Fruit', 'type', 'properties', 'id', 'directives', 'sort']],
        type: unclassified,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add argument for schema directive', async () => {
    const testId = 'add-argument-for-schema-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset']],
        type: nonBreaking, //what if you add to directive @sorted -> @sorted(enable: false). This is a breaking change
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('delete argument for schema directive', async () => {
    const testId = 'delete-argument-for-schema-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset']],
        type: nonBreaking, // todo need more anlisys
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add argument default value for schema directive', async () => {
    const testId = 'add-argument-default-value-for-schema-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [ ['components', 'directives', 'limit', 'args', 'offset', 'default']],
        type: nonBreaking, // todo need more anlisys
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('update argument default value for schema directive', async () => {
    const testId = 'update-argument-default-value-for-schema-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset', 'default']],
        afterDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset', 'default']],
        type: nonBreaking, // todo need more anlisys
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('delete argument default value for schema directive', async () => {
    const testId = 'delete-argument-default-value-for-schema-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'args', 'offset', 'default']],
        type: nonBreaking, // todo need more anlisys
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add new schema location to directive', async () => {
    const testId = 'add-new-schema-location-to-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'directives', 'limit', 'locations', 1]],
        type: nonBreaking, 
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('delete schema location in directive', async () => {
    const testId = 'delete-schema-location-in-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'locations', 1]],
        type: nonBreaking, 
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('add executable location to directive', async () => {
    const testId = 'add-executable-location-to-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'directives', 'limit', 'locations', 1]],
        type: nonBreaking,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('delete executable location to directive', async () => {
    const testId = 'delete-executable-location-to-directive'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'directives', 'limit', 'locations', 1]],
        type: breaking,
        scope: COMPARE_SCOPE_COMPONENTS
      }),
    ]))
  })
  test('add reason of deprecated directive in field definition', async () => {
    const testId = 'add-reason-of-deprecated-directive-in-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated', 'meta', 'reason']],
        beforeDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated', 'meta', 'reason']],
        type: annotation,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ])) 
  })
  test('remove reason of deprecated directive in field definition', async () => {
    const testId = 'remove-reason-of-deprecated-directive-in-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        afterDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated', 'meta', 'reason']],
        beforeDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated', 'meta', 'reason']],
        type: annotation,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ])) 
  })
  test('add deprecated directive with reason for field definition', async () => {
    const testId = 'add-deprecated-directive-with-reason-for-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('remove deprecated directive with reason in field definition', async () => {
    const testId = 'remove-deprecated-directive-with-reason-in-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated']],
        type: deprecated,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ])) 
  })
  test('update reason for deprecated directive in field definition', async () => {
    const testId = 'update-reason-for-deprecated-directive-in-field-definition'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated', 'meta', 'reason']],
        afterDeclarationPaths: [['components', 'objects', 'Fruit', 'type', 'methods', 'name', 'directives', 'deprecated', 'meta', 'reason']],
        type: annotation,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
  test('apply schema directive to enum value', async () => {
    const testId = 'apply-schema-directive-to-enum-value'
    const result = await compareFiles(SUITE_ID, testId, TEST_SPEC_TYPE_GRAPH_QL)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'enums', 'Season', 'type', 'values', 'FALL', 'directives', 'sort']],
        type: unclassified,
        scope: COMPARE_SCOPE_DIRECTIVE_USAGES
      }),
    ]))
  })
})
