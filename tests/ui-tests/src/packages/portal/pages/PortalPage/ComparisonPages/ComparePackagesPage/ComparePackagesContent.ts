import type { Page } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { Placeholder } from '@shared/components/base'
import { OperationComparisonRow } from './ComparePackagesContent/OperationComparisonRow'

export class ComparePackagesContent {

  readonly noDiffPh = new Placeholder(this.page.getByTestId('NoDifferencesPlaceholder'), 'No Differences')

  constructor(private readonly page: Page) { }

  getOperationRow(operation?: GetOperationWithMetaParams): OperationComparisonRow {
    if (!operation) {
      return new OperationComparisonRow(this.page.getByTestId('ComparisonRow'))
    }
    if (operation?.method && operation.path) {
      return new OperationComparisonRow(this.page.getByRole('link').filter({ hasText: `${operation.method}${operation.path}` }), `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new OperationComparisonRow(this.page.getByRole('link').filter({ hasText: `${operation.type}${operation.method}` }), `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }
}
