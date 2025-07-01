import type { Locator } from '@playwright/test'
import { TableCell } from '@shared/components/base'
import {
  ApiChangesPackageTableRow,
} from '../../VersionPackagePage/ApiChangesPackageTab/ApiChangesPackageTabTable/ApiChangesPackageTableRow'

export class ApiChangesDashboardTableRow extends ApiChangesPackageTableRow {

  readonly packageCell = new TableCell(this.mainLocator.getByTestId('Cell-package'), 'Package')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
