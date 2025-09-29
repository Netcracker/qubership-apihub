import { loadFileAsString, LocalRegistry, VERSIONS_PATH } from './helpers'
import { PACKAGE } from '../src'

const GROUP_NAME = 'manualGroup'

const groupToOnePathOperationIdsMap = {
  [GROUP_NAME]: [
    'path1-get',
    'path1-post',
  ],
}

describe('Hash test', () => {
  describe('Document group hash', () => {
    async function publishAndGetHash(packagePath: string): Promise<void> {
      const pkg = LocalRegistry.openPackage(packagePath, groupToOnePathOperationIdsMap)
      await pkg.publish(pkg.packageId, { packageId: pkg.packageId })

      const operationFile = await loadFileAsString(
        VERSIONS_PATH,
        `${pkg.packageId}/v1`,
        `${PACKAGE.OPERATIONS_FILE_NAME}`,
      )
      expect(operationFile).not.toBeNull()

      const operationData = JSON.parse(operationFile!)

      expect(operationData.operations.length).toBe(2)
      expect(operationData.operations[0]).not.toEqual(operationData.operations[1])
    }

    test('should be different hashes for each operation', async () => {
      await publishAndGetHash('hash/different-hashes-for-each-operation')
    })

    test('should be different hashes for each pathitems operation', async () => {
      await publishAndGetHash('hash/different-hashes-for-each-pathitems-operation')
    })
  })
})
