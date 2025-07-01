import type { GetOperationWithMetaParams } from '@portal/entities'
import { type Page } from '@playwright/test'
import { Placeholder } from '@shared/components/base'
import { ApiChangesPackageTableRow } from './ApiChangesPackageTabTable/ApiChangesPackageTableRow'
import { ChangesDescriptionCell } from './ApiChangesPackageTabTable/ChangesDescriptionCell'

export class ApiChangesPackageTabTable {

  readonly noChangesPlaceholder = new Placeholder(this.page.getByTestId('NoChangesPlaceholder'), 'No changes')
  readonly noSearchResultsPlaceholder = new Placeholder(this.page.getByTestId('NoSearchResultsPlaceholder'), 'No search results')

  constructor(protected readonly page: Page) { }

  getOperationRow(operation?: GetOperationWithMetaParams): ApiChangesPackageTableRow {
    if (!operation) {
      return new ApiChangesPackageTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new ApiChangesPackageTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..'),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new ApiChangesPackageTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..'),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }

  getChangeDescriptionCell(description?: string): ChangesDescriptionCell {
    if (description) {
      return new ChangesDescriptionCell(this.page.getByRole('cell', { name: description }).locator('..'), description)
    } else {
      return new ChangesDescriptionCell(this.page.getByTestId('ChangeDescriptionCell'))
    }
  }
}
