import type { Page } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { DeprecatedPackageTabTable } from '../../VersionPackagePage/DeprecatedPackageTab/DeprecatedPackageTabTable'
import { DeprecatedDashboardTableRow } from './DeprecatedDashboardTableRow'

export class DeprecatedDashboardTabTable extends DeprecatedPackageTabTable {

  constructor(protected readonly page: Page) {
    super(page)
  }

  getOperationRow(operation?: GetOperationWithMetaParams): DeprecatedDashboardTableRow {
    if (!operation) {
      return new DeprecatedDashboardTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new DeprecatedDashboardTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..'),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new DeprecatedDashboardTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..'),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }
}
