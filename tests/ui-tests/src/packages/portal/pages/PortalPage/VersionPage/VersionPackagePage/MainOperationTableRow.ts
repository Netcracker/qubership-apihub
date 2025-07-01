import type { Locator } from '@playwright/test'
import { Link, TableCell, TableRow } from '@shared/components/base'

export class MainOperationTableRow extends TableRow {

  readonly endpointCell = new TableCell(this.mainLocator.getByTestId('Cell-endpoint-column'), 'Endpoint')
  readonly kindCell = new TableCell(this.mainLocator.getByTestId('Cell-api-kind-column'), 'Kind')
  readonly operationLink = new Link(this.mainLocator.getByRole('link'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
