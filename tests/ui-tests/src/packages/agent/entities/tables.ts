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

import type { Locator } from '@playwright/test'
import type { Changes } from '@shared/entities'

export interface iAgentTableBwcStatusCell {
  getBwcStatusCell(serviceName: string, options?: { exact: boolean }): Locator
  getBwcStatusIcon(serviceName: string, options?: { exact: boolean }): Locator
}

export interface iAgentTablePublishStatusCell {
  getPublishStatusCell(serviceName: string, options?: { exact: boolean }): Locator
  getPublishStatusIcon(serviceName: string, options?: { exact: boolean }): Locator
}

export interface iAgentTableChangesCell {
  getChangesCell(serviceName: string, options?: { exact: boolean }): Locator
  getChangesTypography(serviceName: string, changesType: Changes, options?: { exact: boolean }): Locator
}
