import type { Page } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { ApiChangesPackageTabTable } from '../../VersionPackagePage/ApiChangesPackageTab/ApiChangesPackageTabTable'
import { ApiChangesDashboardTableRow } from './ApiChangesDashboardTableRow'

export class ApiChangesDashboardTabTable extends ApiChangesPackageTabTable {

  constructor(protected readonly page: Page) {
    super(page)
  }

  getOperationRow(operation?: GetOperationWithMetaParams): ApiChangesDashboardTableRow {
    if (!operation) {
      return new ApiChangesDashboardTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new ApiChangesDashboardTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..'),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new ApiChangesDashboardTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..'),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }
}
