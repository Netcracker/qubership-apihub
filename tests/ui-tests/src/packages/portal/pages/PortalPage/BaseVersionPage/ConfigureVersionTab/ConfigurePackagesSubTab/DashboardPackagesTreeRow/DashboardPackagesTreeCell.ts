import type { Locator } from '@playwright/test'
import { Icon, TableCell } from '@shared/components/base'

export class DashboardPackagesTreeCell extends TableCell {

  readonly conflictAlertIcon = new Icon(this.mainLocator.getByTestId('ConflictAlert'), 'Conflict Alert', 'package icon')
  readonly notExistAlertIcon = new Icon(this.mainLocator.getByTestId('NotExistAlert'), 'Not exist Alert', 'package icon')
  readonly conflictIndicatorIcon = new Icon(this.mainLocator.getByTestId('ConflictIndicator'), 'Conflict Indicator', 'package icon')
  readonly notExistIndicatorIcon = new Icon(this.mainLocator.getByTestId('NotExistIndicator'), 'Not exist Indicator', 'package icon')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
