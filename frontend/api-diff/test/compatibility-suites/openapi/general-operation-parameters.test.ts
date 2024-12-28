import { compareFiles, TEST_DEFAULTS_DECLARATION_PATHS } from '../utils'
import { diffsMatcher } from '../../helper/matchers'
import { annotation, breaking, deprecated, DiffAction, nonBreaking } from '../../../src'

const SUITE_ID = 'general-operation-parameters'
const COMMON_PATH1_GET = ['paths', '/path1', 'get']
const COMMON_PATH1_POST = ['paths', '/path1', 'post']

describe('Openapi3 General Operation Parameters', () => {

  test('Add new path', async () => {
    const testId = 'add-new-path'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/path2']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Remove path', async () => {
    const testId = 'remove-path'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/path2']],
        type: breaking,
      }),
    ]))
  })

  test('Add new method', async () => {
    const testId = 'add-new-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/path1', 'post']],
        type: nonBreaking,
      }),
    ]))
  })

  test('Remove method', async () => {
    const testId = 'remove-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/path1', 'post']],
        type: breaking,
      }),
    ]))
  })

  test('Add tag', async () => {
    const testId = 'add-tag'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'tags', 0]],
        type: annotation,
      }),
    ]))
  })

  test('Remove tag', async () => {
    const testId = 'remove-tag'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'tags', 0]],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['tags']],
        type: annotation,
      }),
    ]))
  })

  test('Update operation summary', async () => {
    const testId = 'update-operation-summary'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'summary']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'summary']],
        type: annotation,
      }),
    ]))
  })

  test('Add operation description', async () => {
    const testId = 'add-operation-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update operation description', async () => {
    const testId = 'update-operation-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'description']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove operation description', async () => {
    const testId = 'remove-operation-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Add operation external doc', async () => {
    const testId = 'add-operation-external-doc'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs']],
        type: annotation,
      }),
    ]))
  })

  test('Remove operation external doc', async () => {
    const testId = 'remove-operation-external-doc'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs']],
        type: annotation,
      }),
    ]))
  })

  test('Update url of operation external doc', async () => {
    const testId = 'update-url-of-operation-external-doc'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs', 'url']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs', 'url']],
        type: annotation,
      }),
    ]))
  })

  test('Add description of operation external doc', async () => {
    const testId = 'add-description-of-operation-external-doc'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update description of operation external doc', async () => {
    const testId = 'update-description-of-operation-external-doc'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs', 'description']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove description of operation external doc', async () => {
    const testId = 'remove-description-of-operation-external-doc'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'externalDocs', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Add operationId value', async () => {
    const testId = 'add-operationId-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'operationId']],
        type: annotation,
      }),
    ]))
  })

  test('Update operationId value', async () => {
    const testId = 'update-operationId-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'operationId']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'operationId']],
        type: annotation,
      }),
    ]))
  })

  test('Remove operationId value', async () => {
    const testId = 'remove-operationId-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'operationId']],
        type: annotation,
      }),
    ]))
  })

  test('Add deprecated value', async () => {
    const testId = 'add-deprecated-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'deprecated']],
        type: deprecated,
      }),
    ]))
  })

  test('Remove deprecated value', async () => {
    const testId = 'remove-deprecated-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'deprecated']],
        afterDeclarationPaths: TEST_DEFAULTS_DECLARATION_PATHS,
        type: deprecated,
      }),
    ]))
  })

  test('Update deprecated value', async () => {
    const testId = 'update-deprecated-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'deprecated']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'deprecated']],
        type: deprecated,
      }),
    ]))
  })

  test('Add server url', async () => {
    const testId = 'add-server-url'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers']],
        type: annotation,
      }),
    ]))
  })

  test('Update server url', async () => {
    const testId = 'update-server-url'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'url']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'url']],
        type: annotation,
      }),
    ]))
  })

  test('Remove server url', async () => {
    const testId = 'remove-server-url'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers']],
        type: annotation,
      }),
    ]))
  })

  test('Add server description', async () => {
    const testId = 'add-server-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update server description', async () => {
    const testId = 'update-server-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'description']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove server description', async () => {
    const testId = 'remove-server-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Add variable', async () => {
    const testId = 'add-variable'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'url']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'url']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables']],
        type: annotation,
      }),
    ]))
  })

  test('Remove variable', async () => {
    const testId = 'remove-variable'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'url']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'url']],
        type: annotation,
      }),
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables']],
        type: annotation,
      }),
    ]))
  })

  test('Update variable default value', async () => {
    const testId = 'update-variable-default-value'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'default']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'default']],
        type: annotation,
      }),
    ]))
  })

  test('Add variable enum', async () => {
    const testId = 'add-variable-enum'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'enum']],
        type: annotation,
      }),
    ]))
  })

  test('Update variable enum', async () => {
    const testId = 'update-variable-enum'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'enum', 2]],
        type: annotation,
      }),
    ]))
  })

  test('Remove variable enum', async () => {
    const testId = 'remove-variable-enum'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'enum']],
        type: annotation,
      }),
    ]))
  })

  test('Add server variable description', async () => {
    const testId = 'add-server-variable-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Update server variable description', async () => {
    const testId = 'update-server-variable-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'description']],
        afterDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Remove server variable description', async () => {
    const testId = 'remove-server-variable-description'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_GET, 'servers', 0, 'variables', 'username', 'description']],
        type: annotation,
      }),
    ]))
  })

  test('Add security with authentication method', async () => {
    const testId = 'add-security-with-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_POST, 'security']],
        type: breaking,
      }),
    ]))
  })

  test('Add alternative authentication method', async () => {
    const testId = 'add-alternative-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 1]],
        type: nonBreaking,
      }),
    ]))
  })

  test('Add mandatory authentication method', async () => {
    const testId = 'add-mandatory-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 0, 'ApiKeyAuth2']],
        type: breaking,
      }),
    ]))
  })

  test('Remove alternative authentication method', async () => {
    const testId = 'remove-alternative-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 1]],
        type: breaking,
      }),
    ]))
  })

  test('Remove mandatory authentication method', async () => {
    const testId = 'remove-mandatory-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 0, 'ApiKeyAuth2']],
        type: breaking,
      }),
    ]))
  })

  test('Remove security with authentication method', async () => {
    const testId = 'remove-security-with-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_POST, 'security']],
        type: breaking,
      }),
    ]))
  })

  test('Add scope for authentication method', async () => {
    const testId = 'add-scope-for-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 0, 'oAuthSample', 0]],
        type: breaking,
      }),
    ]))
  })

  test('Update scope for authentication method', async () => {
    const testId = 'update-scope-for-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.remove,
          beforeDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 0, 'oAuthSample', 0]],
          type: nonBreaking,
        }),
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 0, 'oAuthSample', 0]],
          type: breaking,
        }),
      ],
    ))
  })

  test('Remove scope for authentication method', async () => {
    const testId = 'remove-scope-for-authentication-method'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [[...COMMON_PATH1_POST, 'security', 0, 'oAuthSample', 0]],
        type: nonBreaking,
      }),
    ]))
  })

  // No changes
  test.skip('Add custom property in path', async () => {
    const testId = 'add-custom-property-in-path'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/pets', 'x-feature-flag']],
        type: nonBreaking,
      }),
    ]))
  })

  // No changes
  test.skip('Update custom property in path', async () => {
    const testId = 'update-custom-property-value-in-path'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/pets', 'x-feature-flag']],
        afterDeclarationPaths: [['paths', '/pets', 'x-feature-flag']],
        type: nonBreaking,
      }),
    ]))
  })

  // No changes
  test.skip('Remove custom property in path', async () => {
    const testId = 'remove-custom-property-in-path'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/pets', 'x-feature-flag']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (annotation)
  test.skip('Add custom property in operation', async () => {
    const testId = 'add-custom-property-in-operation'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (annotation)
  test.skip('Update custom property value in operation', async () => {
    const testId = 'update-custom-property-value-in-operation'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use']],
        afterDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (annotation)
  test.skip('Remove custom property in operation', async () => {
    const testId = 'remove-custom-property-in-operation'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Add custom property in security schemes', async () => {
    const testId = 'add-custom-property-in-security-schemes'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['components', 'securitySchemes', 'ApiKeyAuth1', 'x-security-level']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Update custom property value in security schemes', async () => {
    const testId = 'update-custom-property-value-in-security-schemes'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['components', 'securitySchemes', 'ApiKeyAuth1', 'x-security-level']],
        afterDeclarationPaths: [['components', 'securitySchemes', 'ApiKeyAuth1', 'x-security-level']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Remove custom property in security schemes', async () => {
    const testId = 'remove-custom-property-in-security-schemes'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['components', 'securitySchemes', 'ApiKeyAuth1', 'x-security-level']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (annotation)
  test.skip('Add new object custom property', async () => {
    const testId = 'add-new-object-custom-property'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use-reason']],
        type: nonBreaking,
      }),
    ]))
  })
  // Wrong classification (unclassified)
  test.skip('Add objects custom property in operation', async () => {
    const testId = 'add-objects-custom-property-in-operation'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.add,
        afterDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use-reason', 'release']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Update objects custom property value in operation', async () => {
    const testId = 'update-objects-custom-property-value-in-operation'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use-reason', 'reason']],
        afterDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use-reason', 'reason']],
        type: nonBreaking,
      }),
    ]))
  })

  // Wrong classification (unclassified)
  test.skip('Remove objects custom property value in operation', async () => {
    const testId = 'remove-objects-custom-property-in-operation'
    const result = await compareFiles(SUITE_ID, testId)
    expect(result).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeDeclarationPaths: [['paths', '/pets', 'get', 'x-internal-use-reason', 'release']],
        type: nonBreaking,
      }),
    ]))
  })
})
