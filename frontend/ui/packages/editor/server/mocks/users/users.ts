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

import type { Key, Url, Writeable } from '../../types'

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

export const USERS_LIST: Writeable<UsersDto> = {
  users: [{
    id: 'user001',
    email: 'john.williams@example.com',
    name: 'John Williams',
    avatarUrl: 'https://github.com/uploads/001/avatar.png',
  }, {
    id: 'user002',
    email: 'robert.johnson@example.com',
    name: 'Robert Johnson',
    avatarUrl: 'https://github.com/uploads/002/avatar.png',
  }, {
    id: 'user003',
    email: 'user.003@example.com',
    name: 'User 003',
    avatarUrl: 'https://github.com/uploads/003/avatar.png',
  }, {
    id: 'user004',
    email: 'user.004@example.com',
    name: 'Alexander Aleksandrov',
    avatarUrl: 'https://github.com/uploads/004/avatar.png',
  }, {
    id: 'user005',
    email: 'user.005@example.com',
    name: 'Petr Petrov',
    avatarUrl: 'https://github.com/uploads/005/avatar.png',
  }, {
    id: 'user006',
    email: 'user.006@example.com',
    name: 'User 006',
    avatarUrl: 'https://github.com/uploads/006/avatar.png',
  }, {
    id: 'user007',
    email: 'user.007@example.com',
    name: 'User 007',
    avatarUrl: 'https://github.com/uploads/007/avatar.png',
  }, {
    id: 'user008',
    email: 'user.008@example.com',
    name: 'User 008',
    avatarUrl: 'https://github.com/uploads/008/avatar.png',
  }, {
    id: 'user009',
    email: 'user.009@example.com',
    name: 'User 009',
    avatarUrl: 'https://github.com/uploads/009/avatar.png',
  }, {
    id: 'user010',
    email: 'ivan.ivanov@example.com',
    name: 'Ivan Ivanov',
    avatarUrl: 'https://github.com/uploads/010/avatar.png',
  }],
}
