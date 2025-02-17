import type { Locator } from '@playwright/test'
import { TableCell } from '@shared/components/base'
import { OperationsPackageTableRow } from '../../VersionPackagePage/OperationsPackageTableRow'

export class OperationsDashboardTableRow extends OperationsPackageTableRow {

  readonly packageCell = new TableCell(this.mainLocator.getByTestId('Cell-package-column'), 'Package')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
