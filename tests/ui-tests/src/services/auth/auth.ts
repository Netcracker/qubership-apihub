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

import type { APIResponse, Page } from '@playwright/test'
import { request } from '@playwright/test'
import type { Credentials } from '@shared/entities'
import type { StorageStateDto } from '@services/storage-state'
import { StorageState } from '@services/storage-state'
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_TIMEOUT } from '@services/rest'
import { readFile } from 'fs/promises'
import { asyncTimeout } from '@services/utils'

export type AuthData = {
  token: string
  renewToken: string
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string
  }
}

async function localAuth(url: string, credentials: Credentials): Promise<APIResponse> {
  const auth = Buffer.from(`${credentials.email}:${credentials.password}`).toString('base64')
  const requestContext = await request.newContext({
    baseURL: url,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Authorization': `Basic ${auth}`,
    },
    timeout: DEFAULT_REQUEST_TIMEOUT,
  })
  return await requestContext.post('/api/v2/auth/local')
}

export async function getAuthDataFromAPI(url: string, credentials: Credentials): Promise<AuthData> {
  let response!: APIResponse
  for (let i = 0; i < DEFAULT_RETRY_COUNT; i++) {
    response = await localAuth(url, credentials)
    const jsonData = await response.json()
    if (response.status() === 200) {
      if (!jsonData.token) {
        continue
      }
      return await response.json()
    }
    await asyncTimeout(DEFAULT_RETRY_TIMEOUT)
  }
  throw new Error(`Getting Auth Data via API for "${credentials.email}" has been failed:\n ${await response.text()}`)
}

export async function getAuthDataFromStorageState(storageStateDto: StorageStateDto): Promise<AuthData> {
  const ss = new StorageState(storageStateDto)
  return ss.getAuthData()
}

export async function getAuthDataFromStorageStateFile(path: string): Promise<AuthData> {
  const contentString = (await readFile(path, 'utf8')).toString()
  const storageStateDto = JSON.parse(contentString)
  return await getAuthDataFromStorageState(storageStateDto)
}

export async function getAuthDataFromPage(page: Page): Promise<AuthData> {
  const storageStateDto = await page.context().storageState()
  return await getAuthDataFromStorageState(storageStateDto)
}
