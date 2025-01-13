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
import { DropdownMenu, ListItem } from '@shared/components/base'

export class AgentDownloadReportMenu extends DropdownMenu {

  readonly downloadReportItm = new ListItem(this.mainLocator.page().getByTestId('Option-download-report'), 'Download Report')
  readonly downloadSourcesItm = new ListItem(this.mainLocator.page().getByTestId('Option-download-sources'), 'Download Sources')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('DownloadMenuButton'), 'Download Report')
  }
}
