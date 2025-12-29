import { test } from '@fixtures'
import { createApihubTDM, createUsersTDM } from '@services/test-data-manager'
import { logEnvVars, setNonReusableTestId, setReusableTestId, stringifyError } from '@services/utils'
import { ROOT_DOWNLOADS } from '@shared/entities'
import { SYSADMIN, TEST_PREFIX } from '@test-data'
import { mkdir } from 'fs/promises'
import path from 'path'

test('APIHUB Global Setup', async () => {
  await test.step('Print environment variables', async () => {
    logEnvVars([
      'BASE_URL',
      'PLAYGROUND_BACKEND_HOST',
      'DEV_PROXY_MODE',
      'TICKET_SYSTEM_URL',
      // AUTH is deprecated: legacy auth toggle kept temporarily until old auth logic is removed.
      'AUTH',
      'CREATE_TD',
      'CLEAR_TD',
      'TEST_ID_R',
      'TEST_ID_N',
      'ADV_FILE',
    ])
  })

  await test.step('Verify Test Prefix', async () => {
    if (!/^[a-z0-9]+-$/ig.test(TEST_PREFIX)) {
      throw new Error(`Test Prefix is "${TEST_PREFIX}"\nBut must contain only letters, numbers and end with "-".`)
    }
  })

  await test.step('Set test IDs', async () => {
    await setReusableTestId()
    await setNonReusableTestId()
  })

  await test.step('Create temp directories', async () => {
    try {
      await mkdir(path.resolve(ROOT_DOWNLOADS), { recursive: true })
    } catch (e) {
      throw Error(stringifyError(e))
    }
  })

  await test.step('Create system User', async () => {
    const tdm = await createUsersTDM()
    await tdm.createSysadmin(SYSADMIN)
  })

  // Create Main Workspace, Reusable and Non-Reusable Groups
  await test.step('Create Main Packages', async () => {
    const { IMM_GR, P_WS_MAIN_R, VAR_GR } = await import('@test-data/portal')
    const tdm = await createApihubTDM(SYSADMIN)

    await tdm.createPackage([
      P_WS_MAIN_R,
      IMM_GR,
      VAR_GR,
    ])
  })
})
