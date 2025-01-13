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

import type { Credentials } from '@shared/entities'
import type { AuthData } from '@services/auth'
import { getAuthDataFromAPI } from '@services/auth'
import { SS_PATH_PREFIX, StorageState } from '@services/storage-state'
import { chromium } from '@playwright/test'
import { LoginPage } from '@shared/pages/LoginPage'
import { BASE_ORIGIN, BASE_URL, PAGE_LOADING, SEARCH_TIMEOUT } from '@test-setup'
import process from 'process'
import { newPage } from '@services/utils'

export async function saveSsFileByLocalViaAPI(credentials: Credentials): Promise<void> {

  const authData: AuthData = await getAuthDataFromAPI(BASE_ORIGIN, credentials)
  const ss = new StorageState()
  ss.setOrigin(BASE_ORIGIN)
  ss.setAuthData(authData)
  await ss.saveToFile(`${SS_PATH_PREFIX}${BASE_URL.hostname}-${credentials.email}.json`)

  console.log(`\nDebug: "${BASE_URL.hostname}"-"${credentials.email}" Storage State file has been saved via API`)
}

export async function saveSsFileByLocalViaBrowser(credentials: Credentials): Promise<void> {

  const browser = await chromium.launch(({
    channel: process.env.CI ? 'chrome' : undefined,
    executablePath: process.env.CI ? './chrome-linux/chrome' : undefined,
    headless: !!process.env.CI,
  }))
  const page = await browser.newPage()
  await page.goto(`${BASE_ORIGIN}/login`)
  const loginPage = new LoginPage(page)
  await loginPage.signIn(credentials)
  await page.waitForLoadState('networkidle')
  await page.context().storageState({ path: `${SS_PATH_PREFIX}${BASE_URL.hostname}-${credentials.email}.json` })
  await browser.close()

  console.log(`\nDebug: "${BASE_URL.hostname}"-"${credentials.email}" Storage State file has been saved via Browser (Local Auth)\n`)
}

export async function saveSsFileBySsoViaBrowser(credentials: Credentials): Promise<void> {

  const browser = await chromium.launch({
    channel: process.env.CI ? 'chrome' : undefined,
    chromiumSandbox: true,
    executablePath: process.env.CI ? './chrome-linux/chrome' : undefined,
    headless: !!process.env.CI,
  })
  const page = await newPage(browser, credentials)
  await page.goto(BASE_ORIGIN, { waitUntil: 'networkidle', timeout: PAGE_LOADING })
  for (let i = 0; i < 10; i++) {
    const ss = await page.context().storageState()
    if (ss.cookies.length !== 0 && ss.origins.length !== 0) {
      break
    }
    await page.waitForTimeout(SEARCH_TIMEOUT.middle)
  }

  await page.context().storageState({ path: `${SS_PATH_PREFIX}${BASE_URL.hostname}-${credentials.email}.json` })
  await page.close()

  console.log(`\nDebug: "${BASE_URL.hostname}"-"${credentials.email}" Storage State file has been saved via Browser (SSO)\n`)
}
