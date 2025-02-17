import { test } from '@fixtures'
import { createUsersTDM } from '@services/test-data-manager'
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
