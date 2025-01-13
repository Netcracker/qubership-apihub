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
import { Content, Tab } from '@shared/components/base'
import { OverviewSummaryTab } from './VersionOverviewTab/OverviewSummaryTab'
import { OverviewRevisionsTab } from './VersionOverviewTab/OverviewRevisionsTab'
import { OverviewPackagesTab } from './VersionOverviewTab/OverviewPackagesTab'
import { OverviewGroupsTab } from './VersionOverviewTab/OverviewGroupsTab'
import { OverviewActivityHistoryTab } from './VersionOverviewTab/OverviewActivityHistoryTab'

export class VersionOverviewTab extends Tab {

  readonly mainLocator = this.page.getByTestId('OverviewButton')
  readonly content = new Content(this.rootLocator, 'Overview Tab')
  readonly summaryTab = new OverviewSummaryTab(this.rootLocator)
  readonly activityHistoryTab = new OverviewActivityHistoryTab(this.rootLocator)
  readonly revisionsTab = new OverviewRevisionsTab(this.rootLocator)
  readonly groupsTab = new OverviewGroupsTab(this.rootLocator)
  readonly packagesTab = new OverviewPackagesTab(this.page)

  constructor(page: Page) {
    super(page.getByTestId('OverviewTab'), 'Overview')
  }
}
