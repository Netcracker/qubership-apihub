/* eslint-disable no-empty-pattern */
import { type Page, test as base } from '@playwright/test'
import { createRestWithCredentials, type Rest } from '@services/rest'
import { createUserStorageStateWithAuthCookieFromApi } from '@services/storage-state/save'
import {
  type AgentTestDataManager,
  type ApihubTestDataManager,
  createAgentTDM,
  createApihubTDM,
  createRulesetsTDM,
  createUsersTDM,
  type LintRulesetsTestDataManager,
  type UsersTestDataManager,
} from '@services/test-data-manager'
import { SYSADMIN, TEST_USER_1 } from '@test-data'
import { BASE_URL } from '@test-setup'
import { existsSync } from 'fs'

/** File registration info for test context tracking */
export type ResourceFileInfo = {
  /** Display name for the attachment */
  name: string
  /** Absolute path to the file */
  path: string
}

/** Helper for registering resource files used in tests; attaches them on failure */
export type UsedResourcesHelper = {
  /** Register a file or array of files to be attached if test fails */
  addFiles: (files: ResourceFileInfo | ResourceFileInfo[]) => void
}

export type Fixtures = {
  restApihub: Rest

  usersTDM: UsersTestDataManager
  apihubTDM: ApihubTestDataManager
  apihubTdmLongTimeout: ApihubTestDataManager
  lintRulesetTdm: LintRulesetsTestDataManager
  agentTDM: AgentTestDataManager

  sysadminPage: Page
  user1Page: Page

  /** Fixture for registering test resource files; auto-attaches on test failure */
  usedResources: UsedResourcesHelper
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

  lintRulesetTdm: async ({}, use) => {
    const creator = await createRulesetsTDM(SYSADMIN)
    await use(creator)
  },

  agentTDM: async ({}, use) => {
    const creator = await createAgentTDM()
    await use(creator)
  },

  sysadminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: await createUserStorageStateWithAuthCookieFromApi(SYSADMIN),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  user1Page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: await createUserStorageStateWithAuthCookieFromApi(TEST_USER_1),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  usedResources: async ({}, use, testInfo) => {
    // Storage for files registered during test execution
    const files: ResourceFileInfo[] = []

    const helper: UsedResourcesHelper = {
      addFiles: (input: ResourceFileInfo | ResourceFileInfo[]): void => {
        const toAdd = Array.isArray(input) ? input : [input]
        files.push(...toAdd)
      },
    }

    // Pass control to test
    await use(helper)

    // Teardown: attach files only if test failed
    if (testInfo.status !== testInfo.expectedStatus) {
      console.log(`Test failed: attaching ${files.length} context file(s).`)

      for (const file of files) {
        try {
          if (existsSync(file.path)) {
            await testInfo.attach(file.name, { path: file.path })
          } else {
            console.warn(`Cannot attach file "${file.name}": path not found - ${file.path}`)
          }
        } catch (error) {
          console.warn(`Failed to attach file "${file.name}":`, error)
        }
      }
    }
  },
})

export { expect } from '@playwright/test'
