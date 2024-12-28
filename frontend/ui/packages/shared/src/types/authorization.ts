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

import type { User, UserDto } from './user'

export type Authorization = Readonly<{
  token: string
  renewToken: string
  user: User
}>

export type AuthorizationDto = Readonly<{
  token: string
  renewToken: string
  user: UserDto
}>

export type TokenPayloadDto = Readonly<{
  Extensions: {
    gitIntegration: string[]
    systemRole?: string[]
  }
  Groups: unknown[]
  ID: string
  Name: string
  exp: number
}>

export type TokenPayload = Readonly<{
  id: string
  name: string
  groups: unknown[]
  extensions: {
    gitIntegration: boolean
    systemAdmin?: boolean
  }
  exp: Date
}>
