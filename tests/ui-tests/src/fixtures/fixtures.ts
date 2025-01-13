/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable no-empty-pattern */
import { type Page, test as base } from '@playwright/test'
import { getAuthDataFromStorageStateFile } from '@services/auth'
import { SS_SYSADMIN_PATH, SS_USER1_PATH } from '@services/storage-state'
import { createRest, type Rest } from '@services/rest'
import {
  type AgentTestDataManager,
  type ApihubTestDataManager,
  createAgentTDM,
  createApihubTDM,
  createUsersTDM,
  type UsersTestDataManager,
} from '@services/test-data-manager'
import { BASE_ORIGIN } from '@test-setup'

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
    const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
    const rest = await createRest(BASE_ORIGIN, authData.token)
    await use(rest)
  },

  usersTDM: async ({}, use) => {
    const creator = await createUsersTDM(SS_SYSADMIN_PATH)
    await use(creator)
  },

  apihubTDM: async ({}, use) => {
    const creator = await createApihubTDM(SS_SYSADMIN_PATH)
    await use(creator)
  },

  apihubTdmLongTimeout: async ({}, use) => {
    const creator = await createApihubTDM(SS_SYSADMIN_PATH, 600000)
    await use(creator)
  },

  agentTDM: async ({}, use) => {
    const creator = await createAgentTDM()
    await use(creator)
  },

  sysadminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: SS_SYSADMIN_PATH })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  user1Page: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: SS_USER1_PATH })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
