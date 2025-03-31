import { errorNotificationMatcher, LocalRegistry, notificationsMatcher } from './helpers'
import { VALIDATION_RULES_SEVERITY_LEVEL_ERROR } from '../src'

describe('Reference bundling test', () => {
  test('should bundle external references', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case1')
    const result = await pkg.publish(pkg.packageId)

    expect(result.documents.get('openapi.yaml')?.dependencies).toEqual(['reference.yaml'])
  })

  test('should throw on missing external reference if error severity level configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case2')

    await expect(
      pkg.publish(pkg.packageId, { validationRulesSeverity: { brokenRefs: VALIDATION_RULES_SEVERITY_LEVEL_ERROR } }),
    ).rejects.toThrow(/does not exist/)
  })

  test('should collect missing external reference notifications if severity level is not configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case2')
    const result = await pkg.publish(pkg.packageId)

    expect(result).toEqual(notificationsMatcher([
      errorNotificationMatcher('references an invalid location'),
      errorNotificationMatcher('does not exist'),
    ]))
    expect(result.operations.size).toBe(1)
    expect(result.documents.get('openapi.yaml')?.dependencies.length).toBe(0)
  })

  test('should bundle transitive external references', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case3')
    const result = await pkg.publish(pkg.packageId)

    expect(result.documents.get('openapi.yaml')?.dependencies).toEqual([
      'reference.yaml',
      'transitive-reference.yaml',
    ])
  })

  test('should throw on missing transitive external reference if error severity level configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case4')

    await expect(
      pkg.publish(pkg.packageId, { validationRulesSeverity: { brokenRefs: VALIDATION_RULES_SEVERITY_LEVEL_ERROR } }),
    ).rejects.toThrow(/does not exist/)
  })

  test('should collect notifications when transitive external reference is missing if severity level is not configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case4')
    const result = await pkg.publish(pkg.packageId)

    expect(result).toEqual(notificationsMatcher([
      errorNotificationMatcher('references an invalid location'),
      errorNotificationMatcher('does not exist'),
    ]))
    expect(result.operations.size).toBe(1)
    expect(result.documents.get('openapi.yaml')?.dependencies).toEqual(['reference.yaml'])
  })

  test('should throw on missing internal reference if error severity level configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case5')

    await expect(
      pkg.publish(pkg.packageId, { validationRulesSeverity: { brokenRefs: VALIDATION_RULES_SEVERITY_LEVEL_ERROR } }),
    ).rejects.toThrow(/references an invalid location/)
  })

  test('should collect missing internal reference notification if severity level is not configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case5')
    const result = await pkg.publish(pkg.packageId)

    expect(result).toEqual(notificationsMatcher([errorNotificationMatcher('references an invalid location')]))
    expect(result.operations.size).toBe(1)
  })

  test('should throw on non-textual external reference if error severity level configured', async () => {
    const pkg = LocalRegistry.openPackage('reference-bundling/case6')
    await expect(
      pkg.publish(pkg.packageId, { validationRulesSeverity: { brokenRefs: VALIDATION_RULES_SEVERITY_LEVEL_ERROR } }),
    ).rejects.toThrow(/not a valid text file/)
  })
})
