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

import type { PackageApiKey } from '@shared/entities'
import { TEST_USER_1 } from '@test-data'

export const TOKEN_GEN_DEFAULT: PackageApiKey = {
  name: 'Default token',
  roles: ['viewer'],
  createdFor: TEST_USER_1.id,
} as const

export const TOKEN_GEN_DEL: PackageApiKey = {
  ...TOKEN_GEN_DEFAULT,
  name: 'Token for deletion',
} as const
