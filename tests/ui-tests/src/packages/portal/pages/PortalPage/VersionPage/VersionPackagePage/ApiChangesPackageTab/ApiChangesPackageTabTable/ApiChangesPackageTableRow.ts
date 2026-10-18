import { TableCell } from '@shared/components/base'
import { ChangesTableCell } from '@shared/components/custom'
import { ExpandableOperationsPackageTableRow } from '../../ExpandableOperationsPackageTableRow'
import type { Locator } from '@playwright/test'

export class ApiChangesPackageTableRow extends ExpandableOperationsPackageTableRow {

  readonly endpointCell = new TableCell(this.mainLocator.getByTestId('Cell-endpoint-column'), 'Endpoint')
  readonly tagsCell = new TableCell(this.mainLocator.getByTestId('Cell-tags-column'), 'Tags')
  readonly changesCell = new ChangesTableCell(this.mainLocator.getByTestId('Cell-changes-column'))
  readonly kindCell = new TableCell(this.mainLocator.getByTestId('Cell-api-kind-column'), 'Kind')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'operation row')
  }
}
