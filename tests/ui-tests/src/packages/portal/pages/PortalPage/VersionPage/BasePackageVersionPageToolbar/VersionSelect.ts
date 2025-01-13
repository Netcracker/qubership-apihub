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
import { BaseComponent, Button, SearchBar } from '@shared/components/base'
import { VersionSelectTableRow } from './VersionSelect/VersionSelectTableRow'

export class VersionSelect extends BaseComponent {
  private content = this.page.getByRole('menu')
  readonly releaseBtn = new Button(this.content.getByTestId('ReleaseButton'), 'Release')
  readonly draftBtn = new Button(this.content.getByTestId('DraftButton'), 'Draft')
  readonly archivedBtn = new Button(this.content.getByTestId('ArchivedButton'), 'Archived')
  readonly searchbar = new SearchBar(this.content.getByTestId('VersionSearchBar'), 'Version')
  readonly createVersionBtn = new Button(this.content.getByTestId('CreateVersionButton'), 'Create version')

  constructor(private readonly page: Page) {
    super(page.getByTestId('VersionSelector'), 'Version', 'select')
  }

  getVersionRow(version?: string): VersionSelectTableRow {
    if (version) {
      return new VersionSelectTableRow(this.content.getByRole('cell', { name: version, exact: true }).locator('..'), version)
    } else {
      return new VersionSelectTableRow(this.content.locator('tbody').locator('tr'))
    }
  }
}
