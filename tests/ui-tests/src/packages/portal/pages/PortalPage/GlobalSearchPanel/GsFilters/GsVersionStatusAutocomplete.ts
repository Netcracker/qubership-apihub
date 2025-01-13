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
import { Autocomplete, Chip, ListItem } from '@shared/components/base'

export class GsVersionStatusAutocomplete extends Autocomplete {

  readonly draftItm = new ListItem(this.page.getByTestId('DraftOption'), 'Draft')
  readonly releaseItm = new ListItem(this.page.getByTestId('ReleaseOption'), 'Release')
  readonly archivedItm = new ListItem(this.page.getByTestId('ArchivedOption'), 'Archived')
  readonly chipDraft = new Chip(this.page.getByTestId('DraftChip'), 'Draft')
  readonly chipRelease = new Chip(this.page.getByTestId('ReleaseChip'), 'Release')
  readonly chipArchived = new Chip(this.page.getByTestId('ArchivedChip'), 'Archived')

  constructor(locator: Locator) {
    super(locator.getByTestId('VersionStatusAutocomplete'), 'Version status')
  }
}
