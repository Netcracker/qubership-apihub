import type { StorageState } from '@services/storage-state/entities'
import { getStorageStatePath } from '@services/storage-state/entities'
import { writeFile } from 'fs/promises'
import { type AuthData, getAuthDataFromApi } from '@services/auth'
import type { Credentials } from '@shared/entities'
import { BASE_URL, PAGE_LOADING } from '@test-setup'
import { chromium, type Page } from '@playwright/test'
import process from 'process'
import { LoginPage } from '@shared/pages'
import { newPage } from '@services/utils'

const COOKIE_EXPIRATION_DATE = 32503680000 // January 1, 3000
const LOGIN_TIMEOUT = 7_000
const WAIT_FOR_STORAGE_STATE_TIMEOUT = 2_000

export const createUserStorageStateWithAuthCookieFromApi = async (credentials: Credentials): Promise<StorageState> => {
  const { token, renewToken } = await getAuthDataFromApi(BASE_URL, credentials)
  return createStorageStateWithAuthCookie(BASE_URL, token, renewToken)
}

/** @deprecated */
export const saveUserStorageStateWithAuthCookieFromApi = async (credentials: Credentials): Promise<void> => {
  const storageState = await createUserStorageStateWithAuthCookieFromApi(credentials)
  await saveUserStorageState(credentials.email, storageState)
}

/** @deprecated */
export const saveUserStorageStateWithLocalStorageFromApi = async (credentials: Credentials): Promise<void> => {
  const authData = await getAuthDataFromApi(BASE_URL, credentials)
  const storageState = createStorageStateWithAuthLocalStorage(BASE_URL, authData)
  await saveUserStorageState(credentials.email, storageState)
}

/** @deprecated */
export const saveUserStorageStateFromBrowserLocal = async (credentials: Credentials): Promise<void> => {

  const browser = await chromium.launch(({
    channel: process.env.CI ? 'chrome' : undefined,
    executablePath: process.env.CI ? './chrome-linux/chrome' : undefined,
    headless: !!process.env.CI,
  }))
  const page = await browser.newPage()
  const loginPage = new LoginPage(page)
  await page.goto(`${BASE_URL.origin}/login`)
  await page.waitForTimeout(LOGIN_TIMEOUT)
  await loginPage.signInNotInTest(credentials)
  await waitForStorageState(page)
  await page.context().storageState({ path: getStorageStatePath(credentials.email) })
  await browser.close()

  console.log(`\nDebug: "${BASE_URL.hostname}"-"${credentials.email}" Storage State file has been saved via Browser (Local Auth)\n`)
}

/** @deprecated */
export const saveUserStorageStateFromBrowserSso = async (credentials: Credentials): Promise<void> => {

  const browser = await chromium.launch({
    channel: process.env.CI ? 'chrome' : undefined,
    chromiumSandbox: true,
    executablePath: process.env.CI ? './chrome-linux/chrome' : undefined,
    headless: !!process.env.CI,
  })
  const page = await newPage(browser, credentials)
  await page.goto(BASE_URL.origin, { timeout: PAGE_LOADING })
  await waitForStorageState(page)
  await page.context().storageState({ path: getStorageStatePath(credentials.email) })
  await page.close()

  console.log(`\nDebug: "${BASE_URL.hostname}"-"${credentials.email}" Storage State file has been saved via Browser (SSO)\n`)
}

async function saveUserStorageState(login: string, storageState: StorageState): Promise<void> {
  const path = getStorageStatePath(login)
  await saveStorageStateToFile(path, storageState)
  console.log(`\nDebug: "${BASE_URL.hostname}"-"${login}" Storage State file has been saved via API`)
}

async function saveStorageStateToFile(path: string, storageState: StorageState): Promise<void> {
  await writeFile(path, JSON.stringify(storageState, null, 2), 'utf8')
}

function createStorageStateWithAuthCookie(url: URL, token: string, refreshToken: string): StorageState {
  if (!token || !refreshToken) {
    throw new Error('Token and refresh token are required')
  }
  return {
    cookies: [
      {
        name: 'apihub-refresh-token',
        value: refreshToken,
        domain: url.hostname,
        path: '/api/v3/auth/local/refresh',
        expires: COOKIE_EXPIRATION_DATE,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'apihub-access-token',
        value: token,
        domain: url.hostname,
        path: '/',
        expires: COOKIE_EXPIRATION_DATE,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [
      {
        origin: url.origin,
        localStorage: [
          {
            name: 'lastIdentityProviderId',
            value: 'local-idp',
          },
        ],
      },
    ],
  }
}

function createStorageStateWithAuthLocalStorage(url: URL, authData: AuthData): StorageState {
  return {
    cookies: [],
    origins: [
      {
        origin: url.origin,
        localStorage: [
          {
            name: 'authorization',
            value: JSON.stringify(authData),
          },
        ],
      },
    ],
  }
}

async function waitForStorageState(page: Page, maxRetries: number = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const ss = await page.context().storageState()
    if (ss.cookies.length !== 0 && ss.origins.length !== 0) {
      return
    }
    await page.waitForTimeout(WAIT_FOR_STORAGE_STATE_TIMEOUT)
  }
  throw new Error('Storage state not ready after maximum retries')
}
