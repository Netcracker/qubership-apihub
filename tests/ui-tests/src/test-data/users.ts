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

export const INVALID_LOGIN = 'APIHUB99'

export const INVALID_PASSWORD = '1'

export const TEST_SYSADMIN_LOCAL = {
  id: 'x_atui_sysadminatqa-at',
  email: 'x_atui_sysadmin@qa.at',
  name: 'x_ATUI_Sysadmin',
  password: process.env.TEST_USER_PASSWORD as string,
} as const

export const SYSADMIN = TEST_SYSADMIN_LOCAL

export const TEST_USER_1 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user1atqa-at',
  email: 'x_atui_user1@qa.at',
  name: 'x_ATUI_User1',
} as const

export const TEST_USER_2 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user2atqa-at',
  email: 'x_atui_user2@qa.at',
  name: 'x_ATUI_User2',
} as const

export const TEST_USER_3 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user3atqa-at',
  email: 'x_atui_user3@qa.at',
  name: 'x_ATUI_User3',
} as const

export const TEST_USER_4 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user4atqa-at',
  email: 'x_atui_user4@qa.at',
  name: 'x_ATUI_User4',
} as const
