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
import { ConfigurePackagesTab } from '../../BaseVersionPage/ConfigureVersionTab/ConfigurePackagesTab'
import {
  DashboardPackagesTreeRow,
} from '../../BaseVersionPage/ConfigureVersionTab/ConfigurePackagesSubTab/DashboardPackagesTreeRow'

export class OverviewPackagesTab extends ConfigurePackagesTab {

  constructor(page: Page) {
    super(page)
  }

  getIncludedPackageRow(pkg?: { name: string }, nth?: number): DashboardPackagesTreeRow {
    return pkg
      ? nth
        ? new DashboardPackagesTreeRow(this.rootLocator.getByRole('cell', { name: pkg.name }).locator('..').filter({ hasNot: this.page.getByTestId('ExcludedPackage') }).nth(nth - 1),
          `${nth} (th) ${pkg.name}`)
        : new DashboardPackagesTreeRow(this.rootLocator.getByRole('cell', { name: pkg.name }).locator('..').filter({ hasNot: this.page.getByTestId('ExcludedPackage') }),
          pkg.name)
      : nth
        ? new DashboardPackagesTreeRow(this.rootLocator.getByTestId('PackagesCell').locator('..').filter({ hasNot: this.page.getByTestId('ExcludedPackage') }).nth(nth - 1),
          `${nth} (th)`)
        : new DashboardPackagesTreeRow(this.rootLocator.getByTestId('PackagesCell').locator('..').filter({ hasNot: this.page.getByTestId('ExcludedPackage') }))
  }

  getExcludedPackageRow(pkg?: { name: string }, nth?: number): DashboardPackagesTreeRow {
    return pkg
      ? nth
        ? new DashboardPackagesTreeRow(this.rootLocator.getByRole('cell', { name: pkg.name }).locator('..').filter({ has: this.page.getByTestId('ExcludedPackage') }).nth(nth - 1),
          `${nth} (th) ${pkg.name}`)
        : new DashboardPackagesTreeRow(this.rootLocator.getByRole('cell', { name: pkg.name }).locator('..').filter({ has: this.page.getByTestId('ExcludedPackage') }),
          pkg.name)
      : nth
        ? new DashboardPackagesTreeRow(this.rootLocator.getByTestId('PackagesCell').locator('..').filter({ has: this.page.getByTestId('ExcludedPackage') }).nth(nth - 1),
          `${nth} (th)`)
        : new DashboardPackagesTreeRow(this.rootLocator.getByTestId('PackagesCell').locator('..').filter({ has: this.page.getByTestId('ExcludedPackage') }))
  }
}
