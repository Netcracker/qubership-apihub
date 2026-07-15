import type { Page } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { ContractsPackageTabTable } from '../../VersionPackagePage/ContractsPackageTab/ContractsPackageTabTable'
import { ContractsDashboardTableRow } from './ContractsDashboardTableRow'

export class ContractsDashboardTabTable extends ContractsPackageTabTable {
  constructor(protected readonly page: Page) {
    super(page)
  }

  getOperationRow(operation?: GetOperationWithMetaParams): ContractsDashboardTableRow {
    if (!operation) {
      return new ContractsDashboardTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new ContractsDashboardTableRow(
        this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.method} ${operation.path}` })),
        `${operation.method} ${operation.path}`,
      )
    }
    if (operation?.type && operation.method) {
      return new ContractsDashboardTableRow(
        this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.type} ${operation.method}` })),
        `${operation.type} ${operation.method}`,
      )
    }
    throw Error('Operation should have method+path or type+method')
  }
}
