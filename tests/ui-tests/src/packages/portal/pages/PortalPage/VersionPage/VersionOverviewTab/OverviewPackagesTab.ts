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
