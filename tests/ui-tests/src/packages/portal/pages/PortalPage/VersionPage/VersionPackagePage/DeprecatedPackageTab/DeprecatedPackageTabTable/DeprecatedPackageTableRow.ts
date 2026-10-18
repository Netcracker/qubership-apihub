import type { Locator } from '@playwright/test'
import { TableCell } from '@shared/components/base'
import { ExpandableOperationsPackageTableRow } from '../../ExpandableOperationsPackageTableRow'

export class DeprecatedPackageTableRow extends ExpandableOperationsPackageTableRow {

  readonly detailsCell = new TableCell(this.mainLocator.getByTestId('Cell-details'), 'Details')
  readonly deprecatedSinceCell = new TableCell(this.mainLocator.getByTestId('Cell-deprecated-since'), 'Deprecated Since')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
