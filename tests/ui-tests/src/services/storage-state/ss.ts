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

import type { CookieItem, LocalStorageItem, PreviewState, StorageStateDto } from './ss.entities'
import type { AuthData } from '@services/auth'
import { writeFile } from 'fs/promises'

export class StorageState {

  private cookies: Array<CookieItem>
  private origin: string
  private authorization: LocalStorageItem
  private previewState: LocalStorageItem

  constructor(storage: StorageStateDto = {
    cookies: [],
    origins: [
      {
        origin: '',
        localStorage: [],
      },
    ],
  }) {
    this.cookies = storage.cookies
    this.origin = storage.origins[0].origin || ''
    this.authorization = storage.origins[0].localStorage.find(el => el.name === 'authorization') || {
      name: '',
      value: '',
    }
    this.previewState = storage.origins[0].localStorage.find(el => el.name === 'preview-state') || {
      name: '',
      value: '',
    }
  }

  setOrigin(url: string): void {
    this.origin = url
  }

  setAuthData(auth: AuthData): void {
    this.authorization = {
      name: 'authorization',
      value: JSON.stringify(auth),
    }
  }

  setPreviewState(previewState: PreviewState): void {
    this.previewState = {
      name: 'page-settings',
      value: JSON.stringify(previewState),
    }
  }

  getOrigin(): string {
    return this.origin
  }

  getAuthData(): AuthData {
    if (this.authorization === undefined) {
      throw Error('Authorization data is undefined')
    }
    return JSON.parse(this.authorization.value)
  }

  async saveToFile(path: string): Promise<void> {
    const data = {
      cookies: this.cookies,
      origins: [
        {
          origin: this.origin,
          localStorage: [
            this.authorization,
            this.previewState,
          ],
        },
      ],
    }
    await writeFile(path, JSON.stringify(data, null, 2), 'utf8')
  }
}
