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
import { Button, Icon, Tab } from '@shared/components/base'
import { BaseRemoveDialog } from '@shared/components/custom'
import { AddPackageDialog } from './ConfigurePackagesSubTab/AddPackageDialog'
import { DashboardPackagesTreeRow } from './ConfigurePackagesSubTab/DashboardPackagesTreeRow'

export class ConfigurePackagesTab extends Tab {

  readonly mainLocator = this.rootLocator.getByTestId('PackagesButton')
  readonly conflictAlertIcon = new Icon(this.mainLocator.getByTestId('ConflictAlert'), 'Conflict Alert', 'tab icon')
  readonly notExistAlertIcon = new Icon(this.mainLocator.getByTestId('NotExistAlert'), 'Not exist Alert', 'tab icon')
  readonly addPackageBtn = new Button(this.rootLocator.getByTestId('AddPackageButton'), 'Add Package')
  readonly addPackageDialog = new AddPackageDialog(this.page)
  readonly removePackageDialog = new BaseRemoveDialog(this.page)

  constructor(page: Page) {
    super(page.locator('body'), 'Packages')
  }

  getPackageRow(pkg?: { name: string }, nth?: number): DashboardPackagesTreeRow {
    if (pkg && nth) {
      return new DashboardPackagesTreeRow(this.rootLocator.getByRole('cell', { name: pkg.name }).locator('..').nth(nth - 1),
        `${nth} (th) ${pkg.name}`)
    }
    if (pkg && !nth) {
      return new DashboardPackagesTreeRow(this.rootLocator.getByRole('cell', { name: pkg.name }).locator('..'), pkg.name)
    }
    if (!pkg && nth) {
      return new DashboardPackagesTreeRow(this.rootLocator.getByTestId('PackagesCell').locator('..').nth(nth - 1), `${nth} (th)`)
    }
    return new DashboardPackagesTreeRow(this.rootLocator.getByTestId('PackagesCell').locator('..'))
  }
}
