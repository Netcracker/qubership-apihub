import type { Locator } from '@playwright/test'
import { Indicator, TableCell } from '@shared/components/base'

export class ChangesDescriptionCell extends TableCell {

  readonly changeSeverityIndicator = new Indicator(this.mainLocator.getByTestId('ChangeSeverityIndicator'), 'Changes description')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
