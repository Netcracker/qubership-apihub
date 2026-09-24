import { test } from '@fixtures'
import { createUsersTDM } from '@services/test-data-manager'
import { DRAFT_VERSION_STATUS } from '@shared/entities'
import { TEST_CLOUD, TEST_NAMESPACE_1, TEST_SERVICE, TEST_SERVICE2 } from '@test-data/agent'
import { readFileSync, writeFileSync } from 'fs'
import { formatNamespaceData, removeObjectsWithField, sortByField } from './helpers'
import { SYSADMIN } from '@test-data'
import { FILE_P_GQL_SMALL, FILE_P_PETSTORE30 } from '@test-data/portal'

test.describe('Main', () => {
  test('Get token', async () => {
  })
})

test.describe('Packages', () => {

  test('Create Package', async ({ apihubTDM: tdm }) => {
    await tdm.createPackage({
      name: 'Playwright Package',
      parentId: '',
      alias: '',
      kind: 'package',
      // serviceName: '',
    })
  })

  test('Favor Package', async ({ apihubTDM: tdm }) => {
    await tdm.favorPackage({
      name: '',
      packageId: '',
    })
  })

  test('Create Group', async ({ apihubTDM: tdm }) => {
    await tdm.createPackage({
      name: 'Test Workspace',
      parentId: '',
      alias: '',
      kind: 'workspace',
    })
  })

  test('Publish', async ({ apihubTDM: tdm }) => {
    await tdm.publishVersion({
      pkg: { packageId: '' },
      version: 'GlobalSearch',
      status: 'draft',
      files: [
        { file: FILE_P_PETSTORE30 },
        { file: FILE_P_GQL_SMALL },
      ],
    })
  })

  test('Publish dashboard', async ({ apihubTDM: tdm }) => {
    await tdm.publishVersion({
      pkg: { packageId: '' },
      version: 'nested-dashboard',
      status: 'draft',
      refs: [{ refId: '', version: '2300.1' }],
    })
  })
})

test.describe('Users', () => {

  test('Create User', async () => {
    const tdm = await createUsersTDM()
    await tdm.createGeneralUser({
      email: 'x_atui_super_admin2@qa.at',
      name: 'x_ATUI_Super_Admin',
      password: '12345',
    })
  })

  test('Delete User', async ({ apihubTDM: tdm }) => {
    await tdm.deleteUser('x_atui_user1atqa-at')
  })

  test('Add Sysadmin', async ({ apihubTDM: tdm }) => {
    await tdm.addSysadmin('x_atui_sysadminatqa-at')
  })

  test('Delete Sysadmin', async ({ apihubTDM: tdm }) => {
    await tdm.deleteSysadmin('x_atui_super_admin2atqa-at')
  })

  test('Create Sysadmin', async () => {
    const tdm = await createUsersTDM()
    await tdm.createSysadmin(SYSADMIN)
  })
})

test.describe('Agent', () => {

  test('Promote version for two services', async ({ agentTDM: tdm }) => {
    await tdm.createSnapshot({
      agentId: TEST_CLOUD,
      namespace: TEST_NAMESPACE_1,
      promote: true,
      version: 'ATUI_two-services',
      previousVersion: '',
      services: [TEST_SERVICE, TEST_SERVICE2],
      status: DRAFT_VERSION_STATUS,
    })
  })

  test('Discover namespace', async ({ agentTDM: tdm }) => {
    test.setTimeout(7200_000)
    const namespaces = await tdm.getNamespaces({ cloud: '' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = []
    for (const namespace of namespaces) {
      const formattedItem = formatNamespaceData(await tdm.discoverNamespaceWithData({
        cloud: '',
        namespace: namespace,
        workspaceId: '',
      }))
      result.push(formattedItem)
      writeFileSync('./temp/namespaces.json', JSON.stringify(result, null, 2))
    }
    console.log(result)
    console.log(namespaces)
  })

  test('Sort namespaces', async () => {
    const namespaces = JSON.parse(readFileSync('./temp/namespaces.json', 'utf-8'))
    namespaces.sort(sortByField('time'))
    let result
    result = removeObjectsWithField(namespaces, 'noTestService')
    result = removeObjectsWithField(result, 'noBackEndService')

    writeFileSync('./temp/namespaces-sorted.json', JSON.stringify(result, null, 2))
    console.log(result)
  })
})
