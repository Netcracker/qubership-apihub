import type { Page } from '@playwright/test'
import { test as report } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { Link, Placeholder } from '@shared/components/base'
import { OperationsPackageTableRow } from '../OperationsPackageTableRow'

export class OperationsPackageTabTable {

  readonly noOperationsPlaceholder = new Placeholder(this.page.locator('table').locator('..').getByTestId('NoOperationsPlaceholder'), 'No operations')

  constructor(protected readonly page: Page) { }

  getOperationRow(operation?: GetOperationWithMetaParams): OperationsPackageTableRow {
    if (!operation) {
      return new OperationsPackageTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new OperationsPackageTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.method} ${operation.path}` })),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new OperationsPackageTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.type} ${operation.method}` })),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }

  /** @deprecated */
  async openOperation(props: GetOperationWithMetaParams): Promise<void> {
    await report.step(`Open "${props.method} ${props.path}" operation`, async () => {
      const link = new Link(this.getOperationRow(props).mainLocator.getByRole('link'), `${props.method} ${props.path}`)
      await link.click()
    })
  }
}
