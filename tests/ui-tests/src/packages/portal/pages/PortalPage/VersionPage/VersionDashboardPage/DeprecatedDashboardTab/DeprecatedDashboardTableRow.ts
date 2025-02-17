import type { Locator } from '@playwright/test'
import { TableCell } from '@shared/components/base'
import {
  DeprecatedPackageTableRow,
} from '../../VersionPackagePage/DeprecatedPackageTab/DeprecatedPackageTabTable/DeprecatedPackageTableRow'

export class DeprecatedDashboardTableRow extends DeprecatedPackageTableRow {

  readonly packageCell = new TableCell(this.mainLocator.getByTestId('Cell-package'), 'Package')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
