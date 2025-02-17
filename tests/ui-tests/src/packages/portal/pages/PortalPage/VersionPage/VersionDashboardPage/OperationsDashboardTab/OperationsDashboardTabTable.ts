import type { Page } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { OperationsDashboardTableRow } from './OperationsDashboardTableRow'
import { OperationsPackageTabTable } from '../../VersionPackagePage/OperationsPackageTab/OperationsPackageTabTable'

export class OperationsDashboardTabTable extends OperationsPackageTabTable {

  constructor(protected readonly page: Page) {
    super(page)
  }

  getOperationRow(operation?: GetOperationWithMetaParams): OperationsDashboardTableRow {
    if (!operation) {
      return new OperationsDashboardTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new OperationsDashboardTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.method} ${operation.path}` })),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new OperationsDashboardTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.type} ${operation.method}` })),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }
}
