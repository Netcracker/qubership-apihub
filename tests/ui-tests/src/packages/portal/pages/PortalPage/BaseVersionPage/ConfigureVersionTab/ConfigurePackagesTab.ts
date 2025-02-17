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
