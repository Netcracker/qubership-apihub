import { test } from '@fixtures'
import { isReusableTestDataExist } from '@test-data/utils'
import { CREATE_TD } from '@test-setup'
import {
  A_WS_R,
  A_WS_N,
  A_GR_APIHUB,
  A_GR_APIHUB_R,
  A_GR_SUB,
  A_GR_SUB_R,
  A_WS_DEFAULT,
  A_GR_PRODUCT_R,
  TEST_CLOUD,
  TEST_NAMESPACE_2,
  TEST_SERVICE_1,
  TEST_SERVICE_1_IMM,
  TEST_SERVICE_2,
  TEST_SERVICE_2_IMM,
  PK_A_UPLOAD_R,
  V_A_ANNOTUNCLAS,
  V_A_MULTI_CHANGES,
  V_A_NO_CHANGES,
  V_A_NON_BREAKING,
} from '@test-data/agent'

test.describe.configure({ mode: 'serial', retries: 0 })

test.describe('Default Test Data creation', async () => {
  test.skip(CREATE_TD === 'skip', 'Test Data creation is skipped')

  let isReusableTdExist!: boolean

  test.beforeAll(async () => {
    isReusableTdExist = await isReusableTestDataExist('default')
  })

  test('Test Entities creation', async ({ apihubTDM: tdm }) => {
    test.skip(isReusableTdExist, 'Default Test Data is already exist')

    await test.step('Create Workspace', async () => {
      await tdm.createPackage(A_WS_DEFAULT)
    })

    await test.step('Create Groups', async () => {
      const groups = [A_GR_SUB, A_GR_APIHUB]
      for (const group of groups) {
        await tdm.createPackage(group)
      }
    })

    await test.step('Create Packages', async () => {
      const packages = [TEST_SERVICE_1, TEST_SERVICE_2]
      for (const pkg of packages) {
        await tdm.createPackage(pkg)
      }
    })
  })
})

test.describe('Reusable Test Data creation', async () => {
  test.skip(CREATE_TD === 'skip', 'Test Data creation is skipped')

  let isReusableTdExist!: boolean

  test.beforeAll(async () => {
    isReusableTdExist = await isReusableTestDataExist('agent')
  })

  test('Test Entities creation', async ({ apihubTDM: tdm }) => {
    test.skip(isReusableTdExist, 'Reusable Test Data is already exist')

    await test.step('Create Workspace', async () => {
      await tdm.createPackage(A_WS_R)
    })

    await test.step('Create Groups', async () => {
      const groups = [A_GR_PRODUCT_R, A_GR_SUB_R, A_GR_APIHUB_R]
      for (const group of groups) {
        await tdm.createPackage(group)
      }
    })

    await test.step('Create Packages', async () => {
      const packages = [TEST_SERVICE_1_IMM, TEST_SERVICE_2_IMM, PK_A_UPLOAD_R]
      for (const pkg of packages) {
        await tdm.createPackage(pkg)
      }
    })
  })

  test('Empty upload package creation', async ({ apihubTDM: tdm }) => {
    await tdm.createPackage(PK_A_UPLOAD_R)
  })

  test('Test Versions creation', async ({ apihubTDM: tdm }) => {
    test.skip(isReusableTdExist, 'Reusable Test Data is already exist')

    await test.step('Publish Versions', async () => {
      const versions = [V_A_NO_CHANGES, V_A_MULTI_CHANGES, V_A_NON_BREAKING, V_A_ANNOTUNCLAS]
      for (const version of versions) {
        await tdm.publishVersion(version)
      }
    })
  })

  test('Discover namespace for reusable workspace', async ({ agentTDM: tdm }) => {
    await tdm.discoverNamespace({
      cloud: TEST_CLOUD,
      namespace: TEST_NAMESPACE_2,
      workspaceId: A_WS_R.packageId,
    })
  })
})

test.describe('Non-Reusable Test Data creation', async () => {
  test.skip(CREATE_TD === 'skip', 'Test Data creation is skipped')

  test('Test Entities creation', async ({ apihubTDM: tdm }) => {

    await test.step('Create Workspace', async () => {
      await tdm.createPackage(A_WS_N)
    })
  })
})
