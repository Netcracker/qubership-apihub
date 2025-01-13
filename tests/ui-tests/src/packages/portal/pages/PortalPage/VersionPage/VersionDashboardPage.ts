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
import { BaseVersionPage } from '../BaseVersionPage'
import { OperationsDashboardTab } from './VersionDashboardPage/OperationsDashboardTab'
import { ApiChangesDashboardTab } from './VersionDashboardPage/ApiChangesDashboardTab'
import { DeprecatedDashboardTab } from './VersionDashboardPage/DeprecatedDashboardTab'
import { DocumentsDashboardTab } from './VersionDashboardPage/DocumentsDashboardTab'

export class VersionDashboardPage extends BaseVersionPage {

  readonly operationsTab = new OperationsDashboardTab(this.page)
  readonly apiChangesTab = new ApiChangesDashboardTab(this.page)
  readonly deprecatedTab = new DeprecatedDashboardTab(this.page)
  readonly documentsTab = new DocumentsDashboardTab(this.page)

  constructor(protected readonly page: Page) {
    super(page)
  }
}
