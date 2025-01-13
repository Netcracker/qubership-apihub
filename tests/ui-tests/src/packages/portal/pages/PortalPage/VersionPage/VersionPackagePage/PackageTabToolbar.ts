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
import { Button, Link, SearchBar } from '@shared/components/base'
import { ApiTypeSelect } from '@portal/components'
import { PackageTabExportMenu } from './BasePackageTabToolbar/PackageTabExportMenu'

export class PackageTabToolbar {

  readonly comparedToLnk = new Link(this.page.getByTestId('ComparedToLink'), 'Compared to')
  readonly sltApiType = new ApiTypeSelect(this.page)
  readonly breakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-breaking'), 'Breaking changes filter')
  readonly semiBreakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-semi-breaking'), 'Semi-breaking changes filter')
  readonly deprecatedChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-deprecated'), 'Deprecated changes filter')
  readonly nonBreakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-non-breaking'), 'Non-breaking changes filter')
  readonly annotationChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-annotation'), 'Annotation changes filter')
  readonly unclassifiedChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-unclassified'), 'Unclassified changes filter')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchOperations'), 'Operations')
  readonly filtersBtn = new Button(this.page.getByTestId('FiltersButton'), 'Filters')
  readonly listViewBtn = new Button(this.page.locator('button[value=list]'), 'List View')
  readonly detailedViewBtn = new Button(this.page.locator('button[value=detailed]'), 'Detailed View')
  readonly exportMenu = new PackageTabExportMenu(this.page)

  constructor(protected readonly page: Page) { }
}
