import type { GetOperationWithMetaParams } from '@portal/entities'
import { type Page, test as report } from '@playwright/test'
import { Link, Placeholder } from '@shared/components/base'
import { DeprecatedPackageTableRow } from './DeprecatedPackageTabTable/DeprecatedPackageTableRow'
import { DeprecatedDescriptionTableRow } from './DeprecatedPackageTabTable/DeprecatedDescriptionTableRow'

export class DeprecatedPackageTabTable {

  readonly noOperationsPlaceholder = new Placeholder(this.page.locator('table').locator('..').getByTestId('NoOperationsPlaceholder'),
    'No operations')

  constructor(protected readonly page: Page) { }

  getOperationRow(operation?: GetOperationWithMetaParams): DeprecatedPackageTableRow {
    if (!operation) {
      return new DeprecatedPackageTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new DeprecatedPackageTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.method} ${operation.path}` })),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new DeprecatedPackageTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.type} ${operation.method}` })),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }

  getDeprecatedDescriptionRow(description?: string): DeprecatedDescriptionTableRow {
    if (description) {
      return new DeprecatedDescriptionTableRow(this.page.getByRole('cell', { name: description }).locator('..'), description)
    } else {
      return new DeprecatedDescriptionTableRow(this.page.getByTestId('Cell-description'))
    }
  }

  async openOperation(props: GetOperationWithMetaParams): Promise<void> {
    await report.step(`Open "${props.method} ${props.path}" operation`, async () => {
      const link = new Link(this.getOperationRow(props).mainLocator.getByRole('link'), `${props.method} ${props.path}`)
      await link.click()
    })
  }
}
