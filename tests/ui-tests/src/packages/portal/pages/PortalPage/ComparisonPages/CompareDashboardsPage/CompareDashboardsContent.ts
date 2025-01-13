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
import { PackageComparisonRow } from './CompareDashboardsContent/PackageComparisonRow'
import { Placeholder } from '@shared/components/base'

export class CompareDashboardsContent {

  readonly noDiffPh = new Placeholder(this.page.getByTestId('NoDifferencesPlaceholder'), 'No Differences')

  constructor(private readonly page: Page) { }

  getPackageRow(pkg?: { name: string }): PackageComparisonRow {
    if (pkg) {
      return new PackageComparisonRow(this.page.getByRole('link').filter({ hasText: pkg.name }), pkg.name)
    }
    return new PackageComparisonRow(this.page.getByTestId('ComparisonRow'))
  }
}
