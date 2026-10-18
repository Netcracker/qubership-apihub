import type { Page } from '@playwright/test'
import { getStorageStatePath, type StorageState } from '@services/storage-state/entities'
import { readFile } from 'fs/promises'
import type { AuthData } from '@services/auth'
import { stringifyError } from '@services/utils'

export const getTokenFromPageCookie = async (page: Page): Promise<string> => {
  const storageState = await getStorageStateFromPage(page)
  return getTokenFromCookie(storageState)
}

export const getTokenFromPageLocalStorage = async (page: Page): Promise<string> => {
  const storageState = await getStorageStateFromPage(page)
  return getTokenFromLocalStorage(storageState)
}

/** @deprecated */
export const getTokenFromUserFile = async (login: string): Promise<string> => {
  const path = getStorageStatePath(login)
  return await getTokenFromFile(path)
}

async function getStorageStateFromPage(page: Page): Promise<StorageState> {
  return await page.context().storageState()
}

async function getStorageStateFromFile(path: string): Promise<StorageState> {
  return JSON.parse(await readFile(path, 'utf8')) as StorageState
}

function getTokenFromCookie(storageState: StorageState): string {
  const cookie = storageState.cookies.find(el => el.name === 'apihub-access-token')
  if (cookie === undefined) {
    throw new Error('Token is undefined')
  }
  return cookie.value
}

function getTokenFromLocalStorage(storageState: StorageState): string {
  const authorization = storageState.origins[0].localStorage.find(el => el.name === 'authorization')
  if (authorization === undefined) {
    throw new Error('Authorization data is undefined')
  }
  const authData = JSON.parse(authorization.value) as AuthData
  return authData.token
}

async function getTokenFromFile(path: string): Promise<string> {
  const storageState = await getStorageStateFromFile(path)
  try {
    return getTokenFromCookie(storageState)
  } catch (cookieError: unknown) {
    try {
      return getTokenFromLocalStorage(storageState)
    } catch (localStorageError: unknown) {
      throw new Error(`Failed to get token from file.\nCookie token error:\n${stringifyError(cookieError)}\nLocalStorage token error:\n${stringifyError(localStorageError)}`)
    }
  }
}
