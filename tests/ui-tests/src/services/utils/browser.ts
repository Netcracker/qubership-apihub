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

import type { Browser, Download, Page } from '@playwright/test'
import { type Credentials, type DownloadedTestFile, ROOT_DOWNLOADS } from '@shared/entities'
import { readFile } from 'fs/promises'
import { stringifyError } from './errors'
import path from 'node:path'
import { BASE_ORIGIN, BASE_URL, PLAYGROUND_BACKEND_HOST } from '@test-setup'
import process from 'process'

export const asyncTimeout = async (milliseconds: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, milliseconds))
}

export const newPage = async (browser: Browser, credentials: Credentials): Promise<Page> => {
  const context = await browser.newContext({
    httpCredentials: {
      username: credentials.email,
      password: credentials.password,
    },
    ignoreHTTPSErrors: true,
  })
  return await context.newPage()
}

export const getDownloadedFile = async (download: Download): Promise<DownloadedTestFile> => {
  const file: DownloadedTestFile = {
    fileId: '',
    data: '',
  }
  file.fileId = download.suggestedFilename()
  const filePath = path.join(ROOT_DOWNLOADS, file.fileId)
  try {
    await download.saveAs(path.resolve(filePath))
    file.data = await readFile(path.resolve(filePath), { encoding: 'utf8' })
  } catch (e) {
    throw Error(stringifyError(e))
  }
  return file
}

export const isLocalHost = (): boolean => {
  return BASE_URL.hostname === 'localhost'
}

export const isDevProxyMode = (): boolean => {
  return process.env.DEV_PROXY_MODE === 'true'
}

export const getPlaygroundCustomServer = (): string => {
  if (isLocalHost()) {
    if (!PLAYGROUND_BACKEND_HOST) throw Error(`You run tests on localhost but PLAYGROUND_BACKEND_HOST is ${PLAYGROUND_BACKEND_HOST}`)
    return `${PLAYGROUND_BACKEND_HOST}/api/v1`
  }
  return `${BASE_ORIGIN}/api/v1`
}
