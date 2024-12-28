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

import type { User } from './user'
import type { Key } from '../entities/keys'

export type Tokens = SystemToken[]

export type SystemTokensDto = Readonly<{
  apiKeys: SystemTokenDto[]
}>

export type SystemToken = {
  apiKey?: Key
  key: Key
  packageKey: Key
  name: string
  createdAt: string
  createdBy: User
  createdFor: User
  roles: string[]
}

export type SystemTokenDto = Readonly<{
  apiKey?: Key
  id: Key
  packageId: Key
  name: string
  createdAt: string
  createdBy: User
  createdFor: User
  roles: string[]
}>

export type DeleteApiKeyData = {
  key: Key
  packageKey: Key
}

export type TokenDataForm = Readonly<{
  name: string
  roles?: string[]
  createdFor: User
}>

export type GenerateApiKeyValue = Readonly<{
  name: string
  roles?: string[]
  createdFor: string
}>

export type GenerateApiKeyData = {
  value: GenerateApiKeyValue
  packageKey?: Key
}

export type DeleteApiKey = (data: DeleteApiKeyData) => void

export type GenerateApiKey = (data: GenerateApiKeyData) => void
