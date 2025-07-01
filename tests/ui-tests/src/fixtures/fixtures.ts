/* eslint-disable no-empty-pattern */
import { type Page, test as base } from '@playwright/test'
import { createRestWithCredentials, type Rest } from '@services/rest'
import { type AgentTestDataManager, type ApihubTestDataManager, createAgentTDM, createApihubTDM, createUsersTDM, type UsersTestDataManager } from '@services/test-data-manager'
import { BASE_URL } from '@test-setup'
import { SYSADMIN, TEST_USER_1 } from '@test-data'
import { createUserStorageStateWithAuthCookieFromApi } from '@services/storage-state/save'

export type Fixtures = {

  restApihub: Rest

  usersTDM: UsersTestDataManager
  apihubTDM: ApihubTestDataManager
  apihubTdmLongTimeout: ApihubTestDataManager
  agentTDM: AgentTestDataManager

  sysadminPage: Page
  user1Page: Page
}

export const test = base.extend<Fixtures>({

  restApihub: async ({}, use) => {
    const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
    await use(rest)
  },

  usersTDM: async ({}, use) => {
    const creator = await createUsersTDM(SYSADMIN)
    await use(creator)
  },

  apihubTDM: async ({}, use) => {
    const creator = await createApihubTDM(SYSADMIN)
    await use(creator)
  },

  apihubTdmLongTimeout: async ({}, use) => {
    const creator = await createApihubTDM(SYSADMIN, 600000)
    await use(creator)
  },

  agentTDM: async ({}, use) => {
    const creator = await createAgentTDM()
    await use(creator)
  },

  sysadminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: await createUserStorageStateWithAuthCookieFromApi(SYSADMIN) })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  user1Page: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: await createUserStorageStateWithAuthCookieFromApi(TEST_USER_1) })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
