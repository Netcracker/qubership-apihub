import { LocalRegistry, VERSIONS_PATH, loadFileAsStringFromRegistry } from './helpers'
import { PACKAGE } from '../src'

describe('Operations of one path item', () => {
  describe('each method of the path item', () => {
    // neither fixture carries a config.json; the version and the file list live here instead
    async function expectOneOperationPerMethod(packagePath: string): Promise<void> {
      const pkg = LocalRegistry.openPackage(packagePath)
      await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: 'v1', files: [{ fileId: 'spec.yaml' }] })

      const operationFile = await loadFileAsStringFromRegistry(
        VERSIONS_PATH,
        `${pkg.packageId}/v1`,
        `${PACKAGE.OPERATIONS_FILE_NAME}`,
      )
      expect(operationFile).not.toBeNull()

      const operationData = JSON.parse(operationFile!)

      // a pathItem `$ref` left unresolved yields no methods, so this count is what fails for it
      expect(operationData.operations.length).toBe(2)
      // the ids name the methods, so this pins which operations the path item produced
      const operationIds = operationData.operations.map(({ operationId }: { operationId: string }) => operationId)
      expect(operationIds.sort()).toEqual(['path1-get', 'path1-post'])
    }

    test('should become an operation of its own', async () => {
      await expectOneOperationPerMethod('path-item-operations/different-hashes-for-each-operation')
    })

    test('should become an operation of its own when the path item is a $ref to components', async () => {
      await expectOneOperationPerMethod('path-item-operations/different-hashes-for-each-path-items-operation')
    })
  })
})
