import type { Locator } from '@playwright/test'
import { TableCell } from '@shared/components/base'
import { MainOperationTableRow } from './MainOperationTableRow'

export class OperationsPackageTableRow extends MainOperationTableRow {

  readonly tagsCell = new TableCell(this.mainLocator.getByTestId('Cell-tags-column'), 'Tags')

  readonly metadataCell = new TableCell(this.mainLocator.getByTestId('Cell-custom-metadata'), 'Custom Metadata')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
