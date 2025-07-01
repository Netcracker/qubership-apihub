import type { ComponentParams } from '@shared/components/types'
import { TableCell, TableRow } from '@shared/components/base'
import type { Locator } from '@playwright/test'

export class DeprecatedDescriptionTableRow extends TableRow {

  readonly descriptionCell = new TableCell(this.mainLocator.getByTestId('Cell-description'), 'Description')
  readonly deprecatedSinceCell = new TableCell( this.mainLocator.getByTestId('Cell-deprecated-since'), 'Deprecated Since')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
