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

import type { Page } from '@playwright/test'
import { BasePackageTabWithOperations } from './BasePackageTabWithOperations'
import { OperationsPackageTabTable } from './OperationsPackageTab/OperationsPackageTabTable'
import { Content } from '@shared/components/base'

export class OperationsPackageTab extends BasePackageTabWithOperations {

  readonly mainLocator = this.page.getByTestId('OperationsButton')
  readonly content = new Content(this.rootLocator, 'Operations Tab')
  readonly table = new OperationsPackageTabTable(this.page)

  constructor(page: Page) {
    super(page.getByTestId('OperationsTab'), 'Operations')
  }
}
