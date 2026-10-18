import type { Locator } from '@playwright/test'
import { OperationsPackageTableRow } from './OperationsPackageTableRow'
import { Button } from '@shared/components/base'

export abstract class ExpandableOperationsPackageTableRow extends OperationsPackageTableRow {

  readonly expandBtn = new Button(this.rootLocator.getByTestId('KeyboardArrowRightOutlinedIcon'), 'Expand')
  readonly collapseBtn = new Button(this.rootLocator.getByTestId('KeyboardArrowDownOutlinedIcon'), 'Collapse')

  protected constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
