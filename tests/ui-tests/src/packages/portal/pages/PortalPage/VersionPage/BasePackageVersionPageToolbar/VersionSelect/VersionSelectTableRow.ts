import type { Locator } from '@playwright/test'
import { TableCell, TableRow } from '@shared/components/base'

export class VersionSelectTableRow extends TableRow {

  readonly versionCell = new TableCell(this.mainLocator.getByTestId('Cell-version'), 'Version')
  readonly publicationDateCell = new TableCell(this.mainLocator.getByTestId('Cell-publication-date'), 'Publication Date')
  readonly labelsCell = new TableCell(this.mainLocator.getByTestId('Cell-labels'), 'Labels')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
