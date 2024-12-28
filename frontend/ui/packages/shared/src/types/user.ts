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

import type { Url } from './url'
import type { Key } from '../entities/keys'

export type Users = Readonly<{
  users: User[]
}>

export type UsersDto = Readonly<{
  users: UserDto[]
}>

export type User = Readonly<{
  key: Key
  name: string
  email?: string
  avatarUrl: Url
}>

export type UserDto = Readonly<{
  id: Key
  name: string
  email?: string
  avatarUrl: Url
}>

// TODO: Think about new place for this converter
export function toUser(value: UserDto): User {
  return {
    key: value.id,
    name: value?.name,
    email: value?.email,
    avatarUrl: value?.avatarUrl,
  }
}

export function toUsers(value: UsersDto): Users {
  return { users: value?.users.map(user => toUser(user)) }
}
